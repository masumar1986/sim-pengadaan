/* Sim-Pengadaan — logika aplikasi (SPA). Pemanggilan backend lewat api() di js/api.js */
const S = { token: null, user: null, pr: [], items: null, mt: 'Items', page: 'dashboard', chart: null };
const DISIPLIN = ['Sipil', 'Elektrikal', 'Mekanikal', 'Instrumentasi', 'Piping', 'Painting', 'Inventaris', 'Teknisi', 'Lainnya'];
const KATEGORI = ['Material Utama', 'Material Pembantu', 'Alat Bantu', 'Material Pelengkap', 'Tools & Equipment'];
const CHAIN = ['Manajer Operasional', 'Site Engineer', 'Cost Control', 'Manajer Proyek'];
const ROLES = ['Staf Lapangan', 'Manajer Operasional', 'Site Engineer', 'Cost Control', 'Manajer Proyek', 'Staf Pengadaan', 'Staf Gudang', 'Site Accounting', 'Admin'];
const MASTER_ROLES = ['Site Engineer', 'Cost Control', 'Manajer Proyek', 'Staf Pengadaan', 'Admin'];
const BD = { Draft: 'bd-n', Diajukan: 'bd-w', Disetujui: 'bd-ok', Ditolak: 'bd-er', Diproses: 'bd-w', Diterima: 'bd-ok', Arsip: 'bd-n' };
const NAV = [
  { id: 'dashboard', t: 'Dashboard', i: 'grid-1x2' }, { id: 'pr', t: 'Permintaan (PR)', i: 'file-earmark-text' },
  { id: 'banding', t: 'Perbandingan Harga', i: 'columns-gap' }, { id: 'po', t: 'Pesanan (PO)', i: 'cart' }, { id: 'grn', t: 'Penerimaan (GRN)', i: 'box-seam' },
  { id: 'gudang', t: 'Gudang', i: 'building' }, { id: 'keuangan', t: 'Keuangan', i: 'cash-stack' },
  { id: 'laporan', t: 'Laporan', i: 'bar-chart' }, { id: 'master', t: 'Data Induk', i: 'collection' }, { id: 'impor', t: 'Impor Excel', i: 'file-earmark-arrow-up', imp: 1 }, { id: 'arsip', t: 'Arsip', i: 'archive', imp: 1 },
  { id: 'pengaturan', t: 'Pengaturan', i: 'gear', admin: 1 }
];
const MF = {
  Items: { t: 'Barang / Jasa', f: [['Nama', 'Nama barang/jasa'], ['Spesifikasi', 'Spesifikasi'], ['Disiplin', 'Disiplin', DISIPLIN], ['Kategori', 'Kategori', KATEGORI], ['Satuan', 'Satuan']] },
  Suppliers: { t: 'Supplier', f: [['Nama', 'Nama supplier'], ['Alamat', 'Alamat'], ['Kontak', 'Kontak (HP/email)'], ['NPWP', 'NPWP'], ['SyaratBayar', 'Syarat pembayaran']] }
};
const $ = (s, r = document) => r.querySelector(s);
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const can = r => r.includes(S.user.role) || S.user.role === 'Admin';
const skel = () => '<div class="grid4"><div class="sk"></div><div class="sk"></div><div class="sk"></div><div class="sk"></div></div><div class="sk mt-3" style="height:260px"></div>';

// api(fn, ...args) -> lihat js/api.js (fetch ke backend Google Apps Script)
function toast(m, err) {
  const d = document.createElement('div'); d.className = 'tt' + (err ? ' err' : ''); d.setAttribute('role', err ? 'alert' : 'status'); d.textContent = m;
  $('#toasts').appendChild(d); setTimeout(() => d.remove(), 4500);
}
function fail(e) { toast(e.message, true); if (/Sesi berakhir/.test(e.message)) resetUI(); }
function busy(b, on, t) { if (!b) return; if (on) { b.dataset.t = b.innerHTML; b.disabled = true; b.innerHTML = '<span class="spinner-border spinner-border-sm"></span> ' + (t || 'Memproses...'); } else { b.disabled = false; b.innerHTML = b.dataset.t; } }
const view = h => { if (S.chart) { S.chart.destroy(); S.chart = null; } const c = $('#app-container'); c.innerHTML = h; };
const modal = h => { $('#modalBody').innerHTML = h; bootstrap.Modal.getOrCreateInstance($('#modal')).show(); };
const hideModal = () => bootstrap.Modal.getOrCreateInstance($('#modal')).hide();

// Tema (gelap/terang)
function toggleTheme() {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t; try { localStorage.setItem('theme', t); } catch (e) {}
  if (S.page === 'dashboard' && S.user) go('dashboard');
}
try { const t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}

// ── Login / logout ──
function renderLogin() {
  $('#loginView').hidden = false; $('#appView').hidden = true;
  $('#loginView').innerHTML = `<div class="lg"><section class="lg-l"><form onsubmit="doLogin(event)">
    <h2>Selamat datang</h2><p>Masuk ke Sim-Pengadaan dengan akun tim proyek.</p>
    <label class="form-label" for="em">Email</label><input id="em" type="email" class="form-control" required autocomplete="username">
    <label class="form-label" for="pn">PIN</label><input id="pn" type="password" class="form-control" required minlength="4" inputmode="numeric" autocomplete="current-password">
    <p id="le" role="alert" style="color:#ffdad6;margin:0"></p>
    <button class="btn-p" id="lb" style="background:#A9C46C;color:#1C2113">Masuk</button></form></section>
    <section class="lg-r"><span class="logo"><i class="bi bi-boxes"></i></span><h2>Sim-Pengadaan</h2><p class="mut">Pengadaan, gudang, dan keuangan proyek<br>dalam satu siklus terkontrol.</p></section></div>`;
}
async function doLogin(e) {
  e.preventDefault(); const b = $('#lb'); busy(b, true, 'Masuk...'); $('#le').textContent = '';
  try { const d = await api('login', $('#em').value, $('#pn').value); S.token = d.token; S.user = d.user; S.akses = d.akses || null; start(); }
  catch (x) { busy(b, false); $('#le').textContent = x.message; }
}
function resetUI() { S.akses = null; cacheClear(); S.notif = null; S.nt = 0; S.token = null; S.user = null; renderLogin(); }
function logout() { if (S.token) api('logout', S.token).catch(() => {}); resetUI(); }

// ── Shell & navigasi (SPA: URL tidak pernah berubah) ──
function start() {
  $('#loginView').hidden = true; $('#appView').hidden = false;
  $('#wNama').textContent = S.user.nama; $('#wRole').textContent = S.user.role;
  $('#nav').innerHTML = NAV.filter(n => S.akses ? S.akses.includes(n.id) : (!n.admin || S.user.role === 'Admin') && !(n.id === 'pr' && S.user.role === 'Site Accounting') && (!n.imp || can(MASTER_ROLES)))
    .map(n => `<button class="nv" data-p="${n.id}" onclick="go('${n.id}')"><i class="bi bi-${n.i}"></i>${n.t}${n.soon ? '<em>' + n.soon + '</em>' : ''}</button>`).join('');
  go('dashboard'); setTimeout(prefetchAll, 700); // data semua menu dimuat di latar belakang
}
function toggleNav(o) { $('#sidebar').classList.toggle('open', o); $('.scrim').classList.toggle('open', o); }
function go(p) {
  if (S.akses && !S.akses.includes(p)) { toast('Anda tidak memiliki akses ke menu ini.', true); return; } // daftar akses dari server (server tetap memeriksa setiap permintaan)
  S.page = p; apiPageStart(); toggleNav(false);
  document.querySelectorAll('.nv').forEach(b => { b.classList.toggle('on', b.dataset.p === p); b.toggleAttribute('aria-current', b.dataset.p === p); });
  const n = NAV.find(x => x.id === p); $('#pgTitle').textContent = n ? n.t : '';
  if (!['po', 'keuangan'].includes(p)) loadNotif();
  try { Promise.resolve(({ dashboard: pDash, pr: pPR, master: pMaster, pengaturan: pUsers, banding: pBand, po: pPO, grn: pGRN, gudang: pGudang, keuangan: pKeu, laporan: pLap, impor: pImpor, arsip: pArsip }[p] || (() => pSoon(n)))()).catch(showErr); } catch (e) { showErr(e); }
}
function pSoon(n) {
  view(`<div class="card2 empty"><i class="bi bi-${n.i}" style="font-size:40px;color:var(--pri)"></i><h3 class="mt-2">${esc(n.t)}</h3><p>Modul ini dijadwalkan pada ${esc(n.soon)}. Alur PR yang sudah disetujui akan langsung menjadi dasar modul ini.</p></div>`);
}

// ── Dashboard ──
const kpi = (l, v, i, s, c) => `<div class="card2"><div class="kl"><span>${l}</span><i class="bi bi-${i}"></i></div><div class="kv ${c || ''}">${v}</div><small>${s}</small></div>`;
async function pDash() {
  view(skel());
  try {
    const d = await api('getBoot', S.token); S.pr = d.tindakan;
    S.nt = d.tindakan.length; updateBell();
    view(`<div class="hd"><div><h2>Dashboard Pengadaan</h2><p class="mut m-0">Halo, ${esc(S.user.nama)}. Pantau permintaan dan persetujuan berjenjang secara real-time.</p></div>
      ${can(['Staf Lapangan', 'Manajer Operasional', 'Site Engineer', 'Cost Control', 'Manajer Proyek', 'Staf Pengadaan']) && S.user.role !== 'Site Accounting' ? '<button class="btn-p" onclick="prForm()"><i class="bi bi-plus-lg"></i> Buat PR Baru</button>' : ''}</div>
      <div class="grid4">${kpi('Pengadaan bulan ini', rp(d.nilaiBulan), 'cash-stack', d.jmlBulan + ' PR dibuat')}${kpi('Menunggu persetujuan', d.menunggu + ' Dokumen', 'hourglass-split', 'Berjenjang 4 tingkat')}
      ${kpi('Disetujui', d.disetujui, 'check2-circle', 'Siap diproses PO')}${kpi('Ditolak / revisi', d.ditolak, 'slash-circle', 'Perlu tindakan', 'err')}</div>
      <div class="row g-3 mt-1"><div class="col-lg-5"><div class="card2 h-100"><h3>Rincian nilai per disiplin</h3>${Object.keys(d.perDisiplin).length ? '<canvas id="cD" role="img" aria-label="Grafik donat nilai PR per disiplin"></canvas>' : '<p class="empty">Belum ada data PR.</p>'}</div></div>
      <div class="col-lg-7"><div class="card2 h-100"><h3>Menunggu tindakan Anda</h3>${d.tindakan.length ? `<div class="tw"><table class="tbl"><thead><tr><th>No. PR</th><th>Disiplin</th><th class="num">Estimasi</th><th></th></tr></thead><tbody>${d.tindakan.map(r => `<tr><td data-label="No. PR"><b class="pn">${esc(r.NoPR)}</b></td><td data-label="Disiplin">${esc(r.Disiplin)}</td><td data-label="Estimasi" class="num">${rp(r.Estimasi)}</td><td data-label="Aksi"><button class="btn-o" onclick="prDetail('${esc(r.ID)}')">Tinjau</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">Tidak ada PR yang menunggu persetujuan Anda.</p>'}</div></div></div>`);
    if ($('#cD')) {
      const st = getComputedStyle(document.documentElement);
      S.chart = new Chart($('#cD'), { type: 'doughnut', data: { labels: Object.keys(d.perDisiplin), datasets: [{ data: Object.values(d.perDisiplin), backgroundColor: CPAL, borderWidth: 0 }] }, options: { plugins: { legend: { position: 'bottom', labels: { color: st.getPropertyValue('--tx').trim() } }, tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + rp(c.raw) } } } } });
    }
  } catch (e) { fail(e); view('<div class="card2 empty">Gagal memuat dashboard.</div>'); }
}

// ── Permintaan Pengadaan (PR) ──
const stp = r => {
  const L = +r.Level, s = r.Status; let h = `<div class="stp" role="img" aria-label="Status ${esc(s)}">`;
  for (let i = 1; i <= 4; i++) { const c = s === 'Disetujui' || (s !== 'Draft' && i < L) ? 'done' : s === 'Diajukan' && i === L ? 'cur' : s === 'Ditolak' && i === L ? 'rej' : ''; h += `<span class="dt ${c}" title="${CHAIN[i - 1]}">${c === 'done' ? '<i class="bi bi-check"></i>' : c === 'rej' ? '!' : i}</span>`; }
  return h + `</div><span class="bd ${BD[s]}">${s === 'Diajukan' ? 'Level ' + L + ': ' + CHAIN[L - 1] : s === 'Ditolak' ? 'Ditolak (Level ' + L + ')' : esc(s)}</span>`;
};
const canEdit = r => r.EmailPengaju === S.user.email && ['Draft', 'Ditolak'].includes(r.Status);
async function pPR() {
  view(skel());
  try {
    S.pr = await api('listPR', S.token);
    view(`<div class="hd"><div><h2>Permintaan Pengadaan</h2><p class="mut m-0">${S.user.role === 'Staf Lapangan' ? 'Permintaan yang Anda buat.' : 'Seluruh permintaan proyek.'}</p></div>
      ${S.user.role !== 'Staf Gudang' ? '<button class="btn-p" onclick="prForm()"><i class="bi bi-plus-lg"></i> Buat PR Baru</button>' : ''}</div>
      <div class="bar"><label class="visually-hidden" for="q">Cari</label><input id="q" class="form-control" placeholder="Cari no. PR, pengaju, barang" oninput="drawPR()">
      <label class="visually-hidden" for="fs">Status</label><select id="fs" class="form-select" onchange="drawPR()"><option value="">Semua status</option>${Object.keys(BD).map(s => `<option>${s}</option>`).join('')}</select>
      <label class="visually-hidden" for="fd">Disiplin</label><select id="fd" class="form-select" onchange="drawPR()"><option value="">Semua disiplin</option>${DISIPLIN.map(s => `<option>${s}</option>`).join('')}</select>${expBar()}</div><div id="prT"></div>`);
    drawPR();
  } catch (e) { fail(e); view('<div class="card2 empty">Gagal memuat data PR.</div>'); }
}
function drawPR() {
  const q = $('#q').value.toLowerCase(), fs = $('#fs').value, fd = $('#fd').value;
  const L = S.pr.filter(r => (!fs || r.Status === fs) && (!fd || r.Disiplin === fd) && (!q || (r.NoPR + r.Pengaju + r.Items).toLowerCase().includes(q)));
  S.exp = { name: 'PR', head: ['No PR', 'Tanggal', 'Pengaju', 'Disiplin', 'Estimasi', 'Status'], rows: L.map(r => [r.NoPR, r.Tanggal, r.Pengaju, r.Disiplin, r.Estimasi, r.Status]) };
  $('#prT').innerHTML = L.length ? `<div class="tw"><table class="tbl"><thead><tr><th>No. PR / Tanggal</th><th>Pengaju / Disiplin</th><th>Rincian barang</th><th class="num">Estimasi</th><th>Status persetujuan (4 tingkat)</th><th>Aksi</th></tr></thead><tbody>${L.map(r => { const it = JSON.parse(r.Items || '[]'); return `<tr>
    <td data-label="No. PR"><b class="pn">${esc(r.NoPR)}</b><small>${esc(r.Tanggal)}</small></td><td data-label="Pengaju">${esc(r.Pengaju)}<small>${esc(r.Disiplin)}</small></td>
    <td data-label="Rincian">${esc(it.slice(0, 2).map(i => i.nama + ' (' + i.qty + ' ' + i.satuan + ')').join(', '))}${it.length > 2 ? ' +' + (it.length - 2) + ' lainnya' : ''}</td>
    <td data-label="Estimasi" class="num">${rp(r.Estimasi)}</td><td data-label="Status">${stp(r)}</td>
    <td data-label="Aksi"><button class="ib" onclick="prDetail('${esc(r.ID)}')" aria-label="Lihat ${esc(r.NoPR)}"><i class="bi bi-eye"></i></button>${canEdit(r) ? `<button class="ib" onclick="prForm('${esc(r.ID)}')" aria-label="Ubah ${esc(r.NoPR)}"><i class="bi bi-pencil"></i></button>` : ''}${revBtn(r)}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="card2 empty">Tidak ada PR yang cocok.</div>';
}
function prDetail(id) {
  const r = S.pr.find(x => x.ID === id); if (!r) return;
  const it = JSON.parse(r.Items || '[]'), rw = JSON.parse(r.Riwayat || '[]'), mine = r.Status === 'Diajukan' && (CHAIN[r.Level - 1] === S.user.role || S.user.role === 'Admin');
  modal(`<div class="modal-header"><h3 class="m-0">${esc(r.NoPR)}</h3><button class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button></div>
    <div class="modal-body"><p class="mut">${esc(r.Pengaju)} · ${esc(r.Disiplin)} · ${esc(r.Tanggal)}</p>${stp(r)}${r.Catatan ? `<p class="mt-2" style="color:var(--err)"><b>Alasan penolakan:</b> ${esc(r.Catatan)}</p>` : ''}
    <div class="tw mt-3"><table class="tbl"><thead><tr><th>Barang</th><th class="num">Jumlah</th><th>Satuan</th><th class="num">Harga est.</th><th>Keterangan</th></tr></thead><tbody>${it.map(i => `<tr><td data-label="Barang">${esc(i.nama)}</td><td data-label="Jumlah" class="num">${esc(i.qty)}</td><td data-label="Satuan">${esc(i.satuan)}</td><td data-label="Harga" class="num">${rp(i.harga)}</td><td data-label="Ket.">${esc(i.ket)}</td></tr>`).join('')}</tbody></table></div>
    <p class="num mt-2"><b>Total estimasi: ${rp(r.Estimasi)}</b></p><h3>Riwayat</h3><ul class="tl">${rw.map(w => `<li><b>${esc(w.oleh)}</b> — ${esc(w.aksi)}<small>${esc(w.t)}</small></li>`).join('')}</ul>
    ${attBox('PR', r.ID, r.EmailPengaju === S.user.email || S.user.role === 'Admin')}${mine ? '<label class="form-label mt-3" for="cat">Catatan (wajib bila menolak)</label><textarea id="cat" class="form-control" rows="2" maxlength="300"></textarea>' : ''}</div>
    <div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Tutup</button>${revBtn(r, true)}${mine ? `<button class="btn-d" onclick="act('${esc(r.ID)}','tolak',this)">Tolak</button><button class="btn-p" onclick="act('${esc(r.ID)}','setuju',this)">Setujui</button>` : ''}</div>`);
  loadAtt('PR', r.ID);
}
const rowF = (i = {}) => `<div class="row g-2 mb-2 pr-r"><div class="col-12 col-md-4"><input class="form-control f-n" list="dl" placeholder="Nama barang" aria-label="Nama barang" value="${esc(i.nama)}"></div>
  <div class="col-4 col-md-2"><input class="form-control f-q" type="number" min="0.01" step="any" placeholder="Jumlah" aria-label="Jumlah" value="${esc(i.qty)}"></div>
  <div class="col-4 col-md-2"><input class="form-control f-s" placeholder="Satuan" aria-label="Satuan" value="${esc(i.satuan)}"></div>
  <div class="col-4 col-md-2"><input class="form-control f-h" type="number" min="0" placeholder="Harga est." aria-label="Harga estimasi" value="${esc(i.harga || '')}"></div>
  <div class="col-10 col-md-1"><input class="form-control f-k" placeholder="Ket." aria-label="Keterangan" value="${esc(i.ket)}"></div>
  <div class="col-2 col-md-1"><button type="button" class="ib" onclick="this.closest('.pr-r').remove()" aria-label="Hapus baris"><i class="bi bi-trash"></i></button></div></div>`;
async function prForm(id) {
  const r = id ? S.pr.find(x => x.ID === id) : null, it = r ? JSON.parse(r.Items) : [{}];
  try { S.items = S.items || await api('listMaster', S.token, 'Items'); } catch (e) { S.items = []; }
  modal(`<div class="modal-header"><h3 class="m-0">${r ? 'Ubah ' + esc(r.NoPR) : 'Buat PR Baru'}</h3><button class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button></div>
    <div class="modal-body"><label class="form-label" for="pd">Disiplin</label><select id="pd" class="form-select mb-3"><option value="">Pilih disiplin</option>${DISIPLIN.map(d => `<option ${r && r.Disiplin === d ? 'selected' : ''}>${d}</option>`).join('')}</select>
    <datalist id="dl">${S.items.map(i => `<option value="${esc(i.Nama)}">`).join('')}</datalist><div id="rows">${it.map(rowF).join('')}</div>
    <button type="button" class="btn-o" onclick="$('#rows').insertAdjacentHTML('beforeend',rowF())"><i class="bi bi-plus"></i> Tambah barang</button>
    <p class="mut mt-2 mb-0">Lampiran (scan, foto, spesifikasi) hadir pada pembaruan berikutnya.</p></div>
    <div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Batal</button><button class="btn-o" onclick="sendPR('${r ? esc(r.ID) : ''}',false,this)">Simpan Draft</button><button class="btn-p" onclick="sendPR('${r ? esc(r.ID) : ''}',true,this)">Ajukan</button></div>`);
}
async function sendPR(id, submit, b) {
  const items = [...document.querySelectorAll('.pr-r')].map(x => ({ nama: $('.f-n', x).value, qty: $('.f-q', x).value, satuan: $('.f-s', x).value, harga: $('.f-h', x).value, ket: $('.f-k', x).value }));
  busy(b, true, 'Menyimpan...');
  try { await api('savePR', S.token, { ID: id || undefined, disiplin: $('#pd').value, items }, submit); toast(submit ? 'PR diajukan.' : 'Draft tersimpan.'); hideModal(); go(S.page === 'dashboard' ? 'pr' : S.page); }
  catch (e) { busy(b, false); fail(e); }
}

// ── Data induk ──
async function pMaster() {
  view(skel());
  try {
    const n = S.mt, L = await api('listMaster', S.token, n), ed = can(MASTER_ROLES), cols = MF[n].f.map(f => f[0]);
    view(`<div class="hd"><div><h2>Data Induk</h2><p class="mut m-0">${ed ? 'Kelola barang/jasa dan supplier.' : 'Anda hanya dapat melihat data induk.'}</p></div>${ed ? `<button class="btn-p" onclick="mForm()"><i class="bi bi-plus-lg"></i> Tambah ${MF[n].t}</button>` : ''}</div>
      <div class="bar" role="tablist">${Object.keys(MF).map(k => `<button role="tab" aria-selected="${k === n}" class="${k === n ? 'btn-p' : 'btn-o'}" onclick="S.mt='${k}';pMaster()">${MF[k].t}</button>`).join('')}</div>
      ${L.length ? `<div class="tw"><table class="tbl"><thead><tr>${MF[n].f.map(f => `<th>${f[1]}</th>`).join('')}${ed ? '<th></th>' : ''}</tr></thead><tbody>${L.map((r, i) => `<tr>${cols.map((c, j) => `<td data-label="${MF[n].f[j][1]}">${esc(r[c])}</td>`).join('')}${ed ? `<td data-label="Aksi"><button class="ib" onclick='mForm(${JSON.stringify(r).replace(/'/g, '&#39;')})' aria-label="Ubah"><i class="bi bi-pencil"></i></button></td>` : ''}</tr>`).join('')}</tbody></table></div>` : '<div class="card2 empty">Belum ada data.</div>'}`);
  } catch (e) { fail(e); }
}
function mForm(r = {}) {
  const n = S.mt;
  modal(`<div class="modal-header"><h3 class="m-0">${r.ID ? 'Ubah' : 'Tambah'} ${MF[n].t}</h3><button class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button></div>
    <div class="modal-body">${MF[n].f.map(f => `<label class="form-label" for="m_${f[0]}">${f[1]}</label>${f[2] ? `<select id="m_${f[0]}" class="form-select mb-2"><option value="">Pilih</option>${f[2].map(o => `<option ${r[f[0]] === o ? 'selected' : ''}>${o}</option>`).join('')}</select>` : `<input id="m_${f[0]}" class="form-control mb-2" value="${esc(r[f[0]])}">`}`).join('')}</div>
    <div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Batal</button><button class="btn-p" onclick="mSave('${esc(r.ID || '')}',this)">Simpan</button></div>`);
}
async function mSave(id, b) {
  const o = { ID: id || undefined }; MF[S.mt].f.forEach(f => o[f[0]] = $('#m_' + f[0]).value);
  busy(b, true, 'Menyimpan...');
  try { await api('saveMaster', S.token, S.mt, o); if (S.mt === 'Items') S.items = null; toast('Data tersimpan.'); hideModal(); pMaster(); } catch (e) { busy(b, false); fail(e); }
}

// ── Pengaturan (Admin): pengguna ──
async function pUsers() {
  view(skel());
  try {
    const L = await api('listUsers', S.token);
    view(`<div class="hd"><div><h2>Pengaturan Pengguna</h2><p class="mut m-0">Tambah pengguna, atur peran, dan reset PIN.</p></div><button class="btn-p" onclick="uForm()"><i class="bi bi-plus-lg"></i> Tambah Pengguna</button></div>
      <div class="tw"><table class="tbl"><thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Status</th><th></th></tr></thead><tbody>${L.map(u => `<tr><td data-label="Nama">${esc(u.Nama)}</td><td data-label="Email">${esc(u.Email)}</td><td data-label="Peran">${esc(u.Role)}</td><td data-label="Status"><span class="bd ${u.Aktif === 'Ya' ? 'bd-ok' : 'bd-n'}">${u.Aktif === 'Ya' ? 'Aktif' : 'Nonaktif'}</span></td><td data-label="Aksi"><button class="ib" onclick='uForm(${JSON.stringify(u).replace(/'/g, '&#39;')})' aria-label="Ubah ${esc(u.Nama)}"><i class="bi bi-pencil"></i></button></td></tr>`).join('')}</tbody></table></div>`);
  } catch (e) { fail(e); }
}
function uForm(u = {}) {
  modal(`<div class="modal-header"><h3 class="m-0">${u.ID ? 'Ubah' : 'Tambah'} Pengguna</h3><button class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button></div>
    <div class="modal-body"><label class="form-label" for="u_n">Nama</label><input id="u_n" class="form-control mb-2" value="${esc(u.Nama)}">
    <label class="form-label" for="u_e">Email</label><input id="u_e" type="email" class="form-control mb-2" value="${esc(u.Email)}">
    <label class="form-label" for="u_r">Peran</label><select id="u_r" class="form-select mb-2">${ROLES.map(r => `<option ${u.Role === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
    <label class="form-label" for="u_p">${u.ID ? 'PIN baru (kosongkan bila tidak diganti)' : 'PIN awal (4–8 angka)'}</label><input id="u_p" type="password" inputmode="numeric" class="form-control mb-2" autocomplete="new-password">
    <label class="form-label" for="u_a">Status</label><select id="u_a" class="form-select"><option value="Ya" ${u.Aktif !== 'Tidak' ? 'selected' : ''}>Aktif</option><option value="Tidak" ${u.Aktif === 'Tidak' ? 'selected' : ''}>Nonaktif</option></select></div>
    <div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Batal</button><button class="btn-p" onclick="uSave('${esc(u.ID || '')}',this)">Simpan</button></div>`);
}
async function uSave(id, b) {
  busy(b, true, 'Menyimpan...');
  try { await api('saveUser', S.token, { ID: id || undefined, Nama: $('#u_n').value, Email: $('#u_e').value, Role: $('#u_r').value, Pin: $('#u_p').value, Aktif: $('#u_a').value }); toast('Pengguna tersimpan.'); hideModal(); pUsers(); }
  catch (e) { busy(b, false); fail(e); }
}
document.addEventListener('DOMContentLoaded', renderLogin);

const BP = { 'Menunggu Validasi': 'bd-w', Disetujui: 'bd-ok', Ditolak: 'bd-er', Dikirim: 'bd-w', 'Diterima Sebagian': 'bd-w', Diterima: 'bd-ok' };
const bp = s => `<span class="bd ${BP[s] || 'bd-n'}">${esc(s)}</span>`;
const noAcc = '<div class="card2 empty">Modul tidak dapat dimuat (mungkin di luar hak akses peran Anda).</div>';
const GD = ['Staf Gudang', ...MASTER_ROLES];

// Muat ulang halaman aktif (data induk di-cache ulang)
function refresh() { S.items = null; S.sup = null; S.ref = null; apiDropPageKeys(); go(S.page); toast('Halaman dimuat ulang.'); } // paksa ambil data segar dari server

// Ekspor Excel (CSV) & cetak/PDF
function exportCSV() {
  const x = S.exp; if (!x || !x.rows.length) { toast('Tidak ada data untuk diekspor.', true); return; }
  const q = v => { let s = typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v; return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; };
  const csv = '\uFEFF' + [x.head].concat(x.rows).map(r => r.map(q).join(',')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = x.name + '-' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click(); a.remove();
}
const expBar = () => '<button class="btn-o" onclick="exportCSV()"><i class="bi bi-file-earmark-spreadsheet"></i> Ekspor Excel</button><button class="btn-o" onclick="window.print()"><i class="bi bi-printer"></i> Cetak / PDF</button>';

// Lampiran (foto/PDF ke Drive)
const attBox = (ref, id, up) => `<h3 class="mt-3">Lampiran</h3><ul id="att" class="tl"><li class="mut">Memuat...</li></ul>${up ? `<div class="d-flex gap-2 flex-wrap"><label class="visually-hidden" for="af">Pilih berkas</label><input id="af" type="file" accept="image/*,application/pdf" class="form-control" style="max-width:320px"><button class="btn-o" onclick="upAtt('${ref}','${esc(id)}',this)"><i class="bi bi-upload"></i> Unggah</button></div>` : ''}`;
async function loadAtt(ref, id) {
  try { const L = await api('listLampiran', S.token, ref, id); $('#att').innerHTML = L.length ? L.map(a => `<li><a href="${esc(a.Url)}" target="_blank" rel="noopener">${esc(a.Nama)}</a><small>${esc(a.Oleh)} · ${esc(a.Waktu)}</small></li>`).join('') : '<li class="mut">Belum ada lampiran.</li>'; }
  catch (e) { $('#att').innerHTML = '<li class="mut">Gagal memuat lampiran.</li>'; }
}
function upAtt(ref, id, b) {
  const f = $('#af').files[0]; if (!f) { toast('Pilih berkas dahulu.', true); return; }
  if (f.size > 5 * 1024 * 1024) { toast('Ukuran maksimal 5 MB.', true); return; }
  busy(b, true, 'Mengunggah...'); const rd = new FileReader();
  rd.onload = async () => { try { await api('uploadLampiran', S.token, ref, id, f.name, f.type, rd.result.split(',')[1]); toast('Lampiran terunggah.'); busy(b, false); $('#af').value = ''; loadAtt(ref, id); } catch (e) { busy(b, false); fail(e); } };
  rd.readAsDataURL(f);
}
const head = (t, s, btn) => `<div class="hd"><div><h2>${t}</h2><p class="mut m-0">${s}</p></div><div class="bar m-0">${btn || ''}</div></div>`;
const tbl = (cols, rows) => `<div class="tw"><table class="tbl"><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
const itemsTbl = it => tbl(['Barang', 'Jumlah', 'Satuan'], it.map(i => `<tr><td data-label="Barang">${esc(i.nama)}</td><td data-label="Jumlah" class="num">${esc(i.qty)}</td><td data-label="Satuan">${esc(i.satuan)}</td></tr>`).join(''));
const hist = rw => `<h3 class="mt-3">Riwayat</h3><ul class="tl">${rw.map(w => `<li><b>${esc(w.oleh)}</b> — ${esc(w.aksi)}<small>${esc(w.t)}</small></li>`).join('')}</ul>`;

// ── Perbandingan harga ──
async function pBand() {
  view(skel());
  try {
    S.pr = (await api('listPR', S.token)).filter(r => r.Status === 'Disetujui'); S.sup = await api('listMaster', S.token, 'Suppliers');
    view(head('Perbandingan Harga &amp; Penawaran', 'Bandingkan penawaran supplier untuk PR yang sudah disetujui, lalu pilih untuk membuat PO.') +
      `<div class="bar"><label class="visually-hidden" for="bp">PR</label><select id="bp" class="form-select" style="max-width:420px" onchange="bandLoad()"><option value="">Pilih PR yang sudah disetujui</option>${S.pr.map(r => `<option value="${esc(r.ID)}">${esc(r.NoPR)} — ${esc(r.Disiplin)} (${rp(r.Estimasi)})</option>`).join('')}</select>
      ${can(MASTER_ROLES) ? '<button class="btn-o" id="bq" onclick="qForm()" hidden><i class="bi bi-plus"></i> Tambah Penawaran</button>' : ''}${expBar()}</div><div id="bT"><div class="card2 empty">Pilih PR untuk melihat perbandingan.</div></div>`);
  } catch (e) { fail(e); view(noAcc); }
}
async function bandLoad() {
  const id = $('#bp').value; if ($('#bq')) $('#bq').hidden = !id; S.exp = null;
  if (!id) { $('#bT').innerHTML = '<div class="card2 empty">Pilih PR untuk melihat perbandingan.</div>'; return; }
  $('#bT').innerHTML = '<div class="sk" style="height:200px"></div>';
  try { S.q = await api('listQuotes', S.token, id); drawBand(); } catch (e) { fail(e); }
}
function drawBand() {
  const Q = S.q; if (!Q.length) { $('#bT').innerHTML = '<div class="card2 empty">Belum ada penawaran. Tambahkan penawaran dari supplier.</div>'; return; }
  const rt = n => { const s = S.sup.find(x => x.Nama === n); return s && s.Rating ? +s.Rating : 0; };
  const mp = Math.min(...Q.map(q => +q.Total)), ml = Math.min(...Q.map(q => +q.LeadTime));
  const sc = q => .5 * mp / +q.Total + .3 * (ml + 1) / (+q.LeadTime + 1) + .2 * rt(q.Supplier) / 5, best = Q.reduce((a, b) => sc(b) > sc(a) ? b : a);
  const tag = q => (q.ID === best.ID ? '<span class="bd bd-ok">Rekomendasi sistem</span> ' : '') + (+q.Total === mp ? '<span class="bd bd-w">Termurah</span> ' : '') + (+q.LeadTime === ml ? '<span class="bd bd-w">Tercepat</span>' : '');
  const row = (l, f) => `<tr><th scope="row">${l}</th>${Q.map(q => `<td data-label="${esc(q.Supplier)}">${f(q)}</td>`).join('')}</tr>`;
  S.exp = { name: 'perbandingan-harga', head: ['Parameter'].concat(Q.map(q => q.Supplier)), rows: [['Total penawaran'].concat(Q.map(q => q.Total)), ['Lama kirim (hari)'].concat(Q.map(q => q.LeadTime)), ['Syarat pembayaran'].concat(Q.map(q => q.Syarat)), ['Rating'].concat(Q.map(q => rt(q.Supplier)))] };
  $('#bT').innerHTML = `<div class="tw" style="overflow:auto"><table class="tbl"><thead><tr><th>Parameter</th>${Q.map(q => `<th>${esc(q.Supplier)}</th>`).join('')}</tr></thead><tbody>${row('Rekomendasi', tag)}${row('Total penawaran', q => '<b>' + rp(q.Total) + '</b>')}${row('Lama kirim', q => q.LeadTime + ' hari')}${row('Syarat pembayaran', q => esc(q.Syarat || '-'))}${row('Rating supplier', q => rt(q.Supplier) ? '★ ' + rt(q.Supplier) + '/5' : '-')}${can(MASTER_ROLES) ? row('Aksi', q => `<button class="btn-p" onclick="mkPO('${esc(q.ID)}',this)">Pilih &amp; Buat PO</button>`) : ''}</tbody></table></div><p class="mut mt-2">Rekomendasi sistem bersifat opsional (bobot: harga 50%, lama kirim 30%, rating 20%). Keputusan tetap di tangan Anda.</p>`;
}
function qForm() {
  modal(`<div class="modal-header"><h3 class="m-0">Tambah Penawaran</h3><button class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button></div><div class="modal-body">
    <label class="form-label" for="q_s">Supplier</label><select id="q_s" class="form-select mb-2"><option value="">Pilih supplier</option>${S.sup.map(s => `<option>${esc(s.Nama)}</option>`).join('')}</select>
    <label class="form-label" for="q_t">Total harga penawaran (Rp)</label><input id="q_t" type="number" min="1" class="form-control mb-2">
    <label class="form-label" for="q_l">Lama pengiriman (hari)</label><input id="q_l" type="number" min="0" class="form-control mb-2">
    <label class="form-label" for="q_y">Syarat pembayaran</label><input id="q_y" class="form-control" maxlength="100"></div>
    <div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Batal</button><button class="btn-p" onclick="qSave(this)">Simpan</button></div>`);
}
async function qSave(b) {
  busy(b, true, 'Menyimpan...');
  try { await api('saveQuote', S.token, { PRID: $('#bp').value, Supplier: $('#q_s').value, Total: $('#q_t').value, LeadTime: $('#q_l').value, Syarat: $('#q_y').value }); toast('Penawaran tersimpan.'); hideModal(); bandLoad(); }
  catch (e) { busy(b, false); fail(e); }
}
async function mkPO(qid, b) {
  busy(b, true);
  try { await api('createPO', S.token, $('#bp').value, qid); toast('PO dibuat dan menunggu validasi Manajer Proyek.'); go('po'); } catch (e) { busy(b, false); fail(e); }
}

// ── Pesanan Pengadaan (PO) ──
async function pPO() {
  view(skel());
  try {
    S.po = await api('listPO', S.token); await loadNotif(); const P = S.po, ak = P.filter(p => !['Ditolak', 'Diterima', 'Arsip'].includes(p.Status));
    view(head('Pesanan Pengadaan (PO)', 'PO dibuat dari perbandingan harga, divalidasi Manajer Proyek, lalu dikirim ke supplier.', expBar()) +
      `<div class="grid4 mb-3">${kpi('PO aktif', ak.length, 'cart', 'Belum selesai diterima')}${kpi('Menunggu validasi', P.filter(p => p.Status === 'Menunggu Validasi').length, 'shield-check', 'Perlu Manajer Proyek')}${kpi('Total komitmen', rp(ak.reduce((s, p) => s + +p.Total, 0)), 'cash-stack', 'PO aktif')}${kpi('Diterima lengkap', P.filter(p => p.Status === 'Diterima').length, 'check2-circle', 'Siap ditagih')}</div>${notifPO()}<div id="poT"></div>`);
    S.exp = { name: 'po', head: ['No PO', 'Tanggal', 'No PR', 'Supplier', 'Total', 'Status'], rows: P.map(p => [p.NoPO, p.Tanggal, p.NoPR, p.Supplier, p.Total, p.Status]) };
    $('#poT').innerHTML = P.length ? tbl(['No. PO / Tanggal', 'PR / Supplier', 'Total', 'Status', 'Aksi'], P.map(p => `<tr><td data-label="No. PO"><b class="pn">${esc(p.NoPO)}</b><small>${esc(p.Tanggal)}</small></td><td data-label="Supplier">${esc(p.Supplier)}<small>${esc(p.NoPR)}</small></td><td data-label="Total" class="num">${rp(p.Total)}</td><td data-label="Status">${bp(p.Status)}${fakBadge(p)}</td><td data-label="Aksi"><button class="ib" onclick="poDetail('${esc(p.ID)}')" aria-label="Lihat ${esc(p.NoPO)}"><i class="bi bi-eye"></i></button>${revPOBtn(p)}${fakBtn(p)}</td></tr>`).join('')) : '<div class="card2 empty">Belum ada PO. Buat dari menu Perbandingan Harga.</div>';
  } catch (e) { fail(e); view(noAcc); }
}
function poDetail(id) {
  const p = S.po.find(x => x.ID === id); if (!p) return;
  const mp = p.Status === 'Menunggu Validasi' && ['Manajer Proyek', 'Admin'].includes(S.user.role), snd = p.Status === 'Disetujui' && can(MASTER_ROLES);
  let d = String(p.Kontak || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '62' + d.slice(1);
  const wa = ['Disetujui', 'Dikirim'].includes(p.Status) && d.length >= 9 ? `<a class="btn-o" target="_blank" rel="noopener" href="https://wa.me/${d}?text=${encodeURIComponent('Yth. ' + p.Supplier + ', berikut Pesanan Pengadaan ' + p.NoPO + ' senilai ' + rp(p.Total) + '. Mohon konfirmasi penerimaan dan jadwal kirim.')}"><i class="bi bi-whatsapp"></i> Kirim via WhatsApp</a>` : '';
  modal(`<div class="modal-header"><h3 class="m-0">${esc(p.NoPO)}</h3><button class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button></div><div class="modal-body">
    <p class="mut">${esc(p.Supplier)} · ${esc(p.NoPR)} · ${esc(p.Disiplin)} · lama kirim ${esc(p.LeadTime)} hari · ${esc(p.Syarat || '-')}</p>${bp(p.Status)}${fakBadge(p)}<p class="mt-2"><b>Total: ${rp(p.Total)}</b></p>
    ${itemsTbl(JSON.parse(p.Items))}${hist(JSON.parse(p.Riwayat || '[]'))}${attBox('PO', p.ID, can(MASTER_ROLES))}
    ${mp ? '<label class="form-label mt-3" for="cat">Catatan (wajib bila menolak)</label><textarea id="cat" class="form-control" rows="2" maxlength="300"></textarea>' : ''}</div>
    <div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Tutup</button>${revPOBtn(p, true)}${wa}${fakBtn(p, true)}${snd ? `<button class="btn-p" onclick="poAct('${esc(p.ID)}','kirim',this)">Tandai Dikirim</button>` : ''}${mp ? `<button class="btn-d" onclick="poAct('${esc(p.ID)}','tolak',this)">Tolak</button><button class="btn-p" onclick="poAct('${esc(p.ID)}','validasi',this)">Validasi PO</button>` : ''}</div>`);
  loadAtt('PO', p.ID);
}

// ── Penerimaan barang (GRN) ──
async function pGRN() {
  view(skel());
  try {
    [S.po, S.grn] = await Promise.all([api('listPO', S.token), api('listGRN', S.token)]);
    view(head('Penerimaan Barang (GRN)', 'Catat barang yang datang berdasarkan nomor PO; stok gudang bertambah otomatis.', (can(GD) ? '<button class="btn-p" onclick="grnForm()"><i class="bi bi-plus-lg"></i> Terima Barang</button>' : '') + expBar()) + '<div id="gT"></div>');
    S.exp = { name: 'grn', head: ['No GRN', 'Tanggal', 'No PO', 'Penerima', 'Lokasi', 'Catatan'], rows: S.grn.map(g => [g.NoGRN, g.Tanggal, g.NoPO, g.Penerima, g.Lokasi, g.Catatan]) };
    $('#gT').innerHTML = S.grn.length ? tbl(['No. GRN / Tanggal', 'No. PO', 'Penerima / Lokasi', 'Rincian', 'Aksi'], S.grn.map(g => { const it = JSON.parse(g.Items); return `<tr><td data-label="No. GRN"><b class="pn">${esc(g.NoGRN)}</b><small>${esc(g.Tanggal)}</small></td><td data-label="No. PO">${esc(g.NoPO)}</td><td data-label="Penerima">${esc(g.Penerima)}<small>${esc(g.Lokasi)}</small></td><td data-label="Rincian">${esc(it.map(i => i.nama + ' ' + i.qty + ' (' + i.kondisi + ')').join(', '))}</td><td data-label="Aksi"><button class="ib" onclick="grnDetail('${esc(g.ID)}')" aria-label="Lihat ${esc(g.NoGRN)}"><i class="bi bi-eye"></i></button></td></tr>`; }).join('')) : '<div class="card2 empty">Belum ada penerimaan barang.</div>';
  } catch (e) { fail(e); view(noAcc); }
}
function grnDetail(id) {
  const g = S.grn.find(x => x.ID === id); if (!g) return;
  modal(`<div class="modal-header"><h3 class="m-0">${esc(g.NoGRN)}</h3><button class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button></div><div class="modal-body"><p class="mut">${esc(g.NoPO)} · ${esc(g.Penerima)} · ${esc(g.Lokasi)} · ${esc(g.Tanggal)}</p>
    ${tbl(['Barang', 'Jumlah', 'Kondisi'], JSON.parse(g.Items).map(i => `<tr><td data-label="Barang">${esc(i.nama)}</td><td data-label="Jumlah" class="num">${esc(i.qty)} ${esc(i.satuan)}</td><td data-label="Kondisi">${esc(i.kondisi)}</td></tr>`).join(''))}
    ${g.Catatan ? `<p class="mt-2"><b>Catatan:</b> ${esc(g.Catatan)}</p>` : ''}${attBox('GRN', g.ID, can(GD))}</div><div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Tutup</button></div>`);
  loadAtt('GRN', g.ID);
}
function remain(po) {
  const got = {}; S.grn.filter(g => g.POID === po.ID).forEach(g => JSON.parse(g.Items).forEach(i => got[i.nama] = (got[i.nama] || 0) + i.qty));
  return JSON.parse(po.Items).map(i => Object.assign({}, i, { sisa: i.qty - (got[i.nama] || 0) }));
}
function grnForm() {
  const L = S.po.filter(p => ['Disetujui', 'Dikirim', 'Diterima Sebagian'].includes(p.Status));
  modal(`<div class="modal-header"><h3 class="m-0">Terima Barang</h3><button class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button></div><div class="modal-body">
    <label class="form-label" for="g_p">Nomor PO</label><select id="g_p" class="form-select mb-3" onchange="grnItems()"><option value="">Pilih PO</option>${L.map(p => `<option value="${esc(p.ID)}">${esc(p.NoPO)} — ${esc(p.Supplier)}</option>`).join('')}</select><div id="gi"></div>
    <label class="form-label" for="g_l">Lokasi penyimpanan</label><input id="g_l" class="form-control mb-2" maxlength="100"><label class="form-label" for="g_c">Catatan (barang rusak / tidak sesuai untuk retur atau klaim)</label><textarea id="g_c" class="form-control" rows="2" maxlength="300"></textarea>
    <p class="mut mt-2 mb-0">Foto bukti dan surat jalan dapat diunggah dari detail GRN setelah disimpan.</p></div>
    <div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Batal</button><button class="btn-p" onclick="grnSave(this)">Simpan Penerimaan</button></div>`);
}
function grnItems() {
  const po = S.po.find(p => p.ID === $('#g_p').value);
  $('#gi').innerHTML = po ? remain(po).filter(i => i.sisa > 0).map(i => `<div class="row g-2 mb-2 gi-r" data-n="${esc(i.nama)}" data-s="${esc(i.satuan)}"><div class="col-12 col-md-5"><b>${esc(i.nama)}</b><small class="d-block">Sisa ${esc(i.sisa)} ${esc(i.satuan)}</small></div><div class="col-6 col-md-3"><input class="form-control g-q" type="number" min="0" max="${i.sisa}" step="any" placeholder="Jumlah datang" aria-label="Jumlah datang ${esc(i.nama)}"></div><div class="col-6 col-md-4"><select class="form-select g-k" aria-label="Kondisi ${esc(i.nama)}"><option>Baik</option><option>Rusak</option><option>Tidak sesuai</option></select></div></div>`).join('') : '';
}
async function grnSave(b) {
  const items = [...document.querySelectorAll('.gi-r')].map(r => ({ nama: r.dataset.n, satuan: r.dataset.s, qty: $('.g-q', r).value, kondisi: $('.g-k', r).value }));
  busy(b, true, 'Menyimpan...');
  try { await api('saveGRN', S.token, { poId: $('#g_p').value, lokasi: $('#g_l').value, catatan: $('#g_c').value, items }); toast('Penerimaan tercatat, stok diperbarui.'); hideModal(); pGRN(); } catch (e) { busy(b, false); fail(e); }
}

// ── Gudang & persediaan ──
async function pGudang() {
  view(skel());
  try {
    const d = await api('getStock', S.token); S.stk = d;
    S.exp = { name: 'stok-gudang', head: ['Barang', 'Kategori', 'Satuan', 'Masuk', 'Keluar', 'Stok', 'Nilai'], rows: d.stok.map(x => [x.Barang, x.Kategori, x.Satuan, x.Masuk, x.Keluar, x.Stok, x.Nilai]) };
    view(head('Gudang &amp; Inventaris', 'Stok terkini, nilai persediaan, dan riwayat pergerakan barang.', (can(GD) ? '<button class="btn-p" onclick="kForm()"><i class="bi bi-box-arrow-up"></i> Catat Barang Keluar</button>' : '') + expBar()) +
      `<div class="grid4 mb-3">${kpi('Jenis barang', d.stok.length, 'boxes', 'Tercatat di gudang')}${kpi('Nilai persediaan', rp(d.stok.reduce((s, x) => s + x.Nilai, 0)), 'cash-stack', 'Biaya rata-rata')}${kpi('Stok habis', d.stok.filter(x => x.Stok <= 0).length, 'exclamation-triangle', 'Pertimbangkan membuat PR', 'err')}</div>` +
      (d.stok.length ? tbl(['Barang', 'Kategori', 'Satuan', 'Masuk', 'Keluar', 'Stok', 'Nilai'], d.stok.map(x => `<tr><td data-label="Barang">${esc(x.Barang)}</td><td data-label="Kategori">${esc(x.Kategori)}</td><td data-label="Satuan">${esc(x.Satuan)}</td><td data-label="Masuk" class="num">${x.Masuk}</td><td data-label="Keluar" class="num">${x.Keluar}</td><td data-label="Stok" class="num"><b>${x.Stok}</b></td><td data-label="Nilai" class="num">${rp(x.Nilai)}</td></tr>`).join('')) : '<div class="card2 empty">Belum ada stok. Stok bertambah saat barang diterima (GRN).</div>') +
      '<h3 class="mt-4">Riwayat pergerakan (100 terakhir)</h3>' + (d.gerak.length ? tbl(['Tanggal', 'Barang', 'Pergerakan', 'Nilai', 'Disiplin', 'Referensi'], d.gerak.map(r => `<tr><td data-label="Tanggal">${esc(r.Tanggal)}</td><td data-label="Barang">${esc(r.Barang)}</td><td data-label="Pergerakan" class="num">${+r.Masuk > 0 ? '+' + r.Masuk : '−' + r.Keluar} ${esc(r.Satuan)}</td><td data-label="Nilai" class="num">${rp(r.Nilai)}</td><td data-label="Disiplin">${esc(r.Disiplin)}</td><td data-label="Ref.">${esc(r.Ref)}</td></tr>`).join('')) : '<div class="card2 empty">Belum ada pergerakan.</div>'));
  } catch (e) { fail(e); view(noAcc); }
}
function kForm() {
  const L = S.stk.stok.filter(x => x.Stok > 0);
  modal(`<div class="modal-header"><h3 class="m-0">Catat Barang Keluar</h3><button class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button></div><div class="modal-body">
    <label class="form-label" for="k_b">Barang</label><select id="k_b" class="form-select mb-2"><option value="">Pilih barang</option>${L.map((x, i) => `<option value="${i}">${esc(x.Barang)} (stok ${x.Stok} ${esc(x.Satuan)})</option>`).join('')}</select>
    <label class="form-label" for="k_q">Jumlah keluar</label><input id="k_q" type="number" min="0" step="any" class="form-control mb-2">
    <label class="form-label" for="k_d">Untuk disiplin / tim</label><select id="k_d" class="form-select mb-2"><option value="">Pilih</option>${DISIPLIN.map(d => `<option>${d}</option>`).join('')}</select>
    <label class="form-label" for="k_k">Keterangan</label><input id="k_k" class="form-control" maxlength="100"></div>
    <div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Batal</button><button class="btn-p" onclick="kSave(this)">Simpan</button></div>`);
  S.kl = L;
}
async function kSave(b) {
  const x = S.kl[+$('#k_b').value]; if (!x) { toast('Pilih barang dahulu.', true); return; }
  busy(b, true, 'Menyimpan...');
  try { await api('saveKeluar', S.token, { barang: x.Barang, satuan: x.Satuan, qty: $('#k_q').value, disiplin: $('#k_d').value, ket: $('#k_k').value }); toast('Barang keluar tercatat; biaya masuk ke disiplin terkait.'); hideModal(); pGudang(); } catch (e) { busy(b, false); fail(e); }
}

// ════════ Keuangan ════════
const FIN = ['Site Accounting', 'Site Engineer', 'Cost Control', 'Manajer Proyek', 'Staf Pengadaan', 'Admin'];
const BGT = ['Site Engineer', 'Cost Control', 'Manajer Proyek', 'Staf Pengadaan', 'Admin'];
const AKUN = ['Persediaan', 'PPN Masukan', 'Kas/Bank', 'Hutang Dagang', 'Biaya Proyek'];
const PB = { 'Belum dibayar': 'bd-er', 'Dibayar sebagian': 'bd-w', 'Sudah dibayar': 'bd-ok' };
const today = () => new Date().toISOString().slice(0, 10);
const days = d => Math.round((Date.parse(d) - Date.parse(today())) / 864e5);
const bar = (p, c) => `<div style="height:8px;background:var(--line);border-radius:99px"><div style="width:${Math.min(100, Math.max(0, p))}%;height:100%;background:${c || 'var(--pri)'};border-radius:99px"></div></div>`;
const inp = (id, l, t, v, x) => `<label class="form-label" for="${id}">${l}</label><input id="${id}" type="${t || 'text'}" class="form-control mb-2" value="${esc(v)}" ${x || ''}>`;
const mHead = t => `<div class="modal-header"><h3 class="m-0">${t}</h3><button class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button></div>`;

async function pKeu() {
  view(skel());
  try { const [d, k] = await Promise.all([api('listInvoices', S.token), api('getKeuangan', S.token)]); S.fin = { d, k }; await loadNotif(); drawKeu(); } catch (e) { fail(e); view(noAcc); }
}
function drawKeu() {
  const t = S.ft || 'tag', T = [['tag', 'Tagihan & Pembayaran'], ['jur', 'Jurnal & Buku Besar'], ['lap', 'Neraca & Laba Rugi'], ['ang', 'Anggaran vs Realisasi']];
  view(head('Keuangan', 'Faktur, pembayaran, jurnal otomatis, dan anggaran proyek.', '') +
    `<div class="bar" role="tablist">${T.map(x => `<button role="tab" aria-selected="${x[0] === t}" class="${x[0] === t ? 'btn-p' : 'btn-o'}" onclick="S.ft='${x[0]}';drawKeu()">${x[1]}</button>`).join('')}</div><div id="kb"></div>`);
  ({ tag: kTag, jur: kJur, lap: kLap, ang: kAng }[t])();
}
function kTag() {
  const inv = S.fin.d.inv, A = inv.filter(f => f.Sisa > 0.5), n7 = A.filter(f => days(f.JatuhTempo) >= 0 && days(f.JatuhTempo) <= 7), tl = A.filter(f => f.Telat), sm = (a, k) => a.reduce((s, f) => s + f[k], 0);
  const L = inv.slice().sort((a, b) => (a.Sisa > 0.5 ? 0 : 1) - (b.Sisa > 0.5 ? 0 : 1) || String(a.JatuhTempo).localeCompare(String(b.JatuhTempo)));
  S.exp = { name: 'tagihan', head: ['No Faktur', 'No PO', 'Supplier', 'Jatuh Tempo', 'Total', 'Dibayar', 'Sisa', 'Status'], rows: L.map(f => [f.NoFaktur, f.NoPO, f.Supplier, f.JatuhTempo, f.Total, f.Dibayar, f.Sisa, f.StatusBayar]) };
  $('#kb').innerHTML = notifKeu() + `<div class="grid4 mb-3">${kpi('Belum dibayar', rp(sm(A, 'Sisa')), 'wallet2', A.length + ' faktur')}${kpi('Lewat jatuh tempo', rp(sm(tl, 'Sisa')), 'exclamation-octagon', tl.length + ' faktur', 'err')}${kpi('Jatuh tempo ≤ 7 hari', n7.length + ' faktur', 'alarm', rp(sm(n7, 'Sisa')))}${kpi('Sudah dibayar', rp(sm(inv, 'Dibayar')), 'check2-circle', 'Seluruh faktur')}</div><div class="bar">${expBar()}</div>` +
    (L.length ? tbl(['Faktur / PO', 'Supplier', 'Jatuh tempo', 'Total', 'Sisa', 'Status', 'Pencocokan', 'Aksi'], L.map(f => { const d = days(f.JatuhTempo), open = f.Sisa > 0.5;
      return `<tr><td data-label="Faktur"><b class="pn">${esc(f.NoFaktur)}</b><small>${esc(f.NoPO)}</small></td><td data-label="Supplier">${esc(f.Supplier)}</td><td data-label="Jatuh tempo">${esc(f.JatuhTempo)}${open ? (d < 0 ? `<small style="color:var(--err)">Lewat ${-d} hari</small>` : d <= 7 ? `<small style="color:var(--warn)">H-${d}</small>` : '') : ''}</td><td data-label="Total" class="num">${rp(f.Total)}</td><td data-label="Sisa" class="num">${rp(f.Sisa)}</td><td data-label="Status"><span class="bd ${PB[f.StatusBayar]}">${f.StatusBayar}</span></td><td data-label="Cocok"><span class="bd ${f.Cocok === 'Ya' ? 'bd-ok' : 'bd-w'}">${f.Cocok === 'Ya' ? 'Cocok' : 'Selisih'}</span></td><td data-label="Aksi"><button class="ib" onclick="invDetail('${esc(f.ID)}')" aria-label="Lihat ${esc(f.NoFaktur)}"><i class="bi bi-eye"></i></button>${open && can(FIN) ? `<button class="ib" onclick="payForm('${esc(f.ID)}')" aria-label="Bayar ${esc(f.NoFaktur)}"><i class="bi bi-cash-coin"></i></button>` : ''}</td></tr>`; }).join('')) : '<div class="card2 empty">Belum ada faktur. Faktur dibuat oleh tim Pengadaan dari menu Pesanan (PO) setelah barang diterima gudang.</div>');
}
function fakForm(id) { // dipanggil dari modul PO
  const p = S.po.find(x => x.ID === id); if (!p) return;
  modal(mHead('Buat Faktur — ' + esc(p.NoPO)) + `<div class="modal-body"><p class="mut">${esc(p.Supplier)} · Nilai PO ${rp(p.Total)} · Nilai barang diterima ${rp(p.Diterima)}</p><input type="hidden" id="f_p" value="${esc(p.ID)}">
    ${inp('f_f', 'Nomor faktur', 'text', '', 'maxlength="50"')}${inp('f_t', 'Tanggal faktur', 'date', today())}${inp('f_n', 'Nilai faktur sebelum pajak (Rp)', 'number', p.Diterima || '', 'min="1"')}${inp('f_x', 'PPN (Rp, kosongkan bila tidak ada)', 'number', '', 'min="0"')}${inp('f_j', 'Tanggal jatuh tempo', 'date', '')}${inp('f_k', 'Keterangan', 'text', '', 'maxlength="200"')}<div id="fw"></div>
    <p class="mut mb-0">Setelah disimpan, faktur diteruskan ke tim Keuangan (notifikasi di aplikasi dan email).</p></div>
    <div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Batal</button><button class="btn-p" onclick="fakSave(false,this)">Simpan Faktur</button></div>`);
}
async function fakSave(lanjut, b) {
  busy(b, true, 'Memeriksa...');
  try { await api('saveInvoice', S.token, { poId: $('#f_p').value, noFaktur: $('#f_f').value, tanggal: $('#f_t').value, nilai: $('#f_n').value, ppn: $('#f_x').value, jatuhTempo: $('#f_j').value, ket: $('#f_k').value, lanjut }); toast('Faktur tersimpan dan diteruskan ke tim Keuangan.'); hideModal(); pPO(); }
  catch (e) {
    busy(b, false);
    if (/^SELISIH\|/.test(e.message)) { const [, a, p, c] = e.message.split('|'); $('#fw').innerHTML = `<div role="alert" style="border-left:5px solid var(--warn);background:var(--surf);padding:.75rem 1rem;border-radius:.6rem"><b>Peringatan selisih.</b> Faktur ${rp(a)} · PO ${rp(p)} · Barang diterima ${rp(c)}. Faktur tidak sama dengan PO dan penerimaan.<div class="mt-2"><button class="btn-d" onclick="fakSave(true,this)">Tetap simpan</button></div></div>`; } else fail(e);
  }
}
function invDetail(id) {
  const f = S.fin.d.inv.find(x => x.ID === id); if (!f) return; const P = S.fin.d.pay.filter(p => p.InvID === id);
  modal(mHead(esc(f.NoFaktur)) + `<div class="modal-body"><p class="mut">${esc(f.Supplier)} · ${esc(f.NoPO)} · tanggal ${esc(f.Tanggal)} · jatuh tempo ${esc(f.JatuhTempo)}</p><span class="bd ${PB[f.StatusBayar]}">${f.StatusBayar}</span>
    <h3 class="mt-3">Pencocokan otomatis</h3>${tbl(['Faktur', 'PO', 'Barang diterima', 'Hasil'], `<tr><td data-label="Faktur" class="num">${rp(f.Nilai)}</td><td data-label="PO" class="num">${rp(f.NilaiPO)}</td><td data-label="Diterima" class="num">${rp(f.NilaiDiterima)}</td><td data-label="Hasil"><span class="bd ${f.Cocok === 'Ya' ? 'bd-ok' : 'bd-w'}">${f.Cocok === 'Ya' ? 'Cocok' : 'Selisih'}</span></td></tr>`)}
    <p class="mt-2">PPN ${rp(f.PPN)} · <b>Total tagihan ${rp(f.Total)}</b> · Dibayar ${rp(f.Dibayar)} · <b>Sisa ${rp(f.Sisa)}</b></p>
    <h3>Pembayaran</h3>${P.length ? tbl(['Voucher', 'Tanggal', 'Jumlah', 'Metode', ''], P.map(p => `<tr><td data-label="Voucher">${esc(p.NoVoucher)}</td><td data-label="Tanggal">${esc(p.Tanggal)}</td><td data-label="Jumlah" class="num">${rp(p.Jumlah)}</td><td data-label="Metode">${esc(p.Metode)}</td><td data-label="Aksi"><button class="btn-o" onclick="voucher('${esc(p.ID)}')">Voucher</button></td></tr>`).join('')) : '<p class="mut">Belum ada pembayaran.</p>'}
    ${attBox('FAK', f.ID, can(FIN))}<p class="mut">Unggah bukti transfer pada lampiran di atas.</p></div><div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Tutup</button>${f.Sisa > 0.5 && can(FIN) ? `<button class="btn-p" onclick="payForm('${esc(f.ID)}')">Catat Pembayaran</button>` : ''}</div>`);
  loadAtt('FAK', f.ID);
}
function payForm(id) {
  const f = S.fin.d.inv.find(x => x.ID === id);
  modal(mHead('Catat Pembayaran') + `<div class="modal-body"><p class="mut">${esc(f.NoFaktur)} · ${esc(f.Supplier)} · sisa ${rp(f.Sisa)}</p>${inp('p_t', 'Tanggal pembayaran', 'date', today())}${inp('p_j', 'Jumlah dibayar (Rp)', 'number', Math.round(f.Sisa), 'min="1"')}
    <label class="form-label" for="p_m">Metode</label><select id="p_m" class="form-select mb-2"><option>Transfer</option><option>Tunai</option><option>Giro</option></select>${inp('p_k', 'Keterangan', 'text', '', 'maxlength="200"')}</div>
    <div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Batal</button><button class="btn-p" onclick="paySave('${esc(id)}',this)">Simpan Pembayaran</button></div>`);
}
async function paySave(id, b) {
  busy(b, true, 'Menyimpan...');
  try { const p = await api('savePayment', S.token, { invId: id, tanggal: $('#p_t').value, jumlah: $('#p_j').value, metode: $('#p_m').value, ket: $('#p_k').value }); toast('Pembayaran tercatat.'); hideModal(); await pKeu(); setTimeout(() => voucher(p.ID), 450); }
  catch (e) { busy(b, false); fail(e); }
}
function voucher(pid) {
  const p = S.fin.d.pay.find(x => x.ID === pid); if (!p) return;
  modal(mHead('Voucher Pembayaran') + `<div class="modal-body"><h2>${esc(p.NoVoucher)}</h2>${tbl(['Keterangan', 'Isi'], [['Tanggal', p.Tanggal], ['Dibayarkan kepada', p.Supplier], ['Untuk faktur', p.NoFaktur], ['Jumlah', rp(p.Jumlah)], ['Metode', p.Metode], ['Keterangan', p.Ket || '-'], ['Dibuat oleh', p.Dibuat]].map(r => `<tr><td data-label="Keterangan">${r[0]}</td><td data-label="Isi">${esc(r[1])}</td></tr>`).join(''))}<p class="mut mt-2">Lampirkan bukti transfer pada detail faktur.</p></div><div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Tutup</button><button class="btn-p" onclick="window.print()"><i class="bi bi-printer"></i> Cetak</button></div>`);
}
function kJur() {
  const J = S.fin.k.jurnal, a = S.fa || '', sal = {}; AKUN.forEach(x => sal[x] = [0, 0]);
  J.forEach(j => { sal[j.Akun] = sal[j.Akun] || [0, 0]; sal[j.Akun][0] += +j.Debit; sal[j.Akun][1] += +j.Kredit; });
  const L = J.filter(j => !a || j.Akun === a); S.exp = { name: 'jurnal', head: ['Tanggal', 'Referensi', 'Keterangan', 'Akun', 'Debit', 'Kredit'], rows: L.map(j => [j.Tanggal, j.Ref, j.Ket, j.Akun, j.Debit, j.Kredit]) };
  $('#kb').innerHTML = `<h3>Buku besar (ringkasan per akun)</h3>${tbl(['Akun', 'Debit', 'Kredit', 'Saldo (Debit − Kredit)'], Object.keys(sal).map(x => `<tr><td data-label="Akun">${esc(x)}</td><td data-label="Debit" class="num">${rp(sal[x][0])}</td><td data-label="Kredit" class="num">${rp(sal[x][1])}</td><td data-label="Saldo" class="num"><b>${rp(sal[x][0] - sal[x][1])}</b></td></tr>`).join(''))}
    <div class="bar mt-3"><label class="visually-hidden" for="fa">Akun</label><select id="fa" class="form-select" onchange="S.fa=this.value;kJur()"><option value="">Semua akun</option>${Object.keys(sal).map(x => `<option ${x === a ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>${expBar()}</div><h3>Jurnal otomatis</h3>` +
    (L.length ? tbl(['Tanggal', 'Referensi', 'Keterangan', 'Akun', 'Debit', 'Kredit'], L.map(j => `<tr><td data-label="Tanggal">${esc(j.Tanggal)}</td><td data-label="Ref.">${esc(j.Ref)}</td><td data-label="Keterangan">${esc(j.Ket)}</td><td data-label="Akun">${esc(j.Akun)}</td><td data-label="Debit" class="num">${j.Debit ? rp(j.Debit) : ''}</td><td data-label="Kredit" class="num">${j.Kredit ? rp(j.Kredit) : ''}</td></tr>`).join('')) : '<div class="card2 empty">Belum ada jurnal. Jurnal muncul otomatis saat barang diterima, faktur diverifikasi, pembayaran dicatat, atau barang dipakai.</div>');
}
function kLap() {
  const s = {}; S.fin.k.jurnal.forEach(j => s[j.Akun] = (s[j.Akun] || 0) + +j.Debit - +j.Kredit);
  const g = a => s[a] || 0, aset = g('Persediaan') + g('PPN Masukan') + g('Kas/Bank'), hut = -g('Hutang Dagang'), beban = g('Biaya Proyek');
  const r = (l, v, b) => `<tr><td data-label="Pos">${b ? '<b>' + l + '</b>' : l}</td><td data-label="Jumlah" class="num">${b ? '<b>' + rp(v) + '</b>' : rp(v)}</td></tr>`;
  S.exp = { name: 'neraca-labarugi', head: ['Pos', 'Jumlah'], rows: [['Persediaan', g('Persediaan')], ['PPN Masukan', g('PPN Masukan')], ['Kas/Bank', g('Kas/Bank')], ['Total aset', aset], ['Hutang Dagang', hut], ['Ekuitas (dihitung)', aset - hut], ['Biaya proyek', beban], ['Laba/(rugi)', -beban]] };
  $('#kb').innerHTML = `<div class="bar">${expBar()}</div><div class="row g-3"><div class="col-lg-6"><h3>Neraca ringkas</h3>${tbl(['Pos', 'Jumlah'], r('Persediaan', g('Persediaan')) + r('PPN Masukan', g('PPN Masukan')) + r('Kas/Bank (saldo)', g('Kas/Bank')) + r('Total aset', aset, 1) + r('Hutang Dagang', hut) + r('Ekuitas / pendanaan proyek (dihitung)', aset - hut) + r('Total kewajiban + ekuitas', aset, 1))}</div>
    <div class="col-lg-6"><h3>Laba rugi</h3>${tbl(['Pos', 'Jumlah'], r('Pendapatan', 0) + r('Biaya proyek (pemakaian barang)', beban) + r('Laba / (rugi)', -beban, 1))}</div></div><p class="mut mt-2">Catatan: pendanaan/modal dan pendapatan belum dicatat di aplikasi, sehingga ekuitas dihitung sebagai selisih aset dan hutang, dan laba rugi hanya memuat biaya pemakaian barang.</p>`;
}
function kAng() {
  const k = S.fin.k, ed = can(BGT), R = DISIPLIN.map(d => { const a = +((k.budget.find(b => b.Disiplin === d) || {}).Anggaran) || 0, kom = k.komit[d] || 0, pk = k.pakai[d] || 0, pct = a > 0 ? Math.round(kom / a * 100) : 0; return { d, a, kom, pk, pct, st: a <= 0 ? 'Belum ada anggaran' : kom > a ? 'Melampaui anggaran' : pct >= 80 ? 'Hampir habis' : 'Aman' }; });
  S.exp = { name: 'anggaran-vs-realisasi', head: ['Disiplin', 'Anggaran', 'Komitmen PO', 'Biaya terpakai', 'Sisa anggaran', '% terserap'], rows: R.map(x => [x.d, x.a, x.kom, x.pk, x.a - x.kom, x.pct]) };
  const bc = { 'Belum ada anggaran': 'bd-n', 'Melampaui anggaran': 'bd-er', 'Hampir habis': 'bd-w', Aman: 'bd-ok' };
  $('#kb').innerHTML = `<div class="bar">${expBar()}</div>` + tbl(['Disiplin', 'Anggaran', 'Komitmen PO', 'Biaya terpakai', 'Sisa anggaran', 'Terserap', 'Status', ''], R.map(x => `<tr><td data-label="Disiplin">${esc(x.d)}</td><td data-label="Anggaran" class="num">${rp(x.a)}</td><td data-label="Komitmen" class="num">${rp(x.kom)}</td><td data-label="Terpakai" class="num">${rp(x.pk)}</td><td data-label="Sisa" class="num">${rp(x.a - x.kom)}</td><td data-label="Terserap" style="min-width:110px">${x.pct}%${bar(x.pct, x.pct > 100 ? 'var(--err)' : '')}</td><td data-label="Status"><span class="bd ${bc[x.st]}">${x.st}</span></td><td data-label="Aksi">${ed ? `<button class="ib" onclick="aForm('${esc(x.d)}',${x.a})" aria-label="Atur anggaran ${esc(x.d)}"><i class="bi bi-pencil"></i></button>` : ''}</td></tr>`).join('')) + '<p class="mut mt-2">Komitmen = total PO aktif per disiplin; biaya terpakai = nilai barang yang sudah keluar gudang untuk disiplin tersebut.</p>';
}
function aForm(d, a) { modal(mHead('Anggaran ' + esc(d)) + `<div class="modal-body">${inp('a_n', 'Anggaran (Rp)', 'number', a || '', 'min="0"')}</div><div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Batal</button><button class="btn-p" onclick="aSave('${esc(d)}',this)">Simpan</button></div>`); }
async function aSave(d, b) { busy(b, true, 'Menyimpan...'); try { await api('saveBudget', S.token, { disiplin: d, anggaran: $('#a_n').value }); toast('Anggaran tersimpan.'); hideModal(); pKeu(); } catch (e) { busy(b, false); fail(e); } }

// ════════ Laporan ════════
async function pLap() {
  S.rf = S.rf || { dari: new Date().getFullYear() + '-01-01', sampai: today(), disiplin: '', kategori: '' };
  view(skel()); lapLoad();
}
async function lapLoad() { try { S.rep = await api('getReport', S.token, S.rf); drawLap(); } catch (e) { fail(e); view(noAcc); } }
function lapApply() { S.rf = { dari: $('#r_a').value, sampai: $('#r_b').value, disiplin: $('#r_d').value, kategori: $('#r_k').value }; view(skel()); lapLoad(); }
function expT(k) {
  const r = S.rep; S.exp = k === 'rinci' ? { name: 'rincian-pengadaan', head: ['No PO', 'Tanggal', 'Disiplin', 'Kategori', 'Barang', 'Jumlah', 'Satuan', 'Harga Satuan', 'Nilai', 'Supplier'], rows: r.rinci.map(x => [x[0], x[1], x[2], x[3], x[4], x[5], x[6], x[8], x[7], x[9]]) } : { name: 'analisis-supplier', head: ['Supplier', 'Jumlah PO', 'Nilai', 'Tepat waktu %', 'Kualitas %', 'Harga kompetitif %', 'Skor'], rows: r.sup.map(s => [s.Supplier, s.Jml, s.Nilai, s.Tepat, s.Kualitas, s.Harga, s.Skor]) };
  exportCSV();
}
function drawLap() {
  const r = S.rep, f = S.rf, tg = r.tag, pct = v => v === null ? '-' : v + '%', empty = '<p class="empty">Belum ada data pada filter ini.</p>';
  view(head('Laporan & Statistik Pengadaan', 'Pengadaan per disiplin, periode, kategori, performa supplier, dan ringkasan tagihan.', '<button class="btn-o" onclick="expT(\'rinci\')"><i class="bi bi-file-earmark-spreadsheet"></i> Ekspor Rincian</button><button class="btn-o" onclick="expT(\'sup\')"><i class="bi bi-file-earmark-spreadsheet"></i> Ekspor Supplier</button><button class="btn-o" onclick="window.print()"><i class="bi bi-printer"></i> Cetak / PDF</button>') +
    `<div class="card2 mb-3"><div class="row g-2 align-items-end"><div class="col-6 col-md-2"><label class="form-label" for="r_a">Dari</label><input id="r_a" type="date" class="form-control" value="${esc(f.dari)}"></div><div class="col-6 col-md-2"><label class="form-label" for="r_b">Sampai</label><input id="r_b" type="date" class="form-control" value="${esc(f.sampai)}"></div>
    <div class="col-6 col-md-3"><label class="form-label" for="r_d">Disiplin</label><select id="r_d" class="form-select"><option value="">Semua disiplin</option>${DISIPLIN.map(d => `<option ${d === f.disiplin ? 'selected' : ''}>${d}</option>`).join('')}</select></div><div class="col-6 col-md-3"><label class="form-label" for="r_k">Kategori</label><select id="r_k" class="form-select"><option value="">Semua kategori</option>${KATEGORI.map(d => `<option ${d === f.kategori ? 'selected' : ''}>${d}</option>`).join('')}</select></div><div class="col-12 col-md-2"><button class="btn-p w-100" onclick="lapApply()"><i class="bi bi-funnel"></i> Terapkan</button></div></div></div>
    <div class="grid4 mb-3">${kpi('Nilai pengadaan (PO)', rp(r.poNilai), 'cash-stack', r.poN + ' PO')}${kpi('Total tagihan', rp(tg.total), 'receipt', tg.n + ' faktur')}${kpi('Sisa tagihan', rp(tg.sisa), 'wallet2', 'Dibayar ' + rp(tg.dibayar))}${kpi('Lewat jatuh tempo', rp(tg.telatNilai), 'exclamation-octagon', tg.telatN + ' faktur', 'err')}</div>
    <div class="row g-3"><div class="col-lg-6"><div class="card2 h-100"><h3>Nilai PO per disiplin</h3>${Object.keys(r.perD).length ? '<canvas id="cD" role="img" aria-label="Grafik batang nilai PO per disiplin"></canvas>' : empty}</div></div><div class="col-lg-6"><div class="card2 h-100"><h3>Per kategori barang</h3>${Object.keys(r.perK).length ? '<canvas id="cK" role="img" aria-label="Grafik donat nilai per kategori"></canvas>' : empty}</div></div>
    <div class="col-12"><div class="card2"><h3>Tren per bulan</h3>${Object.keys(r.perB).length ? '<canvas id="cB" height="90" role="img" aria-label="Grafik tren nilai PO per bulan"></canvas>' : empty}</div></div></div>
    <h3 class="mt-4">Analisis supplier</h3>${r.sup.length ? tbl(['Supplier', 'PO', 'Nilai', 'Tepat waktu', 'Kualitas baik', 'Harga kompetitif', 'Skor'], r.sup.map(s => `<tr><td data-label="Supplier">${esc(s.Supplier)}</td><td data-label="PO" class="num">${s.Jml}</td><td data-label="Nilai" class="num">${rp(s.Nilai)}</td><td data-label="Tepat waktu" style="min-width:110px">${pct(s.Tepat)}${bar(s.Tepat || 0)}</td><td data-label="Kualitas" style="min-width:110px">${pct(s.Kualitas)}${bar(s.Kualitas || 0)}</td><td data-label="Harga" style="min-width:110px">${pct(s.Harga)}${bar(s.Harga || 0)}</td><td data-label="Skor"><b>${s.Skor === null ? '-' : '★ ' + s.Skor + '/5'}</b></td></tr>`).join('')) : '<div class="card2 empty">Belum ada data supplier.</div>'}
    <p class="mut mt-2">Tepat waktu: penerimaan pertama sebelum tanggal PO + lama kirim. Kualitas: porsi barang berkondisi baik. Harga: seberapa sering menjadi penawaran termurah.</p>
    <h3 class="mt-4">Rincian pengadaan</h3>${r.rinci.length ? tbl(['No. PO', 'Tanggal', 'Disiplin', 'Kategori', 'Barang', 'Jumlah', 'Harga Satuan', 'Nilai', 'Supplier'], r.rinci.slice(0, 100).map(x => `<tr><td data-label="No. PO">${esc(x[0])}</td><td data-label="Tanggal">${esc(x[1])}</td><td data-label="Disiplin">${esc(x[2])}</td><td data-label="Kategori">${esc(x[3])}</td><td data-label="Barang">${esc(x[4])}</td><td data-label="Jumlah" class="num">${esc(x[5])} ${esc(x[6])}</td><td data-label="Harga Satuan" class="num">${rp(x[8])}</td><td data-label="Nilai" class="num">${rp(x[7])}</td><td data-label="Supplier">${esc(x[9])}</td></tr>`).join('')) + (r.rinci.length > 100 ? `<p class="mut mt-2">Menampilkan 100 dari ${r.rinci.length} baris. Gunakan Ekspor Rincian untuk seluruh data.</p>` : '') : '<div class="card2 empty">Tidak ada pengadaan pada filter ini.</div>'}`);
  const cs = [], tx = getComputedStyle(document.documentElement).getPropertyValue('--tx').trim(), P = CPAL;
  const mk = (id, cfg) => { const c = $('#' + id); if (c) cs.push(new Chart(c, cfg)); }, ax = { y: { ticks: { color: tx, callback: v => 'Rp ' + Number(v).toLocaleString('id-ID') } }, x: { ticks: { color: tx } } }, tip = { callbacks: { label: c => ' ' + rp(c.raw) } };
  mk('cD', { type: 'bar', data: { labels: Object.keys(r.perD), datasets: [{ data: Object.values(r.perD), backgroundColor: Object.keys(r.perD).map((_, i) => CPAL[i % CPAL.length]), borderRadius: 6 }] }, options: { plugins: { legend: { display: false }, tooltip: tip }, scales: ax } });
  mk('cK', { type: 'doughnut', data: { labels: Object.keys(r.perK), datasets: [{ data: Object.values(r.perK), backgroundColor: P, borderWidth: 0 }] }, options: { plugins: { legend: { position: 'bottom', labels: { color: tx } }, tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + rp(c.raw) } } } } });
  const bs = Object.keys(r.perB).sort(); mk('cB', { type: 'bar', data: { labels: bs, datasets: [{ data: bs.map(k => r.perB[k]), backgroundColor: '#2F80ED', borderRadius: 6 }] }, options: { plugins: { legend: { display: false }, tooltip: tip }, scales: ax } });
  S.chart = { destroy() { cs.forEach(c => c.destroy()); } };
}

// ── Notifikasi (PO: barang sudah diterima GRN; Keuangan: faktur baru dari Pengadaan) ──
const warnBox = h => `<div role="status" class="card2 mb-3" style="border-left:5px solid var(--warn)">${h}</div>`;
const recvOK = p => ['Diterima', 'Diterima Sebagian'].includes(p.Status) && !p.NoFaktur && can(MASTER_ROLES);
const fakBadge = p => p.NoFaktur ? ' <span class="bd bd-ok">Faktur ' + esc(p.NoFaktur) + '</span>' : (['Diterima', 'Diterima Sebagian'].includes(p.Status) ? ' <span class="bd bd-w">Belum difaktur</span>' : '');
const fakBtn = (p, txt) => !recvOK(p) ? '' : txt ? `<button class="btn-p" onclick="fakForm('${esc(p.ID)}')"><i class="bi bi-receipt"></i> Buat Faktur</button>` : `<button class="ib" onclick="fakForm('${esc(p.ID)}')" aria-label="Buat faktur ${esc(p.NoPO)}" title="Buat faktur"><i class="bi bi-receipt"></i></button>`;
async function loadNotif() { try { S.notif = await api('getNotif', S.token); } catch (e) { S.notif = S.notif || { poFaktur: [], fakturBaru: [] }; } updateBell(); }
function updateBell() {
  const n = Object.assign({ poFaktur: [], fakturBaru: [] }, S.notif || {}), tot = (S.nt || 0) + n.poFaktur.length + n.fakturBaru.length, b = $('#bellN');
  if (b) { b.textContent = tot; b.hidden = !tot; }
  [['po', n.poFaktur.length], ['keuangan', n.fakturBaru.length]].forEach(([p, c]) => { const el = document.querySelector('.nv[data-p="' + p + '"]'); if (!el) return; const o = el.querySelector('.nb'); if (o) o.remove(); if (c) el.insertAdjacentHTML('beforeend', '<b class="nb" aria-label="' + c + ' notifikasi">' + c + '</b>'); });
}
function showNotif() {
  const n = Object.assign({ poFaktur: [], fakturBaru: [] }, S.notif || {}), L = [], it = (ic, t, pg) => `<button class="nv" style="color:var(--tx)" onclick="hideModal();go('${pg}')"><i class="bi bi-${ic}"></i>${t}</button>`;
  if (S.nt) L.push(it('hourglass-split', S.nt + ' PR menunggu persetujuan Anda', 'dashboard'));
  if (n.poFaktur.length) L.push(it('receipt', n.poFaktur.length + ' PO sudah diterima gudang dan belum difaktur', 'po'));
  if (n.fakturBaru.length) L.push(it('cash-coin', n.fakturBaru.length + ' faktur baru dari tim Pengadaan menunggu diproses', 'keuangan'));
  modal(mHead('Notifikasi') + `<div class="modal-body">${L.length ? L.join('') : '<p class="mut m-0">Tidak ada notifikasi baru.</p>'}</div>`);
}
function notifPO() {
  const L = (S.notif && S.notif.poFaktur) || []; if (!L.length || !can(MASTER_ROLES)) return '';
  return warnBox(`<b><i class="bi bi-bell"></i> ${L.length} PO sudah diterima gudang (GRN) dan belum difaktur</b><div class="mt-2 d-flex flex-column gap-2">${L.map(x => `<div class="d-flex justify-content-between align-items-center gap-2 flex-wrap"><span>${esc(x.NoPO)} · ${esc(x.Supplier)} <span class="bd bd-w">${esc(x.Status)}</span></span><button class="btn-p" onclick="fakForm('${esc(x.ID)}')"><i class="bi bi-receipt"></i> Buat Faktur</button></div>`).join('')}</div><small class="d-block mt-2">Setelah faktur dibuat, tim Keuangan menerima notifikasi untuk memprosesnya.</small>`);
}
function notifKeu() {
  const L = (S.notif && S.notif.fakturBaru) || []; if (!L.length) return '';
  return warnBox(`<b><i class="bi bi-bell"></i> ${L.length} faktur baru dari tim Pengadaan menunggu diproses</b><div class="mt-2 d-flex flex-column gap-2">${L.slice(0, 5).map(x => `<div class="d-flex justify-content-between align-items-center gap-2 flex-wrap"><span>${esc(x.NoFaktur)} · ${esc(x.Supplier)} · ${rp(x.Total)} · jatuh tempo ${esc(x.JatuhTempo)} <small>(dibuat ${esc(x.Dibuat)})</small></span><button class="btn-o" onclick="invDetail('${esc(x.ID)}')">Lihat</button></div>`).join('')}</div>${L.length > 5 ? `<small class="d-block mt-2">+ ${L.length - 5} faktur lainnya</small>` : ''}`);
}

// ── Grafik berwarna & line chart (dashboard + laporan) — fungsi lama dibungkus, tidak diubah ──
const CPAL = ['#6B8E23', '#2F80ED', '#F59E0B', '#E4572E', '#8B5CF6', '#14B8A6', '#EC4899', '#64748B', '#84CC16'];
const STC = { Draft: '#94A3B8', Diajukan: '#F59E0B', Disetujui: '#6B8E23', Diproses: '#2F80ED', Diterima: '#14B8A6', Ditolak: '#E4572E' }; // warna status PR
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const mlabel = k => MON[+String(k).slice(5, 7) - 1] + ' ' + String(k).slice(2, 4);
const rpShort = v => Math.abs(v) >= 1e9 ? (v / 1e9).toFixed(1).replace('.', ',') + ' M' : Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' jt' : Number(v).toLocaleString('id-ID');
const RM = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const cbase = () => { const st = getComputedStyle(document.documentElement); return { tx: st.getPropertyValue('--tx2').trim() || '#5b6148', ln: st.getPropertyValue('--line').trim() || '#c4c9b4', anim: RM ? false : { duration: 700 } }; };
const areaFill = (ctx, c) => { const a = ctx.chart.chartArea; if (!a) return c + '22'; const g = ctx.chart.ctx.createLinearGradient(0, a.top, 0, a.bottom); g.addColorStop(0, c + '55'); g.addColorStop(1, c + '05'); return g; };
const lineDs = (label, data, c) => ({ label, data, borderColor: c, borderWidth: 2.5, tension: .35, pointRadius: 3, pointHoverRadius: 6, pointBackgroundColor: c, fill: true, backgroundColor: ctx => areaFill(ctx, c) });
const axes = (b, money) => ({ x: { ticks: { color: b.tx }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: b.tx, precision: 0, callback: v => money ? 'Rp ' + rpShort(v) : v }, grid: { color: b.ln } } });
const lineOpt = (b, money) => ({ animation: b.anim, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { color: b.tx, usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: c => ' ' + c.dataset.label + ': ' + (money ? rp(c.raw) : c.raw) } } }, scales: axes(b, money) });
const chainChart = c => { const prev = S.chart; S.chart = { destroy() { if (prev && prev.destroy) prev.destroy(); try { c.destroy(); } catch (e) {} } }; };
const mkc = (id, cfg) => { const el = $('#' + id); if (el) chainChart(new Chart(el, cfg)); };
const has = a => (a || []).some(v => v > 0);
const gcard = (cls, t, id, lbl, ok, h) => `<div class="${cls}"><div class="card2 h-100"><h3>${t}</h3>${ok ? `<canvas id="${id}" height="${h || 130}" role="img" aria-label="${lbl}"></canvas>` : '<p class="empty">Belum ada data.</p>'}</div></div>`;

async function dashCharts() {
  const c = $('#app-container'); if (S.page !== 'dashboard' || !String(c.innerHTML).includes('Dashboard Pengadaan')) return;
  let d; try { d = await api('getChartData', S.token); } catch (e) { return; }
  if (S.page !== 'dashboard') return;
  const b = cbase(), L = d.bulan.map(mlabel), st = Object.keys(d.status), sup = d.supplier || [];
  c.insertAdjacentHTML('beforeend', `<div class="hd mt-4 mb-2"><div><h2 style="font-size:20px">Grafik Analitik</h2><p class="mut m-0">12 bulan terakhir</p></div></div><div class="row g-3">
    ${d.fin ? gcard('col-lg-8', 'Tren nilai per bulan', 'dgA', 'Grafik garis komitmen PO, barang diterima, dan pembayaran per bulan', has(d.komitmen) || has(d.diterima) || has(d.dibayar), 120) : ''}
    ${gcard(d.fin ? 'col-lg-4' : 'col-12', 'Status PR', 'dgB', 'Grafik donat jumlah PR menurut status', st.length > 0, 200)}
    ${gcard(d.fin ? 'col-lg-6' : 'col-12', 'Dokumen per bulan', 'dgC', 'Grafik garis jumlah PR dibuat dan PO terbit per bulan', has(d.prN) || has(d.poN), 130)}
    ${d.fin ? gcard('col-lg-6', 'Top 5 supplier (nilai PO)', 'dgD', 'Grafik batang lima supplier dengan nilai PO terbesar', sup.length > 0, 130) : ''}</div>`);
  if (d.fin) mkc('dgA', { type: 'line', data: { labels: L, datasets: [lineDs('Komitmen PO', d.komitmen, '#2F80ED'), lineDs('Diterima gudang', d.diterima, '#6B8E23'), lineDs('Dibayar', d.dibayar, '#F59E0B')] }, options: lineOpt(b, true) });
  mkc('dgB', { type: 'doughnut', data: { labels: st, datasets: [{ data: st.map(k => d.status[k]), backgroundColor: st.map(k => STC[k] || '#64748B'), borderWidth: 0 }] }, options: { animation: b.anim, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { color: b.tx, usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: x => ' ' + x.label + ': ' + x.raw + ' PR' } } } } });
  mkc('dgC', { type: 'line', data: { labels: L, datasets: [lineDs('PR dibuat', d.prN, '#8B5CF6')].concat(d.fin ? [lineDs('PO terbit', d.poN, '#EC4899')] : []) }, options: lineOpt(b, false) });
  if (d.fin) mkc('dgD', { type: 'bar', data: { labels: sup.map(x => x.nama), datasets: [{ data: sup.map(x => x.nilai), backgroundColor: sup.map((_, i) => CPAL[(i + 1) % CPAL.length]), borderRadius: 6 }] }, options: { indexAxis: 'y', animation: b.anim, plugins: { legend: { display: false }, tooltip: { callbacks: { label: x => ' ' + rp(x.raw) } } }, scales: { x: { ticks: { color: b.tx, callback: v => 'Rp ' + rpShort(v) }, grid: { color: b.ln } }, y: { ticks: { color: b.tx }, grid: { display: false } } } } });
}
function lapLine() { // line chart akumulasi nilai PO, memakai data laporan yang sudah dimuat
  const r = S.rep, el = $('#cB'); if (!r || !el || !el.closest) return;
  const ks = Object.keys(r.perB).sort(); if (!ks.length) return;
  let acc = 0; const per = ks.map(k => r.perB[k]), cum = per.map(v => acc += v), col = el.closest('.col-12'); if (!col) return;
  col.insertAdjacentHTML('afterend', '<div class="col-12"><div class="card2"><h3>Akumulasi nilai PO (line chart)</h3><canvas id="cL" height="90" role="img" aria-label="Grafik garis nilai PO per bulan dan akumulasinya"></canvas></div></div>');
  const b = cbase(); mkc('cL', { type: 'line', data: { labels: ks.map(mlabel), datasets: [lineDs('Per bulan', per, '#2F80ED'), lineDs('Akumulasi', cum, '#F59E0B')] }, options: lineOpt(b, true) });
}
const _pDash0 = pDash; pDash = async function () { api('getChartData', S.token).catch(() => {}); await _pDash0(); try { await dashCharts(); } catch (e) {} };
const _drawLap0 = drawLap; drawLap = function () { _drawLap0(); try { lapLine(); } catch (e) {} };

// ── Revisi item & harga: PR (menunggu persetujuan) dan PO (menunggu validasi) ──
const canRevisi = r => r.Status === 'Diajukan' && (r.EmailPengaju === S.user.email || can(MASTER_ROLES));
const canRevPO = p => p.Status === 'Menunggu Validasi' && can(MASTER_ROLES);
const revBtn = (r, txt) => !canRevisi(r) ? '' : txt ? `<button class="btn-o" onclick="prRevisi('${esc(r.ID)}')"><i class="bi bi-pencil-square"></i> Revisi Item &amp; Harga</button>` : `<button class="ib" onclick="prRevisi('${esc(r.ID)}')" aria-label="Revisi item dan harga ${esc(r.NoPR)}" title="Revisi item &amp; harga"><i class="bi bi-pencil-square"></i></button>`;
const revPOBtn = (p, txt) => !canRevPO(p) ? '' : txt ? `<button class="btn-o" onclick="poRevisi('${esc(p.ID)}')"><i class="bi bi-pencil-square"></i> Revisi Item &amp; Harga</button>` : `<button class="ib" onclick="poRevisi('${esc(p.ID)}')" aria-label="Revisi item dan harga ${esc(p.NoPO)}" title="Revisi item &amp; harga"><i class="bi bi-pencil-square"></i></button>`;
const rowRev = (i, ph) => `<div class="row g-2 mb-2 rv-r" data-k="${esc(i.ket)}"><div class="col-12 col-md-4"><input class="form-control f-n" list="dl" placeholder="Nama barang" aria-label="Nama barang" value="${esc(i.nama)}"></div>
  <div class="col-4 col-md-2"><input class="form-control f-q" type="number" min="0.01" step="any" placeholder="Jumlah" aria-label="Jumlah" value="${esc(i.qty)}" oninput="revTotal()"></div>
  <div class="col-4 col-md-2"><input class="form-control f-s" placeholder="Satuan" aria-label="Satuan" value="${esc(i.satuan)}"></div>
  <div class="col-4 col-md-3"><input class="form-control f-h" type="number" min="0" step="any" placeholder="${ph}" aria-label="${ph}" value="${esc(i.harga || '')}" oninput="revTotal()"></div>
  <div class="col-12 col-md-1 text-end"><button type="button" class="ib" onclick="this.closest('.rv-r').remove();revTotal()" aria-label="Hapus baris"><i class="bi bi-trash"></i></button></div></div>`;
const collectRev = () => [...document.querySelectorAll('.rv-r')].map(x => ({ nama: $('.f-n', x).value, qty: $('.f-q', x).value, satuan: $('.f-s', x).value, harga: $('.f-h', x).value, ket: x.dataset.k || '' }));
function revTotal() { const t = collectRev().reduce((s, i) => s + (+i.qty || 0) * (+i.harga || 0), 0), e = $('#rvT'); if (e) e.textContent = rp(Math.round(t)); }
const poUnit = p => { const it = JSON.parse(p.Items || '[]'), est = it.reduce((s, i) => s + i.qty * i.harga, 0), tq = it.reduce((s, i) => s + i.qty, 0); return it.map(i => Object.assign({}, i, { harga: Math.round((est > 0 ? i.harga * (+p.Total / est) : +p.Total / tq) * 10000) / 10000 })); }; // harga satuan efektif PO
async function revLoadItems() { try { S.items = S.items || await api('listMaster', S.token, 'Items'); } catch (e) { S.items = S.items || []; } }
async function prRevisi(id) {
  const r = S.pr.find(x => x.ID === id); if (!r) return; await revLoadItems();
  modal(mHead('Revisi ' + esc(r.NoPR)) + `<div class="modal-body"><p class="mut">PR sedang menunggu persetujuan level ${esc(r.Level)} (${esc(CHAIN[r.Level - 1])}). Setelah direvisi, <b>persetujuan diulang dari level 1</b> (${esc(CHAIN[0])}).</p>
    <label class="form-label" for="rv_d">Disiplin</label><select id="rv_d" class="form-select mb-3">${DISIPLIN.map(d => `<option ${r.Disiplin === d ? 'selected' : ''}>${d}</option>`).join('')}</select>
    <datalist id="dl">${(S.items || []).map(i => `<option value="${esc(i.Nama)}">`).join('')}</datalist><div id="rows">${JSON.parse(r.Items || '[]').map(i => rowRev(i, 'Harga estimasi')).join('')}</div>
    <button type="button" class="btn-o" onclick="$('#rows').insertAdjacentHTML('beforeend',rowRev({},'Harga estimasi'))"><i class="bi bi-plus"></i> Tambah barang</button>
    <p class="mt-3 mb-0"><b>Estimasi total: <span id="rvT">${rp(r.Estimasi)}</span></b> <small class="mut">(sebelumnya ${rp(r.Estimasi)})</small></p></div>
    <div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Batal</button><button class="btn-p" onclick="sendRevPR('${esc(r.ID)}',this)">Simpan Revisi</button></div>`);
}
async function sendRevPR(id, b) {
  busy(b, true, 'Menyimpan...');
  try { await api('revisiPR', S.token, { ID: id, disiplin: $('#rv_d').value, items: collectRev() }); toast('PR direvisi; persetujuan diulang dari level 1.'); hideModal(); go(S.page === 'dashboard' ? 'pr' : S.page); }
  catch (e) { busy(b, false); fail(e); }
}
async function poRevisi(id) {
  const p = S.po.find(x => x.ID === id); if (!p) return; await revLoadItems();
  modal(mHead('Revisi ' + esc(p.NoPO)) + `<div class="modal-body"><p class="mut">${esc(p.Supplier)} · PO menunggu validasi. Total PO dihitung ulang dari jumlah × harga satuan. Setelah disimpan, PO tetap menunggu validasi Manajer Proyek.</p>
    <datalist id="dl">${(S.items || []).map(i => `<option value="${esc(i.Nama)}">`).join('')}</datalist><div id="rows">${poUnit(p).map(i => rowRev(i, 'Harga satuan (Rp)')).join('')}</div>
    <button type="button" class="btn-o" onclick="$('#rows').insertAdjacentHTML('beforeend',rowRev({},'Harga satuan (Rp)'))"><i class="bi bi-plus"></i> Tambah barang</button>
    <p class="mt-3 mb-0"><b>Total PO baru: <span id="rvT">${rp(p.Total)}</span></b> <small class="mut">(sebelumnya ${rp(p.Total)})</small></p></div>
    <div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Batal</button><button class="btn-p" onclick="sendRevPO('${esc(p.ID)}',this)">Simpan Revisi</button></div>`);
}
async function sendRevPO(id, b) {
  busy(b, true, 'Menyimpan...');
  try { await api('revisiPO', S.token, { ID: id, items: collectRev() }); toast('PO direvisi dan tetap menunggu validasi.'); hideModal(); pPO(); }
  catch (e) { busy(b, false); fail(e); }
}

// ── Acuan harga supplier: form PR (barang -> satuan & harga est.) dan form Penawaran (supplier -> total & syarat) ──
// Dipasang sebagai lapisan tambahan di atas prForm/prRevisi/qForm; fungsi aslinya tidak diubah.
async function loadRef() {
  if (S.ref && Date.now() - S.refT < 60000) return S.ref;
  try { const r = await api('getAcuanHarga', S.token); S.ref = { harga: Array.isArray(r && r.harga) ? r.harga : [], syarat: (r && r.syarat) || {} }; } catch (e) { S.ref = S.ref || { harga: [], syarat: {} }; }
  S.refT = Date.now(); return S.ref;
}
const tglPendek = t => { const m = String(t || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? +m[3] + ' ' + MON[+m[2] - 1] + ' ' + m[1].slice(2) : ''; };
const refFor = nama => { const k = String(nama || '').trim().toLowerCase(), seen = {}, out = []; ((S.ref && S.ref.harga) || []).forEach(x => { if (String(x.n).toLowerCase() !== k || seen[x.sup]) return; seen[x.sup] = 1; out.push(x); }); return out; }; // harga terakhir per supplier
const putAuto = (el, v) => { el.value = v; el.dataset.auto = '1'; el.dispatchEvent(new Event('input', { bubbles: true })); }; // isian otomatis (boleh ditimpa saat barang/supplier berganti)
function suggestRow(row) {
  const fn = row.querySelector('.f-n'), sat = row.querySelector('.f-s'), hg = row.querySelector('.f-h'), old = row.querySelector('.rf-chips'), free = el => !el.value || el.dataset.auto === '1';
  if (old) old.remove();
  const nama = fn ? fn.value.trim() : ''; if (!nama) return;
  const H = refFor(nama), m = (S.items || []).find(i => String(i.Nama).toLowerCase() === nama.toLowerCase());
  const sOpts = [...new Set(H.map(x => x.s).concat(m && m.Satuan ? [m.Satuan] : []).filter(Boolean))];
  if (!H.length && !sOpts.length) { [sat, hg].forEach(el => { if (el.dataset.auto === '1') { el.value = ''; el.dataset.auto = ''; } }); return; } // nama berganti & tidak dikenal: bersihkan isian otomatis sebelumnya
  if (sOpts.length && free(sat)) putAuto(sat, sOpts[0]);
  if (H.length && free(hg)) putAuto(hg, H[0].h); // default: harga terbaru
  const uid = S.rfN = (S.rfN || 0) + 1, min = Math.min.apply(null, H.map(x => x.h));
  row.insertAdjacentHTML('beforeend', `<div class="col-12 rf-chips">${H.length ? '<small class="mut">Acuan harga supplier (klik untuk memakai):</small> ' : ''}${H.map(x => `<button type="button" class="btn-o rf-c" style="min-height:34px;padding:0 .7rem;font-size:12px" data-h="${esc(x.h)}" data-s="${esc(x.s)}">${esc(x.sup)} · ${rp(x.h)}/${esc(x.s)} · ${tglPendek(x.t)}${x.h === min && H.length > 1 ? ' · termurah' : ''}</button>`).join(' ')}${sOpts.length ? `<datalist id="ds${uid}">${sOpts.map(o => `<option value="${esc(o)}">`).join('')}</datalist>` : ''}</div>`);
  if (sOpts.length) sat.setAttribute('list', 'ds' + uid); // pilihan satuan
}
async function hookRef() {
  const box = $('#rows'); if (!box || box.dataset.rf) return; box.dataset.rf = '1';
  box.addEventListener('input', e => { const t = e.target, row = t.closest && t.closest('.pr-r, .rv-r'); if (!row) return; if (t.classList.contains('f-n')) suggestRow(row); else if (e.isTrusted && (t.classList.contains('f-h') || t.classList.contains('f-s'))) t.dataset.auto = ''; });
  box.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.rf-c'); if (!b) return; const row = b.closest('.pr-r, .rv-r'); putAuto(row.querySelector('.f-h'), b.dataset.h); putAuto(row.querySelector('.f-s'), b.dataset.s); });
  const ref = await loadRef(), dl = $('#dl'); // nama barang dari riwayat PO ikut jadi pilihan
  if (dl) { const have = new Set((S.items || []).map(i => String(i.Nama).toLowerCase())), add = [...new Set(ref.harga.map(x => x.n))].filter(n => !have.has(String(n).toLowerCase())); dl.insertAdjacentHTML('beforeend', add.map(n => `<option value="${esc(n)}">`).join('')); }
}
const _prForm1 = prForm; prForm = async function (id) { await _prForm1(id); try { await hookRef(); } catch (e) {} };
const _prRevisi1 = prRevisi; prRevisi = async function (id) { await _prRevisi1(id); try { await hookRef(); } catch (e) {} };

// Form Penawaran: pilih supplier -> total (qty PR x harga terakhir supplier) & syarat pembayaran terisi otomatis
const _qForm1 = qForm; qForm = function () { _qForm1(); try { hookQuote(); } catch (e) {} };
function hookQuote() {
  const sel = $('#q_s'), t = $('#q_t'), y = $('#q_y'); if (!sel || !t || !y) return;
  t.insertAdjacentHTML('afterend', '<small id="q_i" class="d-block mut mb-2" aria-live="polite"></small>');
  y.insertAdjacentHTML('afterend', '<datalist id="dq_y"></datalist>'); y.setAttribute('list', 'dq_y');
  [t, y].forEach(el => el.addEventListener('input', e => { if (e.isTrusted) el.dataset.auto = ''; }));
  sel.addEventListener('change', () => fillQuote(sel.value));
}
async function fillQuote(sup) {
  const t = $('#q_t'), y = $('#q_y'), info = $('#q_i'), dl = $('#dq_y'); if (!t || !y) return;
  const free = el => !el.value || el.dataset.auto === '1';
  if (!sup) { if (free(t)) t.value = ''; if (free(y)) y.value = ''; info.textContent = ''; dl.innerHTML = ''; return; }
  const ref = await loadRef(); if ($('#q_s') && $('#q_s').value !== sup) return; // pengguna sudah ganti supplier lagi
  const pr = (S.pr || []).find(r => r.ID === $('#bp').value), m = (S.sup || []).find(x => x.Nama === sup);
  const sy = (ref.syarat && ref.syarat[sup]) || (m && m.SyaratBayar ? [m.SyaratBayar] : []);
  dl.innerHTML = sy.map(v => `<option value="${esc(v)}">`).join(''); // pilihan syarat bayar milik supplier terpilih
  if (sy.length && free(y)) { y.value = sy[0]; y.dataset.auto = '1'; }
  const items = pr ? JSON.parse(pr.Items || '[]') : [], H = ref.harga.filter(x => x.sup === sup); let hit = 0, miss = 0, tot = 0;
  items.forEach(it => { const p = H.find(x => String(x.n).toLowerCase() === String(it.nama).toLowerCase()); if (p) { hit++; tot += it.qty * p.h; } else { miss++; tot += it.qty * (+it.harga || 0); } });
  tot = Math.round(tot);
  if (tot > 0 && free(t)) { t.value = tot; t.dataset.auto = '1'; }
  info.textContent = tot <= 0 ? 'Belum ada riwayat harga supplier ini; isi total sesuai penawaran.' : hit ? `Total dihitung otomatis: ${hit} dari ${items.length} barang memakai harga terakhir ${sup}` + (miss ? `, ${miss} barang memakai harga estimasi PR` : '') + '. Sesuaikan dengan penawaran sebenarnya.' : 'Supplier ini belum punya riwayat harga; total memakai harga estimasi PR. Sesuaikan dengan penawaran sebenarnya.';
}

// ── Impor Excel: Data Induk, PR/PO lama, ubah nomor PR/PO ──
const imN = v => String(v == null ? '' : v).toLowerCase().replace(/[^a-z0-9]/g, '');
const imNum = v => { if (v === '' || v == null) return ''; if (typeof v === 'number') return v; let s = String(v).trim().replace(/^Rp\.?\s*/i, '').replace(/\s/g, ''); if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(',', '.'); return /^-?\d*\.?\d+$/.test(s) ? parseFloat(s) : String(v); };
const imDate = v => { // -> yyyy-mm-dd (teks dd/mm/yyyy dibaca hari-bulan-tahun)
  if (v === '' || v == null) return ''; const p2 = n => ('0' + n).slice(-2); let d;
  if (typeof v === 'number') d = new Date(Math.round((v - 25569) * 864e5));
  else if (v instanceof Date) d = new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  else { const s = String(v).trim(); let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/); if (m) return m[1] + '-' + p2(m[2]) + '-' + p2(m[3]); m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/); if (m) return m[3] + '-' + p2(m[2]) + '-' + p2(m[1]); return s; }
  return isNaN(d) ? String(v) : d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate());
};
const IMP = {
  Items: { tab: 'Barang/Jasa', t: 'Data Induk: Barang/Jasa', fn: 'master', cols: [
    { k: 'Nama', l: 'Nama Barang/Jasa', r: 1, a: ['nama', 'namabarang', 'barang', 'namabarangjasa', 'item', 'namaitem'] }, { k: 'Spesifikasi', l: 'Spesifikasi', a: ['spesifikasi', 'spek', 'spec'] },
    { k: 'Disiplin', l: 'Disiplin', r: 1, a: ['disiplin'] }, { k: 'Kategori', l: 'Kategori', r: 1, a: ['kategori'] }, { k: 'Satuan', l: 'Satuan', r: 1, a: ['satuan', 'sat', 'unit'] }],
    ex: [['Semen Portland Tiga Roda', '50 kg/sak', 'Sipil', 'Material Utama', 'sak'], ['Kabel NYY 4x10mm', 'SNI', 'Elektrikal', 'Material Utama', 'Roll']],
    note: 'Disiplin: ' + DISIPLIN.join(', ') + '. Kategori: ' + KATEGORI.join(', ') + '. Nama yang sudah ada akan diperbarui (kolom yang kosong di Excel tidak menghapus data lama).' },
  Suppliers: { tab: 'Supplier', t: 'Data Induk: Supplier', fn: 'master', num: ['Rating'], cols: [
    { k: 'Nama', l: 'Nama Supplier', r: 1, a: ['nama', 'namasupplier', 'supplier', 'vendor', 'namavendor'] }, { k: 'Alamat', l: 'Alamat', a: ['alamat'] }, { k: 'Kontak', l: 'Kontak', a: ['kontak', 'telepon', 'telp', 'hp', 'wa', 'whatsapp'] },
    { k: 'NPWP', l: 'NPWP', a: ['npwp'] }, { k: 'SyaratBayar', l: 'Syarat Pembayaran', a: ['syaratpembayaran', 'syaratbayar', 'top', 'termin'] }, { k: 'Rating', l: 'Rating (0-5)', a: ['rating', 'rating05', 'nilai'] }],
    ex: [['PT Sinar Jaya Abadi', 'Jl. Industri No. 1', '081200000001', '00.000.000.0-000.000', 'TOP 30 Hari', 4.5]], note: 'Nama yang sudah ada akan diperbarui; Kontak sebaiknya nomor HP/WhatsApp (dipakai untuk kirim PO).' },
  PR: { tab: 'PR Lama', t: 'PR lama (satu baris = satu barang)', fn: 'dok', date: ['Tanggal'], num: ['Jumlah', 'Harga'], cols: [
    { k: 'No', l: 'No. PR', r: 1, a: ['nopr', 'nomorpr', 'nodokumen', 'nomor', 'no'] }, { k: 'Tanggal', l: 'Tanggal', r: 1, a: ['tanggal', 'tgl'] }, { k: 'Disiplin', l: 'Disiplin', r: 1, a: ['disiplin'] },
    { k: 'Barang', l: 'Nama Barang', r: 1, a: ['namabarang', 'barang', 'item', 'uraian'] }, { k: 'Jumlah', l: 'Jumlah', r: 1, a: ['jumlah', 'qty', 'volume', 'vol'] }, { k: 'Satuan', l: 'Satuan', r: 1, a: ['satuan', 'sat'] },
    { k: 'Harga', l: 'Harga Satuan', a: ['hargasatuan', 'harga', 'hargaest', 'hargaestimasi'] }, { k: 'Ket', l: 'Keterangan', a: ['keterangan', 'ket', 'catatan'] }, { k: 'Pengaju', l: 'Pengaju', a: ['pengaju', 'pemohon'] }, { k: 'Status', l: 'Status', a: ['status'] }],
    ex: [['00049/BAHAN/NKINFRA1/SPAMSUMBAR/09/2026', '26/09/2026', 'Sipil', 'Pipa Rucika Black PE-100 PN10', 100, 'Btg', 250000, 'Jaringan A', 'Rian Pratama', 'Arsip'], ['00049/BAHAN/NKINFRA1/SPAMSUMBAR/09/2026', '26/09/2026', 'Sipil', 'Elbow 90 PE-100', 20, 'Pcs', 15000, '', '', '']],
    note: 'Baris dengan No. PR sama digabung menjadi satu PR. Nomor ditulis persis seperti aslinya. Status: Arsip (default; hanya acuan/riwayat) atau Disetujui (siap dibuatkan PO). Nomor yang sudah ada dilewati.' },
  PO: { tab: 'PO Lama', t: 'PO lama (satu baris = satu barang)', fn: 'dok', date: ['Tanggal'], num: ['Jumlah', 'Harga', 'LeadTime'], cols: [
    { k: 'No', l: 'No. PO', r: 1, a: ['nopo', 'nomorpo', 'nodokumen', 'nomor', 'no'] }, { k: 'Tanggal', l: 'Tanggal', r: 1, a: ['tanggal', 'tgl'] }, { k: 'Supplier', l: 'Supplier', r: 1, a: ['supplier', 'vendor', 'namasupplier'] },
    { k: 'Disiplin', l: 'Disiplin', r: 1, a: ['disiplin'] }, { k: 'NoPR', l: 'No. PR', a: ['nopr', 'nomorpr'] }, { k: 'Barang', l: 'Nama Barang', r: 1, a: ['namabarang', 'barang', 'item', 'uraian'] },
    { k: 'Jumlah', l: 'Jumlah', r: 1, a: ['jumlah', 'qty', 'volume', 'vol'] }, { k: 'Satuan', l: 'Satuan', r: 1, a: ['satuan', 'sat'] }, { k: 'Harga', l: 'Harga Satuan', r: 1, a: ['hargasatuan', 'harga'] },
    { k: 'Syarat', l: 'Syarat Pembayaran', a: ['syaratpembayaran', 'syaratbayar', 'top'] }, { k: 'LeadTime', l: 'Lama Kirim (hari)', a: ['lamakirimhari', 'lamakirim', 'leadtime'] }, { k: 'Status', l: 'Status', a: ['status'] }],
    ex: [['PO/LAMA/001', '15/08/2026', 'PT Sinar Jaya Abadi', 'Sipil', '', 'Semen Portland Tiga Roda', 50, 'sak', 78000, 'TOP 30 Hari', 3, 'Arsip'], ['PO/LAMA/001', '15/08/2026', 'PT Sinar Jaya Abadi', 'Sipil', '', 'Pasir cor', 20, 'M3', 150000, '', '', '']],
    note: 'Harga satuan wajib. PO lama berstatus Arsip: tampil di Laporan dan menjadi acuan harga di form PR/Penawaran, tetapi tidak masuk notifikasi, KPI PO aktif, maupun anggaran. Supplier sebaiknya sudah ada di Data Induk.' },
  Nomor: { tab: 'Ubah Nomor', t: 'Ubah nomor PR / PO secara massal', fn: 'nomor', cols: [
    { k: 'NoLama', l: 'No. Lama', r: 1, a: ['nolama', 'nomorlama', 'lama'] }, { k: 'NoBaru', l: 'No. Baru', r: 1, a: ['nobaru', 'nomorbaru', 'baru'] }],
    ex: [['PR/2026/10/001', '00060/BAHAN/NKINFRA1/SPAMSUMBAR/10/2026'], ['PR/2026/10/002', '00061/BAHAN/NKINFRA1/SPAMSUMBAR/10/2026']],
    note: 'Pilih jenis dokumen (PR atau PO). Nomor di dokumen terkait ikut diperbarui: PR → kolom No. PR pada PO; PO → penerimaan (GRN) dan faktur. Perubahan tercatat di riwayat dokumen. No. baru tidak boleh sudah dipakai dokumen lain.' }
};
function imParse(aoa, cfg, r0) { // baca baris Excel -> objek per baris sesuai kolom (urutan kolom bebas, nama kolom dikenali lewat alias)
  const hi = aoa.findIndex(r => r.some(x => String(x).trim() !== '')); if (hi < 0) return { rows: [], missing: ['(file kosong)'], ignored: [] };
  const H = aoa[hi].map(imN), col = {}, used = {};
  cfg.cols.forEach(c => { const i = H.findIndex((h, j) => !used[j] && (c.a.includes(h) || h === imN(c.l))); if (i >= 0) { col[c.k] = i; used[i] = 1; } });
  const missing = cfg.cols.filter(c => c.r && col[c.k] === undefined).map(c => c.l), ignored = aoa[hi].filter((h, j) => !used[j] && String(h).trim() !== '').map(String), rows = [];
  for (let i = hi + 1; i < aoa.length; i++) {
    const a = aoa[i]; if (!a.some(x => String(x).trim() !== '')) continue; const o = { _baris: r0 + i + 1 };
    cfg.cols.forEach(c => { const v = col[c.k] === undefined ? '' : a[col[c.k]]; o[c.k] = (cfg.date || []).includes(c.k) ? imDate(v) : (cfg.num || []).includes(c.k) ? imNum(v) : String(v == null ? '' : v).trim(); });
    rows.push(o);
  }
  return { rows, missing, ignored };
}
function pImpor() {
  S.im = S.im || { tab: 'Items', p: null }; const k = S.im.tab, cfg = IMP[k];
  view(head('Impor Excel', 'Impor data lama dari file Excel. Baris yang valid langsung diimpor; baris bermasalah dilaporkan beserta nomor barisnya agar bisa diperbaiki lalu diimpor ulang.') +
    `<div class="bar" role="tablist">${Object.keys(IMP).map(x => `<button role="tab" aria-selected="${x === k}" class="${x === k ? 'btn-p' : 'btn-o'}" onclick="S.im={tab:'${x}',p:null};pImpor()">${IMP[x].tab}</button>`).join('')}</div>
    <div class="card2 mb-3"><h3>${cfg.t}</h3><p>${esc(cfg.note)}</p><p class="mb-3"><b>Kolom:</b> ${cfg.cols.map(c => esc(c.l) + (c.r ? '<sup>*</sup>' : '')).join(', ')} <small class="mut">(* wajib; urutan kolom bebas; baris pertama = judul kolom; sheet pertama yang dibaca)</small></p>
    <div class="d-flex gap-2 flex-wrap align-items-center"><button class="btn-o" onclick="imTemplate()"><i class="bi bi-download"></i> Unduh Template</button>
    ${cfg.fn === 'nomor' ? '<label class="visually-hidden" for="imJenis">Jenis dokumen</label><select id="imJenis" class="form-select" style="max-width:150px"><option>PR</option><option>PO</option></select>' : ''}
    <label class="visually-hidden" for="imF">Pilih file Excel</label><input id="imF" type="file" accept=".xlsx,.xls,.csv" class="form-control" style="max-width:340px" onchange="imFile(this)">
    ${cfg.fn === 'master' ? '<label class="d-flex gap-2 align-items-center m-0"><input id="imUpd" type="checkbox" checked> Perbarui jika nama sudah ada</label>' : ''}</div></div><div id="imPrev"></div><div id="imRes"></div>`);
}
function imTemplate() {
  if (typeof XLSX === 'undefined') { loadXLSX().then(imTemplate).catch(e => toast(e.message, true)); return; }
  const k = S.im.tab, cfg = IMP[k], ws = XLSX.utils.aoa_to_sheet([cfg.cols.map(c => c.l)].concat(cfg.ex)), wb = XLSX.utils.book_new();
  ws['!cols'] = cfg.cols.map(c => ({ wch: Math.max(16, c.l.length + 4) })); XLSX.utils.book_append_sheet(wb, ws, 'Data'); XLSX.writeFile(wb, 'template-impor-' + k.toLowerCase() + '.xlsx');
}
function imFile(inp) {
  const f = inp.files[0]; if (!f) return;
  if (typeof XLSX === 'undefined') { loadXLSX().then(() => imFile(inp)).catch(e => toast(e.message, true)); return; }
  const rd = new FileReader();
  rd.onload = () => { try {
    const wb = XLSX.read(new Uint8Array(rd.result), { type: 'array' }), ws = wb.Sheets[wb.SheetNames[0]], r0 = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']).s.r : 0;
    S.im.p = imParse(XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }), IMP[S.im.tab], r0); S.im.name = f.name; imPreview();
  } catch (e) { toast('File tidak dapat dibaca: ' + e.message, true); } };
  rd.readAsArrayBuffer(f);
}
function imPreview() {
  const p = S.im.p, cfg = IMP[S.im.tab], el = $('#imPrev'); $('#imRes').innerHTML = '';
  if (p.missing.length) { el.innerHTML = warnBox(`<b>Kolom wajib tidak ditemukan:</b> ${p.missing.map(esc).join(', ')}.<br><small>Periksa judul kolom di baris pertama, atau gunakan template.</small>`); return; }
  if (!p.rows.length) { el.innerHTML = warnBox('<b>Tidak ada baris data</b> di bawah judul kolom.'); return; }
  if (p.rows.length > 3000) { el.innerHTML = warnBox('<b>' + p.rows.length + ' baris</b>: maksimal 3000 baris per impor. Pecah file menjadi beberapa bagian.'); return; }
  el.innerHTML = `<div class="card2 mb-3"><b>${esc(S.im.name)}</b>: ${p.rows.length} baris data terbaca${p.ignored.length ? ` <small class="mut">(kolom diabaikan: ${p.ignored.map(esc).join(', ')})</small>` : ''}.<div class="mt-2">${tbl(['Baris'].concat(cfg.cols.map(c => esc(c.l))), p.rows.slice(0, 6).map(r => `<tr><td data-label="Baris">${r._baris}</td>${cfg.cols.map(c => `<td data-label="${esc(c.l)}">${esc(r[c.k])}</td>`).join('')}</tr>`).join(''))}</div>${p.rows.length > 6 ? '<small class="mut">Menampilkan 6 baris pertama.</small>' : ''}<div class="mt-3"><button class="btn-p" onclick="imGo(this)"><i class="bi bi-cloud-upload"></i> Impor ${p.rows.length} Baris</button></div></div>`;
}
async function imGo(b) {
  const k = S.im.tab, cfg = IMP[k], p = S.im.p; if (!p || p.missing.length || !p.rows.length) return;
  busy(b, true, 'Mengimpor...');
  try {
    const r = cfg.fn === 'master' ? await api('imporMaster', S.token, k, p.rows, $('#imUpd').checked) : cfg.fn === 'dok' ? await api('imporDokumen', S.token, k, p.rows) : await api('imporUbahNomor', S.token, $('#imJenis').value, p.rows);
    S.items = null; S.ref = null; S.sup = null; S.im.p = null; $('#imPrev').innerHTML = ''; imResult(r, cfg);
  } catch (e) { fail(e); } finally { busy(b, false); }
}
function imResult(r, cfg) {
  const ok = cfg.fn === 'master' ? `${r.tambah} baru, ${r.ubah} diperbarui, ${r.lewati} dilewati` : cfg.fn === 'dok' ? `${r.dokumen} dokumen (${r.item} barang) diimpor, ${r.sudahAda} nomor sudah ada` : `${r.diubah} nomor diubah` + (r.cascade && Object.keys(r.cascade).length ? ' (dokumen terkait diperbarui: ' + Object.keys(r.cascade).map(x => x + ' ' + r.cascade[x]).join(', ') + ')' : '');
  const L = (a, t) => a && a.length ? `<h3 class="mt-3">${t} (${a.length})</h3>${tbl(['Baris Excel', 'Keterangan'], a.slice(0, 100).map(e => `<tr><td data-label="Baris">${esc(e.baris)}</td><td data-label="Keterangan">${esc(e.pesan)}</td></tr>`).join(''))}${a.length > 100 ? '<small class="mut">Menampilkan 100 pertama; unduh daftar lengkap.</small>' : ''}` : '';
  S.exp = { name: 'masalah-impor', head: ['Baris Excel', 'Keterangan'], rows: (r.error || []).concat(r.peringatan || []).map(e => [e.baris, e.pesan]) };
  $('#imRes').innerHTML = `<div class="card2"><h3><i class="bi bi-check2-circle"></i> Selesai: ${esc(ok)}</h3><p class="mb-0">${r.total} baris diproses, ${(r.error || []).length} bermasalah${(r.peringatan || []).length ? ', ' + r.peringatan.length + ' peringatan' : ''}.</p>${S.exp.rows.length ? `<button class="btn-o mt-2" onclick="exportCSV()"><i class="bi bi-file-earmark-spreadsheet"></i> Unduh daftar masalah</button>` : ''}${L(r.error, 'Baris bermasalah (tidak diimpor)')}${L(r.peringatan, 'Peringatan')}</div>`;
  toast('Impor selesai: ' + ok + '.');
}

// ── Kecepatan (gas-instant-ux): optimistic UI, penyegaran lunak, prefetch, XLSX malas-muat ──
const nowStr = () => { const d = new Date(), p = n => ('0' + n).slice(-2); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); };
function softRefresh(force) { // gambar ulang halaman aktif dari cache; jangan ganggu bila pengguna sedang mengetik/memakai jendela
  if (!S.user) return;
  if (!force) { if (document.querySelector('.modal.show')) return; const a = document.activeElement; if (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) && $('#app-container').contains(a)) return; }
  go(S.page);
}
apiOnChange = k => { if (!S.user) return; if (k.indexOf('getNotif|') === 0) { loadNotif(); if (!['po', 'keuangan'].includes(S.page)) return; } softRefresh(); };
apiOnExpired = () => { if (S.user) { toast('Sesi berakhir, silakan masuk lagi.', true); resetUI(); } };
function prefetchAll() { // setelah login: data modul yang boleh dibuka dimuat dalam SATU permintaan -> pindah menu instan
  if (!S.token) return; S.rf = S.rf || { dari: new Date().getFullYear() + '-01-01', sampai: today(), disiplin: '', kategori: '' };
  const has = m => !S.akses || S.akses.includes(m), L = [];
  if (has('dashboard')) L.push(['getBoot'], ['getChartData'], ['getNotif']);
  if (has('pr')) L.push(['listPR']);
  if (has('po')) L.push(['listPO']);
  if (has('grn')) L.push(['listGRN']);
  if (has('gudang')) L.push(['getStock']);
  if (has('keuangan')) L.push(['listInvoices'], ['getKeuangan']);
  if (has('laporan')) L.push(['getReport', S.rf]);
  if (has('master')) L.push(['listMaster', 'Items'], ['listMaster', 'Suppliers']);
  if (has('pr') || has('po')) L.push(['getAcuanHarga']);
  if (has('arsip')) L.push(['listArsip']);
  if (has('pengaturan')) L.push(['listUsers']);
  apiPrefetch(L.map(x => [x[0], S.token].concat(x.slice(1)))).catch(() => {});
}
const applyPR = (r, aksi, cat) => { const o = Object.assign({}, r), rw = JSON.parse(o.Riwayat || '[]'), L = +o.Level;
  rw.push({ t: nowStr(), oleh: S.user.nama + ' (' + S.user.role + ')', aksi: (aksi === 'setuju' ? 'Menyetujui level ' : 'Menolak level ') + L + (cat ? ': ' + cat : '') });
  if (aksi === 'setuju') { o.Level = L + 1; if (o.Level > CHAIN.length) o.Status = 'Disetujui'; } else { o.Status = 'Ditolak'; o.Catatan = cat; }
  o.Riwayat = JSON.stringify(rw); return o; };
function optPR(id, aksi, cat) { // terapkan persetujuan ke data lokal seketika (server menyusul di belakang)
  let before = null;
  cachePatch('listPR', L => L.map(r => { if (r.ID !== id) return r; before = before || r; return applyPR(r, aksi, cat); }));
  cachePatch('getBoot', d => { const x = (d.tindakan || []).find(r => r.ID === id), b0 = before || x; d.tindakan = (d.tindakan || []).filter(r => r.ID !== id);
    if (b0) { const a = applyPR(b0, aksi, cat); if (a.Status === 'Disetujui') { d.menunggu = Math.max(0, d.menunggu - 1); d.disetujui++; } else if (a.Status === 'Ditolak') { d.menunggu = Math.max(0, d.menunggu - 1); d.ditolak++; } } });
}
async function act(id, aksi, b) {
  const cat = $('#cat').value; if (aksi === 'tolak' && !cat.trim()) { toast('Alasan penolakan wajib diisi.', true); $('#cat').focus(); return; }
  optPR(id, aksi, cat); hideModal(); toast(aksi === 'setuju' ? 'PR disetujui.' : 'PR ditolak.'); softRefresh(true); // tampil seketika
  try { await api('actPR', S.token, id, aksi, cat); softRefresh(); }                                                         // sinkron dengan server
  catch (e) { cacheDrop('listPR'); cacheDrop('getBoot'); fail(e); softRefresh(true); }                                      // gagal: kembalikan
}
const applyPO = (p, aksi, cat) => { const o = Object.assign({}, p), rw = JSON.parse(o.Riwayat || '[]');
  rw.push({ t: nowStr(), oleh: S.user.nama, aksi: ({ validasi: 'Memvalidasi PO', tolak: 'Menolak PO: ' + cat, kirim: 'Menandai PO dikirim ke supplier' })[aksi] });
  o.Status = aksi === 'validasi' ? 'Disetujui' : aksi === 'tolak' ? 'Ditolak' : 'Dikirim'; o.Riwayat = JSON.stringify(rw); return o; };
async function poAct(id, aksi, b) {
  const cat = $('#cat') ? $('#cat').value : ''; if (aksi === 'tolak' && !cat.trim()) { toast('Alasan penolakan wajib diisi.', true); return; }
  cachePatch('listPO', L => L.map(p => p.ID === id ? applyPO(p, aksi, cat) : p)); hideModal(); toast('PO diperbarui.'); softRefresh(true);
  try { await api('actPO', S.token, id, aksi, cat); softRefresh(); } catch (e) { cacheDrop('listPO'); fail(e); softRefresh(true); }
}
let _xlsxP = null; // SheetJS (±900 KB) hanya dimuat saat dibutuhkan (halaman Impor Excel)
function loadXLSX() {
  if (typeof XLSX !== 'undefined') return Promise.resolve();
  return _xlsxP || (_xlsxP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = res; s.onerror = () => { _xlsxP = null; rej(new Error('Pustaka Excel gagal dimuat. Periksa koneksi internet lalu coba lagi.')); }; document.head.appendChild(s); }));
}
const _pImpor0 = pImpor; pImpor = function () { _pImpor0(); loadXLSX().catch(() => {}); };

// ── Arsip & Reset Data ──
const JN = { Items: 'Barang/Jasa', Suppliers: 'Supplier', PR: 'PR', PO: 'PO' };
const deb = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms || 200); }; };
const arState = () => S.ar = S.ar || { tab: 'arsip', q: '', jenis: '', sel: new Set(), lim: 200, rs: { jenis: 'Items', q: '', st: '', sel: new Set(), lim: 200 } };
const arTab = t => { arState().tab = t; pArsip(); };
function pArsip() {
  const A = arState(), tb = (k, ic, l) => `<button role="tab" aria-selected="${A.tab === k}" class="${A.tab === k ? 'btn-p' : 'btn-o'}" onclick="arTab('${k}')"><i class="bi bi-${ic}"></i> ${l}</button>`;
  view(head('Arsip', 'Data yang di-reset tidak hilang: dipindahkan ke Arsip dan dapat dipulihkan kapan saja.', '') + `<div class="bar" role="tablist">${tb('arsip', 'archive', 'Isi Arsip')}${tb('reset', 'arrow-counterclockwise', 'Reset / Arsipkan Data')}</div><div id="arB">${skel()}</div>`);
  return A.tab === 'arsip' ? arLoad() : rsLoad();
}
function arHasil(t, n, err) {
  toast(t + ': ' + n + ' data' + (err.length ? ', ' + err.length + ' tidak diproses' : '') + '.', err.length > 0 && !n);
  if (err.length) setTimeout(() => modal(mHead('Tidak semua data diproses') + `<div class="modal-body">${tbl(['Data', 'Keterangan'], err.map(e => `<tr><td data-label="Data"><b>${esc(e.ref)}</b></td><td data-label="Keterangan">${esc(e.pesan)}</td></tr>`).join(''))}</div><div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Tutup</button></div>`), 350);
}
const arClear = () => { S.items = null; S.sup = null; S.ref = null; };
// -- Isi Arsip --
async function arLoad() {
  const A = arState();
  try { A.L = await api('listArsip', S.token); } catch (e) { fail(e); $('#arB').innerHTML = noAcc; return; }
  const cnt = {}; A.L.forEach(x => cnt[x.Jenis] = (cnt[x.Jenis] || 0) + 1);
  $('#arB').innerHTML = `<div class="bar"><label class="visually-hidden" for="arQ">Cari di arsip</label><input id="arQ" class="form-control" placeholder="Cari nomor, nama, alasan..." value="${esc(A.q)}" oninput="arQd(this.value)"><label class="visually-hidden" for="arJ">Jenis</label><select id="arJ" class="form-select" onchange="arJ(this.value)"><option value="">Semua jenis (${A.L.length})</option>${Object.keys(JN).map(j => `<option value="${j}" ${A.jenis === j ? 'selected' : ''}>${JN[j]} (${cnt[j] || 0})</option>`).join('')}</select>${expBar()}</div><div class="bar" id="arAct"></div><div id="arT"></div>`;
  arTable();
}
const arQd = deb(v => { const A = arState(); A.q = v; A.lim = 200; arTable(); });
function arJ(v) { const A = arState(); A.jenis = v; A.lim = 200; arTable(); }
function arTable() {
  const A = arState(), q = A.q.toLowerCase(), L = A.L.filter(x => (!A.jenis || x.Jenis === A.jenis) && (!q || [x.Ref, x.Ringkasan, x.Alasan, x.Oleh].join(' ').toLowerCase().includes(q)));
  A.vis = L; S.exp = { name: 'arsip', head: ['Jenis', 'Nomor/Nama', 'Ringkasan', 'Dihapus oleh', 'Waktu', 'Alasan'], rows: L.map(x => [JN[x.Jenis] || x.Jenis, x.Ref, x.Ringkasan, x.Oleh, x.Waktu, x.Alasan]) };
  const sh = L.slice(0, A.lim), all = L.length > 0 && L.every(x => A.sel.has(x.ID));
  $('#arT').innerHTML = L.length ? tbl([`<input type="checkbox" aria-label="Pilih semua yang tampil" ${all ? 'checked' : ''} onchange="arAll(this.checked)">`, 'Jenis', 'Nomor / Nama', 'Ringkasan', 'Dihapus', 'Alasan', ''],
    sh.map(x => `<tr><td data-label="Pilih"><input type="checkbox" aria-label="Pilih ${esc(x.Ref)}" ${A.sel.has(x.ID) ? 'checked' : ''} onchange="arTog('${esc(x.ID)}',this.checked)"></td><td data-label="Jenis"><span class="bd bd-n">${esc(JN[x.Jenis] || x.Jenis)}</span></td><td data-label="Nomor/Nama"><b class="pn">${esc(x.Ref)}</b></td><td data-label="Ringkasan">${esc(x.Ringkasan)}</td><td data-label="Dihapus">${esc(x.Oleh)}<small>${esc(x.Waktu)}</small></td><td data-label="Alasan">${esc(x.Alasan)}</td><td data-label="Aksi"><button class="ib" onclick="arView('${esc(x.ID)}')" aria-label="Lihat ${esc(x.Ref)}"><i class="bi bi-eye"></i></button></td></tr>`).join('')) + (L.length > sh.length ? `<button class="btn-o mt-2" onclick="arState().lim+=200;arTable()">Tampilkan 200 lagi (${L.length - sh.length} tersisa)</button>` : '')
    : `<div class="card2 empty">${A.L.length ? 'Tidak ada arsip yang cocok.' : 'Arsip masih kosong. Data yang Anda arsipkan lewat tab Reset akan tersimpan di sini.'}</div>`;
  arAct();
}
function arAct() {
  const A = arState(), n = A.sel.size;
  $('#arAct').innerHTML = n ? `<b>${n} dipilih</b><button class="btn-p" onclick="arPulih(this)"><i class="bi bi-arrow-counterclockwise"></i> Pulihkan</button>${S.user.role === 'Admin' ? '<button class="btn-d" onclick="arHapusP()"><i class="bi bi-trash"></i> Hapus Permanen</button>' : ''}<button class="btn-o" onclick="arState().sel.clear();arTable()">Batal pilih</button>` : '<small class="mut">Centang data untuk memulihkan.</small>';
}
function arTog(id, on) { const A = arState(); on ? A.sel.add(id) : A.sel.delete(id); arAct(); }
function arAll(on) { const A = arState(); (A.vis || []).forEach(x => on ? A.sel.add(x.ID) : A.sel.delete(x.ID)); arTable(); }
async function arPulih(b) {
  const A = arState(); busy(b, true, 'Memulihkan...');
  try { const r = await api('pulihkanArsip', S.token, [...A.sel]); A.sel = new Set(); arClear(); arHasil('Dipulihkan', r.dipulihkan, r.error); await arLoad(); }
  catch (e) { busy(b, false); fail(e); }
}
function arHapusP() {
  const n = arState().sel.size; if (!n) return;
  modal(mHead('Hapus permanen?') + `<div class="modal-body"><p><b>${n} data arsip akan dihapus PERMANEN</b> dan tidak dapat dipulihkan lagi.</p><p class="mut mb-0">Jika ragu, batalkan. Data di arsip tidak mengganggu aplikasi.</p></div><div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Batal</button><button class="btn-d" onclick="arHapusGo(this)">Ya, Hapus Permanen</button></div>`);
}
async function arHapusGo(b) {
  const A = arState(); busy(b, true, 'Menghapus...');
  try { const r = await api('hapusPermanenArsip', S.token, [...A.sel]); A.sel = new Set(); hideModal(); toast(r.dihapus + ' data dihapus permanen.'); await arLoad(); }
  catch (e) { busy(b, false); fail(e); }
}
async function arView(id) {
  modal(mHead('Detail Arsip') + '<div class="modal-body"><div class="sk" style="height:140px"></div></div>');
  try {
    const d = await api('detailArsip', S.token, id), o = d.data, skip = ['Items', 'Riwayat', 'Nama Barang', 'Jumlah', 'Satuan', 'Harga Satuan', 'ID', 'PRID']; let it = []; try { it = JSON.parse(o.Items || '[]'); } catch (e) {}
    $('#modalBody').innerHTML = mHead((JN[d.Jenis] || d.Jenis) + ' ' + esc(d.Ref)) + `<div class="modal-body"><p class="mut">Diarsipkan oleh ${esc(d.Oleh)} · ${esc(d.Waktu)}${d.Alasan ? ' · ' + esc(d.Alasan) : ''}</p>${Object.keys(o).filter(k => !skip.includes(k) && o[k] !== '' && o[k] != null).map(k => kv(esc(k), esc(o[k]))).join('')}${it.length ? '<h3 class="mt-3">Barang</h3>' + tbl(['Barang', 'Jumlah', 'Satuan', 'Harga'], it.map(i => `<tr><td data-label="Barang">${esc(i.nama)}</td><td data-label="Jumlah" class="num">${esc(i.qty)}</td><td data-label="Satuan">${esc(i.satuan)}</td><td data-label="Harga" class="num">${rp(i.harga)}</td></tr>`).join('')) : ''}</div><div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Tutup</button></div>`;
  } catch (e) { hideModal(); fail(e); }
}
// -- Reset / Arsipkan Data --
async function rsLoad() {
  const R = arState().rs;
  try { R.L = await api('listArsipkan', S.token, R.jenis); } catch (e) { fail(e); $('#arB').innerHTML = noAcc; return; }
  const sts = [...new Set(R.L.map(x => x.st).filter(Boolean))].sort();
  $('#arB').innerHTML = `<div class="card2 mb-3"><b><i class="bi bi-info-circle"></i> Reset awal tanpa risiko.</b> Data yang dicentang dipindahkan ke Arsip (bukan dihapus permanen) dan dapat dipulihkan. PR yang masih dipakai PO, serta PO yang sudah punya penerimaan (GRN) atau faktur, tidak bisa diarsipkan dan ditandai.</div>
    <div class="bar"><label class="visually-hidden" for="rsJ">Jenis data</label><select id="rsJ" class="form-select" onchange="rsJenis(this.value)">${Object.keys(JN).map(j => `<option value="${j}" ${R.jenis === j ? 'selected' : ''}>${JN[j]}</option>`).join('')}</select><label class="visually-hidden" for="rsQ">Cari</label><input id="rsQ" class="form-control" placeholder="Cari nomor atau nama..." value="${esc(R.q)}" oninput="rsQd(this.value)">${sts.length ? `<label class="visually-hidden" for="rsS">Status</label><select id="rsS" class="form-select" onchange="rsStatus(this.value)"><option value="">Semua status</option>${sts.map(s => `<option ${R.st === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>` : ''}</div><div class="bar" id="rsAct"></div><div id="rsT"></div>`;
  rsTable();
}
function rsJenis(j) { const R = arState().rs; R.jenis = j; R.q = ''; R.st = ''; R.sel = new Set(); R.lim = 200; rsLoad(); }
const rsQd = deb(v => { const R = arState().rs; R.q = v; R.lim = 200; rsTable(); });
function rsStatus(v) { const R = arState().rs; R.st = v; R.lim = 200; rsTable(); }
function rsTable() {
  const R = arState().rs, q = R.q.toLowerCase(), L = R.L.filter(x => (!R.st || x.st === R.st) && (!q || (x.label + ' ' + x.info).toLowerCase().includes(q)));
  R.vis = L.filter(x => !x.blok); const sh = L.slice(0, R.lim), all = R.vis.length > 0 && R.vis.every(x => R.sel.has(x.ID));
  $('#rsT').innerHTML = L.length ? tbl([`<input type="checkbox" aria-label="Pilih semua yang bisa diarsipkan" ${all ? 'checked' : ''} onchange="rsAll(this.checked)">`, 'Nomor / Nama', 'Keterangan', 'Status', 'Catatan'],
    sh.map(x => `<tr><td data-label="Pilih"><input type="checkbox" aria-label="Pilih ${esc(x.label)}" ${x.blok ? 'disabled' : ''} ${R.sel.has(x.ID) ? 'checked' : ''} onchange="rsTog('${esc(x.ID)}',this.checked)"></td><td data-label="Nomor/Nama"><b class="pn">${esc(x.label)}</b></td><td data-label="Keterangan">${esc(x.info)}</td><td data-label="Status">${x.st ? `<span class="bd bd-n">${esc(x.st)}</span>` : ''}</td><td data-label="Catatan">${x.blok ? `<span class="bd bd-w">${esc(x.blok)}</span>` : ''}</td></tr>`).join('')) + (L.length > sh.length ? `<button class="btn-o mt-2" onclick="arState().rs.lim+=200;rsTable()">Tampilkan 200 lagi (${L.length - sh.length} tersisa)</button>` : '')
    : `<div class="card2 empty">${R.L.length ? 'Tidak ada data yang cocok.' : 'Tidak ada data ' + JN[R.jenis] + ' di daftar aktif.'}</div>`;
  rsAct();
}
function rsAct() {
  const R = arState().rs, n = R.sel.size;
  $('#rsAct').innerHTML = n ? `<b>${n} dipilih</b><button class="btn-d" onclick="rsConfirm()"><i class="bi bi-archive"></i> Pindahkan ke Arsip</button><button class="btn-o" onclick="arState().rs.sel.clear();rsTable()">Batal pilih</button>` : '<small class="mut">Centang data yang akan di-reset (dipindahkan ke Arsip).</small>';
}
function rsTog(id, on) { const R = arState().rs; on ? R.sel.add(id) : R.sel.delete(id); rsAct(); }
function rsAll(on) { const R = arState().rs; (R.vis || []).forEach(x => on ? R.sel.add(x.ID) : R.sel.delete(x.ID)); rsTable(); }
function rsConfirm() {
  const R = arState().rs, n = R.sel.size; if (!n) { toast('Pilih data terlebih dahulu.', true); return; }
  modal(mHead('Pindahkan ke Arsip?') + `<div class="modal-body"><p><b>${n} data ${JN[R.jenis]}</b> akan dipindahkan ke Arsip dan hilang dari daftar aktif.</p><p class="mut">Data tidak terhapus: dapat dilihat dan dipulihkan dari tab Isi Arsip.</p><label class="form-label" for="rsAl">Alasan (opsional)</label><input id="rsAl" class="form-control" maxlength="200" placeholder="mis. Reset awal sebelum go-live"></div><div class="modal-footer"><button class="btn-o" data-bs-dismiss="modal">Batal</button><button class="btn-d" onclick="rsGo()">Ya, Pindahkan ke Arsip</button></div>`);
}
async function rsGo() { // optimistic: baris langsung hilang dari daftar, server menyusul
  const R = arState().rs, ids = [...R.sel], jenis = R.jenis, alasan = $('#rsAl').value.trim(), gone = new Set(ids);
  hideModal(); R.L = R.L.filter(x => !gone.has(x.ID)); R.sel = new Set(); rsTable(); toast('Memindahkan ' + ids.length + ' data ke Arsip...');
  try { const r = await api('arsipkanData', S.token, jenis, ids, alasan); arClear(); arHasil('Dipindahkan ke Arsip', r.diarsipkan, r.error); if (S.page === 'arsip' && arState().tab === 'reset') rsLoad(); }
  catch (e) { fail(e); cacheDrop('listArsipkan'); if (S.page === 'arsip') rsLoad(); }
}

// ── Penanganan error global: tampilkan pesan, jangan biarkan halaman kosong ──
function showErr(e) {
  const c = $('#app-container'); if (c) c.innerHTML = '<div class="card2 empty"><b>Terjadi kesalahan:</b> ' + esc(e && e.message || e) + '<br>Muat ulang halaman (Ctrl+F5). Jika berulang, pastikan semua berkas terpasang lalu buat New Deployment.</div>';
}
window.addEventListener('error', ev => toast('Error: ' + ev.message, true));
window.addEventListener('unhandledrejection', ev => toast('Error: ' + (ev.reason && ev.reason.message || ev.reason), true));
