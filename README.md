# Sim-Pengadaan

Sistem informasi **procure-to-pay** proyek lapangan: permintaan (PR), perbandingan harga, pesanan (PO), penerimaan barang (GRN), gudang, keuangan, dan laporan.

**Arsitektur**

```
Browser  ──►  Frontend statis (GitHub Pages)  ──fetch()──►  Google Apps Script (REST API)  ──►  Google Sheets & Drive
              index.html, css/, js/                          Api.gs + Kode*.gs
```

## Struktur folder (root folder ini = root repository)

```
index.html          halaman utama (satu halaman, SPA)
css/style.css       gaya antarmuka (tema olive, mode terang/gelap)
js/config.js        ← SATU-SATUNYA berkas yang perlu diedit: isi GAS_URL
js/api.js           penghubung ke backend (fetch, POST text/plain)
js/app.js           logika aplikasi
PANDUAN-INSTALASI.md  langkah instalasi lengkap + update v2.0 (backend + GitHub Pages)
```

Backend (`Kode*.gs`, `Api.gs`, `appsscript.json`) **tidak** disimpan di repository ini; berkas itu dipasang di Google Apps Script.

## Kecepatan (v2.0)

- **Cache di browser (stale-while-revalidate):** data lama tampil seketika, lalu diperbarui di latar belakang; halaman disegarkan otomatis bila ada perubahan.
- **Prefetch:** setelah login, data semua menu dimuat dalam satu permintaan, jadi pindah menu tanpa menunggu.
- **Optimistic UI:** persetujuan PR, validasi PO, dan arsip data tampil seketika; server menyusul dan dikembalikan bila ditolak.
- **Cache server (CacheService)** per pengguna dan peran, otomatis dibuang setiap ada perubahan data.
- **Arsip & Reset:** data induk, PR, dan PO lama dipindahkan ke Arsip (tidak hilang) dan dapat dipulihkan.

## Konfigurasi

Buka `js/config.js`, isi `GAS_URL` dengan URL Web App Apps Script (berakhiran `/exec`).

## Catatan keamanan

- Repository ini publik dan hanya berisi kode antarmuka serta alamat API; **tidak ada data atau kata sandi**.
- Login memakai email + PIN, sesi 6 jam, dan hak akses per peran diperiksa di server. Ganti PIN awal `1234` segera, dan gunakan PIN 6–8 angka.
