/* Sim-Pengadaan — api.js v2: penghubung ke backend Google Apps Script (REST) + lapisan kecepatan.
 *
 * Prinsip (gas-instant-ux):
 *  1) BACAAN memakai cache "stale-while-revalidate": data lama tampil SEKETIKA, lalu diperbarui diam-diam di latar
 *     belakang; bila isinya berubah halaman disegarkan otomatis (apiOnChange). Permintaan kembar digabung.
 *  2) TULISAN meminta server mengirim data terbaru bersama hasilnya ("refresh"), jadi halaman tidak perlu memuat ulang.
 *  3) PREFETCH: setelah login, semua data menu dimuat dalam SATU permintaan batch sehingga pindah menu terasa instan.
 *  4) Optimistic UI: cachePatch() mengubah data lokal seketika (dipakai app.js), server menyusul di belakang.
 * Semua aksi memakai POST text/plain (WAJIB: JSON akan memicu CORS preflight yang diblokir GAS).
 * Cache hanya di memori + sessionStorage (hilang saat tab ditutup) dan dibersihkan saat logout. */
const API_TIMEOUT_MS = 90000;
const FRESH_MS = 15000; // data lebih muda dari ini dipakai tanpa menghubungi server
const READS = new Set(['getBoot', 'listPR', 'listPO', 'listGRN', 'getStock', 'getKeuangan', 'listInvoices', 'getChartData', 'getNotif', 'getAcuanHarga', 'listUsers', 'listMaster', 'listQuotes', 'getReport', 'listLampiran', 'listArsip', 'listArsipkan', 'detailArsip']);
const PLAIN = new Set(['login', 'logout']);
// Setelah aksi tulis, bacaan mana yang langsung dikirim server (a = argumen aksi tulis; a[0] = token)
const REFRESH = {
  savePR: a => [['listPR', a[0]], ['getBoot', a[0]], ['getNotif', a[0]]],
  actPR: a => [['listPR', a[0]], ['getBoot', a[0]], ['getNotif', a[0]]],
  revisiPR: a => [['listPR', a[0]], ['getBoot', a[0]], ['getNotif', a[0]]],
  createPO: a => [['listPO', a[0]], ['listPR', a[0]], ['getNotif', a[0]]],
  actPO: a => [['listPO', a[0]], ['listPR', a[0]], ['getNotif', a[0]]],
  revisiPO: a => [['listPO', a[0]], ['listPR', a[0]], ['getNotif', a[0]]],
  saveQuote: a => [['listQuotes', a[0], a[1] && a[1].PRID]],
  saveGRN: a => [['listGRN', a[0]], ['listPO', a[0]], ['getStock', a[0]], ['getNotif', a[0]]],
  saveKeluar: a => [['getStock', a[0]]],
  saveInvoice: a => [['listPO', a[0]], ['listInvoices', a[0]], ['getKeuangan', a[0]], ['getNotif', a[0]]],
  savePayment: a => [['listInvoices', a[0]], ['getKeuangan', a[0]], ['getNotif', a[0]]],
  saveBudget: a => [['getKeuangan', a[0]]],
  saveMaster: a => [['listMaster', a[0], a[1]]],
  saveUser: a => [['listUsers', a[0]]],
  uploadLampiran: a => [['listLampiran', a[0], a[1], a[2]]],
  imporMaster: a => [['listMaster', a[0], a[1]]],
  imporDokumen: a => [['listPR', a[0]], ['listPO', a[0]]],
  imporUbahNomor: a => [['listPR', a[0]], ['listPO', a[0]]],
  arsipkanData: a => [['listArsip', a[0]], ['listArsipkan', a[0], a[1]]],
  pulihkanArsip: a => [['listArsip', a[0]]],
  hapusPermanenArsip: a => [['listArsip', a[0]]]
};
const AC = { m: new Map(), inflight: new Map(), keys: new Set(), user: '', timer: null }; // m: kunci -> {t: waktu, s: JSON}
let apiOnChange = null;  // diisi app.js: dipanggil bila data yang sedang tampil berubah di server
let apiOnExpired = null; // diisi app.js: dipanggil bila pembaruan latar belakang ditolak karena sesi habis (agar kembali ke login)

// ── transport ──
async function post(body) {
  if (!GAS_URL || /GANTI/i.test(GAS_URL)) throw new Error('URL backend belum diisi. Buka js/config.js dan isi GAS_URL dengan URL /exec dari Apps Script.');
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), API_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctl.signal });
  } catch (e) {
    throw new Error(e && e.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
  } finally { clearTimeout(timer); }
  try { return JSON.parse(await res.text()); }
  catch (e) { throw new Error('Respons server tidak valid. Pastikan backend sudah di-deploy ulang (Deploy > Manage deployments > New version) dan akses Web App = Anyone.'); }
}
const okEnv = r => { if (!r || !r.success) throw new Error(r && r.message ? r.message : 'Tidak ada respons dari server'); return r; };

// ── cache ──
const ckey = (fn, args) => fn + '|' + JSON.stringify(args.slice(1)); // args[0] = token, tidak ikut kunci
const SKEY = 'sp_c2:';
function persist() {
  if (!AC.user) return; clearTimeout(AC.timer);
  AC.timer = setTimeout(() => { try { const a = []; AC.m.forEach((v, k) => { if (v.s.length < 400000) a.push([k, v]); }); sessionStorage.setItem(SKEY + AC.user, JSON.stringify(a)); } catch (e) {} }, 600);
}
function cacheSet(k, data) { const s = JSON.stringify(data === undefined ? null : data); AC.m.set(k, { t: Date.now(), s }); persist(); return s; }
function cacheUser(u) { // dipanggil saat login: muat cache sesi tab ini (ditandai basi agar diperbarui di latar belakang)
  AC.user = u.email + '|' + u.role; AC.m.clear();
  try { const raw = sessionStorage.getItem(SKEY + AC.user); if (raw) JSON.parse(raw).forEach(([k, v]) => AC.m.set(k, { t: 0, s: v.s })); } catch (e) {}
}
function cacheClear() { // logout / sesi berakhir: hapus semua data dari memori dan sessionStorage
  AC.m.clear(); AC.inflight.clear(); AC.keys.clear(); AC.user = ''; clearTimeout(AC.timer);
  try { Object.keys(sessionStorage).filter(k => k.indexOf(SKEY) === 0).forEach(k => sessionStorage.removeItem(k)); } catch (e) {}
}
function invalidateAll() { AC.m.forEach(v => v.t = 0); persist(); } // tetap dipakai (instan) lalu diperbarui di latar belakang
function cacheDrop(fn) { [...AC.m.keys()].forEach(k => { if (k.indexOf(fn + '|') === 0) AC.m.delete(k); }); persist(); }
function cachePatch(fn, mutate) { // ubah data lokal seketika (optimistic UI); mutate(data) mengembalikan data baru, atau undefined bila diubah di tempat
  let n = 0;
  AC.m.forEach((v, k) => { if (k.indexOf(fn + '|') !== 0) return; let d = JSON.parse(v.s); const r = mutate(d); if (r !== undefined) d = r; v.s = JSON.stringify(d); n++; });
  persist(); return n;
}
function apiPageStart() { AC.keys.clear(); }                                      // pindah halaman: catat bacaan yang dipakai halaman ini
function apiDropPageKeys() { AC.keys.forEach(k => AC.m.delete(k)); persist(); }  // tombol "Muat ulang": paksa ambil dari server

// ── bacaan: stale-while-revalidate ──
function fetchRead(fn, args, k) {
  let p = AC.inflight.get(k);
  if (!p) { p = post({ action: fn, args }).then(r => cacheSet(k, okEnv(r).data)).finally(() => AC.inflight.delete(k)); AC.inflight.set(k, p); }
  return p.then(s => JSON.parse(s));
}
function revalidate(fn, args, k) {
  if (AC.inflight.has(k)) return;
  const old = AC.m.get(k) && AC.m.get(k).s;
  fetchRead(fn, args, k).then(() => { const n = AC.m.get(k); if (n && n.s !== old && AC.keys.has(k) && typeof apiOnChange === 'function') apiOnChange(k); }).catch(e => { if (/Sesi berakhir/.test(e && e.message) && typeof apiOnExpired === 'function') apiOnExpired(); });
}
async function readSWR(fn, args) {
  const k = ckey(fn, args); AC.keys.add(k);
  const hit = AC.m.get(k);
  if (hit) { if (Date.now() - hit.t > FRESH_MS) revalidate(fn, args, k); return JSON.parse(hit.s); } // tampil seketika
  return fetchRead(fn, args, k);
}

// ── tulis: server mengirim data terbaru bersama hasil (tanpa round trip tambahan) ──
async function writeCall(fn, args) {
  const calls = (REFRESH[fn] ? REFRESH[fn](args) : []).map(a => ({ action: a[0], args: a.slice(1) }));
  let r;
  try { r = await post({ action: fn, args, refresh: calls }); } catch (e) { invalidateAll(); throw e; }
  invalidateAll();
  if (r && Array.isArray(r.fresh)) r.fresh.forEach((f, i) => { if (f && f.success && calls[i]) cacheSet(ckey(calls[i].action, calls[i].args), f.data); });
  return okEnv(r).data;
}
async function plainCall(fn, args) {
  if (fn === 'logout') cacheClear();
  const r = okEnv(await post({ action: fn, args }));
  if (fn === 'login') cacheUser(r.data.user);
  return r.data;
}

// ── prefetch: banyak bacaan dalam SATU permintaan (list = [[fn, token, ...arg], ...]) ──
async function apiPrefetch(list) {
  const todo = list.filter(a => { const k = ckey(a[0], a.slice(1)); return !AC.m.has(k) && !AC.inflight.has(k); });
  if (!todo.length) return 0;
  const r = await post({ action: 'batch', calls: todo.map(a => ({ action: a[0], args: a.slice(1) })) });
  if (!r || !r.success || !Array.isArray(r.data)) return 0;
  let n = 0; r.data.forEach((x, i) => { if (x && x.success) { cacheSet(ckey(todo[i][0], todo[i].slice(1)), x.data); n++; } });
  return n;
}

function api(fn, ...args) {
  if (READS.has(fn)) return readSWR(fn, args);
  if (PLAIN.has(fn)) return plainCall(fn, args);
  return writeCall(fn, args);
}
