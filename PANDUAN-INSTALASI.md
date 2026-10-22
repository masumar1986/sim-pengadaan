# PANDUAN INSTALASI — Sim-Pengadaan
**Frontend di GitHub Pages + Backend di Google Apps Script**

Urutan kerja: **A. Perbarui backend → B. Isi alamat backend → C. Upload ke GitHub → D. Uji**.
Kerjakan satu bagian sampai selesai sebelum pindah ke bagian berikutnya.

## Baca dulu (3 hal penting)

1. **Data Anda aman dan tidak berubah.** Spreadsheet, folder Drive, akun pengguna, dan semua data tetap di tempatnya. `setupAppEnvironment()` **tidak perlu dijalankan lagi**.
2. **Alamat `/exec` yang lama berubah fungsi.** Setelah bagian A, membukanya di browser tidak lagi menampilkan aplikasi, melainkan teks JSON. Aplikasi sekarang dibuka dari alamat GitHub Pages (bagian C).
3. **Ganti PIN awal `1234` sebelum membuka situs ke orang lain.** Alamat API kini ada di repository publik, jadi PIN lemah lebih berisiko. Pakai PIN 6–8 angka (menu Pengaturan, khusus Admin).

---

## BAGIAN A — Perbarui backend (Google Apps Script)

Berkas yang dibutuhkan (disajikan terpisah di chat): **`Kode.gs`**, **`Api.gs`**, **`appsscript.json`**.
Berkas `Kode2.gs` … `Kode8.gs` **tidak berubah**, biarkan seperti sekarang.

1. Buka <https://script.google.com> → pilih proyek Sim-Pengadaan Anda.
2. Klik berkas **Kode** di daftar kiri → hapus semua isinya → tempel seluruh isi **`Kode.gs`** yang baru. *(Perubahannya: fungsi `doGet`/`include` lama yang menampilkan halaman HTML dibuang.)*
3. Klik **+** di sebelah "Files" → **Script** → beri nama **`Api`** → tempel seluruh isi **`Api.gs`**.
4. Klik ikon roda gigi **Project Settings** → centang **Show "appsscript.json" manifest file in editor** → kembali ke editor, klik **appsscript.json** → ganti isinya dengan **`appsscript.json`** yang baru.
5. Tekan **Ctrl+S** untuk menyimpan semua berkas.
6. **Deploy ulang dengan URL yang sama:** **Deploy → Manage deployments** → klik ikon **pensil** pada deployment yang ada → pada **Version** pilih **New version** → **Deploy**.
   - Pastikan: **Execute as: Me** dan **Who has access: Anyone**.
   - Kalau belum pernah ada deployment: **Deploy → New deployment → Web app**, isi dua pengaturan di atas, lalu **Deploy**.
7. Salin URL berakhiran `/exec`.
8. **Uji backend:** tempel URL `/exec` itu di tab browser baru. Harus muncul teks seperti:
   `{"success":true,"data":{"app":"Sim-Pengadaan","api":"1.0",...},"message":"Sim-Pengadaan API aktif..."}`
   - Kalau yang muncul halaman login Google atau "Anda memerlukan akses" → akses deployment bukan **Anyone**. Perbaiki di langkah 6.
   - Kalau yang muncul aplikasi lama → belum **New version**. Ulangi langkah 6.
9. *(Opsional, setelah semuanya berjalan di bagian D)* Hapus berkas **Index**, **Stylesheet**, dan **JavaScript** dari proyek Apps Script, karena sudah tidak dipakai.

---

## BAGIAN B — Isi alamat backend di frontend

1. Ekstrak **`sim-pengadaan-frontend.zip`**. Hasilnya satu folder bernama **`sim-pengadaan`**.
2. Buka folder itu → buka **`js/config.js`** dengan Notepad.
3. Ganti `GANTI_DENGAN_URL_EXEC_ANDA` dengan URL `/exec` dari langkah A7, **tetap di dalam tanda kutip**:
   ```js
   const GAS_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
   ```
4. Simpan.

---

## BAGIAN C — Upload ke GitHub Pages (lewat terminal)

> **Folder kerja Anda = folder `sim-pengadaan` yang di dalamnya langsung ada `index.html`.**
> Contoh: `C:\Users\NAMA\Documents\sim-pengadaan`. Di folder inilah `git init` dijalankan.
> Jangan masuk lebih dalam dan jangan naik satu level.
> Jangan memakai "Upload files" di situs GitHub; itu merusak struktur folder `css/` dan `js/`.

**C1. Pasang Git.** Windows: <https://git-scm.com/download/win> (instal dengan pengaturan default). Buka **PowerShell**, lalu:
```bash
git --version
```
**C2. Akun GitHub.** Daftar di <https://github.com>. Username Anda menjadi bagian alamat situs (`USERNAME.github.io`).

**C3. Identitas Git (sekali saja).**
```bash
git config --global user.name "Nama Anda"
git config --global user.email "email-akun-github@anda.com"
```
**C4. Buat repository.** github.com → **+** → **New repository** → nama `sim-pengadaan` → pilih **Public** → **jangan** centang README, .gitignore, atau license → **Create repository**. Biarkan halamannya terbuka.

**C5. Masuk ke folder kerja & verifikasi.** Cara cepat: buka folder `sim-pengadaan` di File Explorer → klik address bar → ketik `powershell` → Enter. Lalu:
```powershell
dir
```
Yang **harus** terlihat: **`index.html`**, folder **`css`**, folder **`js`**. Tidak boleh ada berkas `.gs`. Kalau yang terlihat justru satu folder lagi bernama `sim-pengadaan`, masuk dulu: `cd sim-pengadaan`, lalu `dir` lagi. **Jangan lanjut sebelum `index.html` terlihat.**

**C6. Push pertama** (satu per satu; tanda titik pada `git add .` wajib):
```bash
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/sim-pengadaan.git
git push -u origin main
```
Ganti `USERNAME` dengan username GitHub Anda. Saat diminta **Username**, ketik username. Saat diminta **Password**, isi **Personal Access Token** (C7). Layar tidak menampilkan apa pun saat Anda paste token; itu normal. Tanda sukses: `* [new branch] main -> main`.

**C7. Personal Access Token** (kalau muncul `Password authentication is not supported`): buka <https://github.com/settings/tokens> → **Generate new token (classic)** → Note bebas → Expiration `90 days` → centang **repo** → **Generate token** → **salin token `ghp_...` sekarang** (hanya tampil sekali) → ulangi `git push -u origin main` dan paste token sebagai password.

**C8. Aktifkan Pages.** Repo di github.com → **Settings** → **Pages** → Source **Deploy from a branch** → Branch **main** dan **/ (root)** → **Save**. Centang **Enforce HTTPS**. Tunggu 1–2 menit, lalu muncul: *Your site is live at `https://USERNAME.github.io/sim-pengadaan/`*.

---

## BAGIAN D — Uji

1. Buka `https://USERNAME.github.io/sim-pengadaan/` (tekan **Ctrl+Shift+R**).
2. Login dengan akun yang ada, misalnya `admin@contoh.id` dengan PIN Anda.
3. Cek: Dashboard menampilkan angka dan grafik, Permintaan (PR) memuat daftar, buat satu PR lalu cek baris barunya di Google Sheets.
4. Coba unggah satu lampiran kecil dan buka menu Impor Excel.
5. Buka **F12 → Console / Network**: tidak boleh ada error merah soal CORS atau 404.
6. **Ganti PIN semua akun** di Pengaturan (terutama yang masih `1234`).

---

## BAGIAN E — Cara update

**Frontend** (ubah `index.html`, `css/`, atau `js/`), dari folder kerja:
```bash
git add .
git commit -m "Deskripsi singkat perubahan"
git push
```
Tunggu 1–2 menit, lalu **Ctrl+Shift+R**.

**Backend** (ubah kode `.gs`): simpan di Apps Script → **Deploy → Manage deployments → pensil → New version → Deploy**. URL tidak berubah, jadi `config.js` tidak perlu diedit.

---

## BAGIAN F — Update ke v2.0 (Cepat + Arsip & Reset)

Untuk yang **sudah** menjalankan Bagian A–D. Data Anda tidak berubah. Kerjakan berurutan: backend dulu, baru frontend.

**F1. Backend (Apps Script)** — berkas: **`Kode.gs`** (ganti), **`Api.gs`** (ganti), **`Kode9.gs`** (baru).
1. Berkas **Kode**: hapus isinya, tempel `Kode.gs` yang baru.
2. Berkas **Api**: hapus isinya, tempel `Api.gs` yang baru.
3. **+ → Script**, beri nama **`Kode9`**, tempel `Kode9.gs`. *(Jika terlewat, hanya menu Arsip yang tidak tersedia; aplikasi lainnya tetap berjalan.)*
4. **Ctrl+S**, lalu **Deploy → Manage deployments → pensil → Version: New version → Deploy** (URL tetap sama).
5. Uji: buka URL `/exec` di browser. Teks harus memuat `"api":"2.0"`.

**F2. Frontend** — pakai **`sim-pengadaan-update-v2.zip`** (hanya berisi berkas yang berubah).
1. Ekstrak ZIP. Salin **`index.html`**, **`js/api.js`**, dan **`js/app.js`** ke folder `sim-pengadaan` Anda, timpa yang lama.
2. **Jangan menimpa `js/config.js`**; berkas itu menyimpan URL backend Anda.
3. Dari folder kerja (yang berisi `index.html`):
```bash
git add .
git commit -m "Update v2.0: cepat dan arsip"
git push
```
4. Tunggu 1–2 menit, lalu buka situs dengan **Ctrl+Shift+R**.

**F3. Memakai Arsip & Reset (menu Arsip)**
- **Reset / Arsipkan Data:** pilih jenis (Barang/Jasa, Supplier, PR, PO), cari, centang, lalu **Pindahkan ke Arsip**. Data tidak terhapus; hanya pindah.
- **Tidak bisa diarsipkan:** PR yang masih dipakai PO, dan PO yang sudah punya penerimaan (GRN) atau faktur. Barisnya ditandai dengan alasannya. Untuk mengarsipkannya, arsipkan PO/dokumen turunannya lebih dulu.
- **Isi Arsip:** lihat detail, cari, **Pulihkan** (ID asli dipertahankan, jadi lampiran dan penawaran tersambung lagi). Pemulihan ditolak bila nama/nomor yang sama sudah dipakai data baru.
- **Hapus Permanen:** khusus Admin, tidak bisa dibatalkan.
- Siapa yang boleh: Barang/Jasa dan Supplier oleh Site Engineer, Cost Control, Manajer Proyek, Staf Pengadaan, Admin; PR dan PO oleh Staf Pengadaan, Manajer Proyek, Admin.

**F4. Catatan kecepatan**
- Data ditampilkan dari cache lalu diperbarui di latar belakang, jadi angka bisa terlambat beberapa detik; tombol **Muat ulang** (ikon panah melingkar di atas) memaksa ambil dari server.
- Cache disimpan hanya di tab browser (hilang saat tab ditutup) dan dibersihkan saat logout.
- Di server, cache otomatis dibuang setiap ada perubahan lewat aplikasi. **Jika Anda mengedit sheet langsung** (mengetik di Google Sheets), perubahan baru tampil setelah paling lama 2 menit, atau segera setelah Anda menjalankan fungsi **`bersihkanCache()`** dari editor Apps Script.

---

## Troubleshooting cepat

| Yang terlihat | Penyebab | Solusi |
|---|---|---|
| "URL backend belum diisi" | `js/config.js` belum diedit | Isi `GAS_URL`, lalu `git add . && git commit -m "isi config" && git push` |
| "Respons server tidak valid…" | Deploy belum **New version**, akses bukan **Anyone**, atau URL bukan `/exec` | Ulangi A6; pastikan URL berakhiran `/exec` |
| "Tidak dapat terhubung ke server" | Internet putus atau `GAS_URL` salah ketik | Cek koneksi; buka `GAS_URL` di tab baru, harus muncul JSON |
| "Email atau PIN salah" | Akun tidak ada/PIN beda | Cek sheet **Users**; setelah 5 kali salah, tunggu 10 menit |
| "Sesi berakhir" | Sesi 6 jam habis atau halaman dimuat ulang | Login lagi (normal) |
| Halaman tanpa styling | `css/` atau `js/` rata di root | Verifikasi C5: struktur harus `css/style.css`, `js/*.js` |
| 404 di GitHub Pages | `index.html` tidak di root repo, atau Pages belum aktif | Buka repo: `index.html` harus terlihat di root; cek C8 |
| 404 dan di repo terlihat folder `sim-pengadaan/` | `git init` di folder induk | Dari folder yang berisi `index.html`: `git init`, `git add .`, `git commit -m "fix"`, `git branch -M main`, `git remote add origin URL`, `git push -u origin main --force` (`--force` menimpa isi repo dengan versi lokal) |
| `remote origin already exists` | Sudah pernah disambungkan | Lewati, lanjut `git push` |
| Versi lama masih tampil | Cache browser | **Ctrl+Shift+R** atau jendela Incognito |
| `LF will be replaced by CRLF` | Peringatan Windows | Abaikan |

## Keamanan

- Repository publik hanya berisi kode antarmuka dan alamat API. Data tetap di Google Sheets milik Anda.
- Pintu API hanya menerima fungsi yang terdaftar di `Api.gs`; fungsi perawatan seperti `setupAppEnvironment` tidak bisa dipanggil dari luar.
- Login dibatasi 5 percobaan salah per 10 menit per email, tetapi PIN pendek tetap bisa ditebak pelan-pelan. Gunakan 6–8 angka dan ganti PIN awal.

## Rollback (kembali ke versi lama)

Apps Script → **Deploy → Manage deployments → pensil → Version** → pilih versi sebelum migrasi → **Deploy**. Alamat `/exec` yang sama akan kembali menampilkan aplikasi lama.
