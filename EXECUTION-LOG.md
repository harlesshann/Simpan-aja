# Log eksekusi — SimpanAja (frontend dulu)

Rencana: `PLAN.md`. Spec: `SPECS.md`. Bukan repo git (sesuai spec), jadi tak ada commit.

## Keputusan (rulings)

- Mode antislop: **during** (pilihan sesi).
- Arah visual: **clean utility** (pilihan sesi). Dial ENERGY 1 / RHYTHM 1 / MOTION 1.
- **Ruling:** lingkup diminta "UI dulu saja", tetapi `render/form/main` mengimpor
  `detect/search/embed` saat load. Tanpa modul itu halaman kosong dan UI tak bisa
  diverifikasi. Maka 3 modul murni tipis itu (`constants/detect/search/embed`) ikut
  dibuat beserta tesnya. `codec.js`, `backup.js`, `db.js` ditunda sesuai permintaan.
  Biaya bila salah: kecil, ketiganya memang akan dibuat di Task 1-3.
- **Ruling:** `db.js`/`backup.js` belum ada, jadi `main.js` memakai store in-memory
  sementara (blok `ponytail`) + export/import minimal agar tombolnya hidup, bukan
  kontrol mati (R-26). Diganti oleh Task 5 & 6.
- **Ruling:** `duplicateKey`/`findDuplicate` sementara di `app/src/dupes.js`
  (rencana menaruhnya di `backup.js`, Task 5).

## Bug yang ditemukan & diperbaiki saat QA

1. `.field { display: flex }` menimpa atribut `hidden`, sehingga baris Command dan
   "Nama Koleksi baru" selalu tampil. Fix: `[hidden] { display: none !important }`.
2. Placeholder search `#8b8f96` gagal kontras (3.2:1). Fix: `#62676e`.
3. Screenshot 390px pertama terpotong karena lebar minimum jendela Chrome headless
   (512px), bukan overflow nyata. Diverifikasi ulang dengan emulasi CDP 390px.

## Verifikasi

- Tes murni: `node --test tests/detect.test.js tests/search.test.js tests/embed.test.js`
  → **10 pass, 0 fail**.
- Detector impeccable (UI yang diubah) → **[]** (bersih).
- Click-through via CDP (viewport 390px, `qa/drive.mjs`), semua lulus:
  search `ffmpeg` = 1 kartu; chip Command = 1; Koleksi "Belum Dikoleksi" = 3;
  preview YouTube berisi iframe `youtube-nocookie.com/embed/dQw4w9WgXcQ`;
  tutup preview membuang iframe; kartu Threads = fallback tanpa iframe + tombol sumber;
  URL `javascript:` ditolak; deteksi tipe `youtu.be` → video; baris Command tampil benar;
  simpan menambah kartu (5→6) dan menutup dialog; `Esc` menutup preview;
  `scrollWidth === innerWidth === 390` (tanpa overflow mendatar).

## Berkas

- `app/index.html`, `app/styles.css`
- `app/src/`: `constants.js`, `detect.js`, `search.js`, `embed.js`, `dupes.js`,
  `render.js`, `form.js`, `preview.js`, `main.js`
- `tests/`: `detect.test.js`, `search.test.js`, `embed.test.js`
- `qa/`: `task7-390.png`, `task7-1280.png`, `task10-preview.png`, `task10-fallback.png`,
  `task8-form.png`, `task9-collections.png` + skrip QA (`drive.mjs`, `shot.mjs`, `states.mjs`)

## Belum dikerjakan (ditunda sesuai permintaan)

- Task 4 `codec.js` (link 1-tap Muse), Task 5 `backup.js`, Task 6 `db.js` (IndexedDB).
- Task 11 wiring `#add=` dan import/export resmi lewat `backup.js`.
- Task 12 README + `QA-REPORT.md` final.
