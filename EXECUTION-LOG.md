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

## Lanjutan — Task 4, 5, 6, 11

- Tes murni diperluas: `tests/codec.test.js` + `tests/backup.test.js`.
  `node --test tests/detect.test.js tests/search.test.js tests/embed.test.js tests/codec.test.js tests/backup.test.js`
  → **26 pass, 0 fail**.
- **Task 6 (`app/src/db.js`)**: wrapper IndexedDB tipis, satu transaksi untuk
  `deleteCollectionAndDetach`. Smoke via CDP (`qa/task6-11.mjs`): put 1 Koleksi + 1
  bookmark → list 1/1; `deleteCollectionAndDetach` → Koleksi 0, bookmark tetap ada
  dengan `collectionId === null`; reload penuh → data bertahan (1/0). Semua sesuai.
- **Task 5 (`app/src/backup.js`)**: `buildExport`, `planImport`, `duplicateKey`,
  `findDuplicate`. `app/src/dupes.js` dihapus; import di `form.js`/`main.js` diarahkan
  ke `backup.js`.
- **Task 11 wiring dilakukan bersamaan** (store in-memory `ponytail` dibuang):
  - Export via `buildExport` → Blob dengan nama `simpanaja-backup-YYYY-MM-DD.json`
    (format nama diverifikasi unit test).
  - Import via `planImport` → terapkan `addCollections` lalu `addBookmarks`.
    Bunyi ringkasan diuji nyata lewat UI:
    `Import selesai: 1 ditambahkan, 0 dilewati (duplikat), 1 Koleksi baru dibuat.`
    Import kedua: `0 ditambahkan, 1 dilewati (duplikat), 0 Koleksi baru dibuat.`
    File teks acak: `File bukan JSON yang valid. Import dibatalkan.` + data tak berubah.
  - `#add=` valid: formulir terbuka terisi (judul/tipe/URL), Koleksi baru diusulkan
    sebagai `__new__` ("Motion Link") **belum** tersimpan; fragment langsung dibersihkan
    (`history.replaceState`). Batal → tidak ada Koleksi/item baru.
  - `#add=` rusak: `Link Muse tidak valid. Formulir dibuka kosong.`, fragment bersih.
  - `#add=` > 2.000 karakter: `Link Muse lebih dari 2.000 karakter. Pakai Export/Import JSON.`
- Bug yang diperbaiki saat wiring: `b.onclick = openAdd` / `btnAdd.onclick = openAdd`
  meneruskan `MouseEvent` sebagai `initial`. Fix: bungkus `() => openAdd()`.

## Berkas

- `app/index.html`, `app/styles.css`
- `app/src/`: `constants.js`, `detect.js`, `search.js`, `embed.js`, `codec.js`,
  `backup.js`, `db.js`, `render.js`, `form.js`, `preview.js`, `main.js`
- `tests/`: `detect.test.js`, `search.test.js`, `embed.test.js`, `codec.test.js`,
  `backup.test.js`
- `qa/`: `task7-390.png`, `task7-1280.png`, `task10-preview.png`, `task10-fallback.png`,
  `task8-form.png`, `task9-collections.png` + skrip QA (`drive.mjs`, `shot.mjs`,
  `states.mjs`, `task6-11.mjs`)

## Belum dikerjakan

- Task 12: QA menyeluruh 14 kriteria SPECS §10, `app/README.md`, `QA-REPORT.md`,
  tangkapan final `qa/final-390.png` & `qa/final-1280.png`.
