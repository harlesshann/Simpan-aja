# Log eksekusi — SimpanAja (frontend dulu)

Rencana: `PLAN.md`. Spec: `SPECS.md`. Bukan repo git (sesuai spec), jadi tak ada commit.

## Keputusan (rulings)

- Mode antislop: **during** (pilihan sesi).
- Arah visual: **clean utility** (pilihan sesi). Dial ENERGY 1 / RHYTHM 1 / MOTION 1.
- **Ruling (revisi):** arah visual diganti ke **neubrutalism** atas permintaan sesi ini.
  Hanya `app/styles.css` yang berubah: radius 0, border 3px hitam, hard offset shadow,
  aksen kuning `#ffde00`, heading/utility monospace, latar putih. HTML/JS tak disentuh,
  jadi perilaku & seluruh lencana tipe tetap. Detector impeccable: hanya advisory
  `hard-offset-shadow` (memang disengaja pada neubrutalism); warning `cream-palette`
  dihapus dengan mengganti latar krem → putih.
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
4. **HP tidak bisa Simpan** (dilaporkan pengguna): `crypto.randomUUID()` hanya ada di
   secure context; HP lewat `http://192.168.x.x` = insecure → melempar TypeError di
   `form.onsubmit`, dialog tetap terbuka tanpa pesan. Fix: `app/src/id.js` (`newId`
   dari `crypto.getRandomValues` + fallback), dipakai di `form.js`, `main.js` (×2),
   `backup.js`; `onsubmit` di-`await` dan menampilkan pesan bila gagal.
5. **HP masih memakai JS lama**: `py -m http.server` tak mengirim `Cache-Control`, jadi
   Chrome Android menyajikan modul dari cache (log: hanya `GET /` 304, nol request
   `/src/*.js`). Fix: `serve.py` di root proyek — `ThreadingHTTPServer` + `no-store` +
   versi otomatis `?v=<start>` pada setiap referensi modul (termasuk entry di HTML),
   sehingga URL berubah tiap server restart dan cache lama tidak pernah terpakai.
   Diverifikasi di origin insecure `http://192.168.100.105:8000` (`isSecureContext:
   false`, `randomUUID: undefined`) → simpan berhasil.

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

## Lanjutan — Task 4, 5, 6, 11, 12

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

## QA final — 14 kriteria SPECS §10

- `qa/final-qa.mjs` (kriteria 1–7, 10–13 + tangkapan layar + audit jaringan)
  → **11/11 checks pass**.
- `qa/export-roundtrip.mjs` (kriteria 9, unduhan nyata via `Browser.setDownloadBehavior`)
  → PASS: file `simpanaja-backup-2026-11-05.json`, restore ke DB kosong = 3 bookmark +
  1 Koleksi, import kedua = semua duplikat dilewati.
- Audit statis: `innerHTML`, `fetch`, `XHR`, `WebSocket`, `sendBeacon` = **tidak ada** di
  `app/`; URL eksternal hanya host embed di `embed.js`.
- Tangkapan final: `qa/final-390.png`, `qa/final-1280.png`.
- Catatan driver (bukan bug aplikasi): chip Video memang mengecualikan Repo di
  intersection, dan catatan pada data uji ditimpa helper formulir — asersi disesuaikan.

## Perubahan pasca-QA: judul opsional + judul otomatis (SPECS §8.4)

- Permintaan: saat menambah bookmark cukup link; judul tidak wajib.
- **Ruling A (disetujui):** judul diturunkan **lokal dari URL/teks command**, tanpa
  jaringan. Usulan mengambil deskripsi/caption YouTube/TikTok/Threads/Instagram
  **ditolak** — CORS, tidak ada endpoint publik, platform butuh login; hanya bisa
  dengan backend proxy + kunci API, yang melanggar SPECS §4/§6. Jalur resmi tetap
  Muse: caption masuk lewat field `note` di payload `#add=`.
- Kode: `deriveTitle({ type, url, command })` di `detect.js`; `form.js` label
  "Judul (opsional)" + isi otomatis saat simpan; `render.js` guard judul kosong;
  `backup.js` derive saat import + `duplicateKey` Command jadi `cmd:<command>`;
  `codec.js` `title` opsional. HTML hanya berubah pada label.
- Tes: **36 pass, 0 fail** (detect 11, search 3, embed 3, codec 12, backup 7).
- QA: `qa/final-qa.mjs` **12/12 pass**, termasuk kasus baru
  "kolom judul dikosongkan → judul diturunkan dari URL" (`https://web.dev/learn/css/grid`
  → `Learn Css Grid`) dan kriteria lama tetap lulus.
- Dokumen acuan diperbarui: `SPECS.md` §7.1, §7.2, §7.7, §7.8, §8.1, §8.4, §10.1;
  `PLAN.md` Task 1, 4, 5, 8.

## Perubahan pasca-QA: kartu thumbnail + modal detail

- Permintaan: kartu lebih rapi, menampilkan thumbnail konten, klik kartu → detail.
- Pilihan pengguna: thumbnail remote (YouTube asli + favicon Google + tile lokal),
  semua aksi pindah ke detail, hover-preview dihapus, detail = modal tengah.
- **SPECS §6 diamandemen:** jaringan saat render kini diizinkan hanya ke
  `i.ytimg.com` dan `www.google.com/s2/favicons` (lazy). Tidak ada endpoint lain.
- Kode baru: `app/src/thumbnail.js` (`thumbnailFor`), `app/src/detail.js`
  (`openDetail`/`closeDetail`), dialog `#detailDialog` di `index.html`.
- `render.js` ditulis ulang: kartu = `role="button"` + `tabindex=0` +
  `createThumbEl`; tombol aksi di kartu dihapus. `preview.js`: `attachPreview`
  dihapus, `openPreview` selalu modal, dipicu dari detail. `main.js`: handler
  `onDetail` + `onDelete` mengembalikan boolean.
- Tes: **47 pass, 0 fail** (+ `tests/thumbnail.test.js` 9 tes, termasuk poster).
- QA: `qa/final-qa.mjs` **13/13 checks pass** (kriteria 1–7, 10–13, 15, O1);
  audit jaringan hanya mengizinkan `i.ytimg.com`, `www.google.com/s2/favicons`,
  dan redirect `*.gstatic.com` — 0 request tak terduga.
- Dokumen diperbarui: `SPECS.md` §6.4, §7.3, §7.5, §10.1/5/7/11/12/15;
  `PLAN.md` struktur file, Task 7/8/10/12.

## Perubahan pasca-QA: poster lokal TikTok/Instagram/Threads

- Permintaan: gambar otomatis untuk TikTok/IG/Threads, dibuat aplikasi (bukan user).
- Pilihan pengguna: **tanpa backend**, poster lokal; cakupan termasuk IG & Threads.
- Batas nyata: tangkapan halaman asli mustahil dari browser (CORS, login wall,
  `X-Frame-Options`). Jadi poster **mirip screenshot** digambar lokal dari URL + judul.
- Kode baru: `app/src/poster.js` — `posterSvg()`/`posterDataUrl()` murni (SVG,
  deterministik, `encodeURIComponent`, teks di-escape); `thumbnailFor` mengembalikan
  `{ kind: 'poster', platform }` untuk TikTok/Instagram/Threads; `createThumbEl`
  merender `<img src="data:image/svg+xml,...">` dengan fallback tile lokal.
- Isi poster: bar chrome palsu (3 titik + hostname), wordmark platform (shadow khas
  TikTok/IG), judul maks 3 baris, pola diagonal halus, rasio 16:9.
- **Tidak ada amend jaringan:** poster bukan request, SPECS §6.4 tetap sama.
  `SPECS.md` §7.3 diperjelas (poster vs tile).
- Tes: **45 pass, 0 fail**; QA **13/13**. Catatan QA: `navigator.clipboard` asli
  menggantung di headless Chrome 156, jadi kriteria 5 memakai buffer clipboard
  in-page; aplikasi tidak diubah.

## Hasil akhir

- Rincian per kriteria: `QA-REPORT.md` → **16/16 lulus + O1**.
- Panduan pengguna: `app/README.md` (Bahasa Indonesia).

## Berkas

- `app/index.html`, `app/styles.css`, `app/README.md`, `serve.py`
- `app/src/`: `constants.js`, `detect.js`, `search.js`, `embed.js`, `codec.js`,
  `backup.js`, `db.js`, `id.js`, `render.js`, `thumbnail.js`, `poster.js`,
  `detail.js`, `form.js`, `preview.js`, `main.js`
- `tests/`: `detect.test.js`, `search.test.js`, `embed.test.js`, `codec.test.js`,
  `backup.test.js`, `thumbnail.test.js`, `id.test.js`
- `qa/`: tangkapan (`final-390.png`, `final-1280.png`, `task7-390.png`, `task7-1280.png`,
  `task10-preview.png`, `task10-fallback.png`, `task8-form.png`, `task9-collections.png`)
  + skrip QA (`drive.mjs`, `shot.mjs`, `states.mjs`, `task6-11.mjs`, `final-qa.mjs`,
  `export-roundtrip.mjs`)
- `QA-REPORT.md` (root, di samping `SPECS.md`/`PLAN.md`)

## Fase 2: Placeholder thumbnail ala Tuckii

- Kartu kini merender placeholder huruf awal (1 huruf, 	humbLabel: label tipe/platform -> sumber -> host -> 'Bookmark') sebelum gambar termuat; gambar menimpa placeholder saat load dan dibuang saat error (placeholder tersisa sebagai fallback).
- Tidak ada endpoint baru: tetap i.ytimg.com + www.google.com/s2/favicons (SPECS �6.4), tanpa scrape HTML/backend.
- 	ests/thumbnail.test.js +1 kasus (48 pass, 0 fail); QA qa/final-qa.mjs 14/14.
- Berkas: pp/src/thumbnail.js, pp/src/render.js, pp/styles.css, 	ests/thumbnail.test.js.

## Gambar thumbnail kustom (manual, lokal)

- Form Tambah/Edit punya field gambar opsional (file lokal). Diproses di perangkat: crop tengah 16:9, resize maks 1280x720, encode WebP (fallback turun kualitas/ukuran), simpan sebagai data URL di IndexedDB (field `image`). Tidak ada unggahan/endpoint baru; SPECS 6.4 tetap.
- Prioritas thumbnail: gambar kustom > YouTube > poster lokal > favicon > placeholder. Placeholder huruf awal tetap tampil sampai gambar termuat.
- Backup JSON menyertakan `image`; import hanya menerima bitmap data URL (webp/jpeg/png) <= 500.000 karakter, selain itu dibuang tanpa menggagalkan restore.
- Tes: 51 pass, 0 fail (`tests/backup.test.js` + `tests/thumbnail.test.js`). QA: `qa/final-qa.mjs` 14/14; `qa/manual-image.mjs` 5/5 (pilih gambar, tolak non-gambar, export, persist reload, hapus).
- Berkas: `app/index.html`, `app/src/form.js`, `app/src/thumbnail.js`, `app/src/backup.js`, `app/styles.css`, `tests/*`, `qa/manual-image.mjs`, `SPECS.md`, `app/README.md`.

## Hapus preview video; tutup detail jadi ikon �

- Fitur preview video (tombol `Preview` di modal detail, popup embed iframe/video, fallback `Tonton di Sumbernya`) dihapus atas permintaan Handy: `app/src/preview.js`, `app/src/embed.js`, `tests/embed.test.js`, markup `#previewPopup`, CSS preview, dan wiring `onPreview` di `main.js` ikut dihapus.
- Modal detail kini tanpa tombol `Preview` dan `Tutup` teks; ditutup lewat ikon � (`.detail-close`, `aria-label` 'Tutup detail') di pojok kanan atas, tetap plus `Esc` dan klik backdrop.
- SPECS �7.5/�10/�12 dan README disesuaikan (preview dihapus); jaringan kini hanya untuk link yang diklik + thumbnail.
- Tes: 50 pass, 0 fail. QA `qa/final-qa.mjs` 14/14 (kriteria 7 & 15 diperbarui); `qa/manual-image.mjs` 5/5. Bukti visual: `qa/manual-detail.png`.

## Detail jadi halaman penuh (route #/item/<id>)

- Modal detail diganti halaman penuh dalam satu halaman (SPA hash route #/item/<id>), bukan file HTML terpisah dan tanpa dependency baru. Grid (`.layout`) disembunyikan saat detail tampil; tombol back/forward browser bekerja lewat `popstate`.
- `app/src/detail.js`: `renderDetailPage(container, {...})` dan `renderDetailNotFound(container, handlers)` menggantikan `openDetail` modal; tombol `? Kembali` (`.detail-back`) + label `.detail-top-label` di atas.
- `app/index.html`: `<dialog id="detailDialog">` diganti `<section id="detailPage" class="detail-page" hidden>`. `app/styles.css`: gaya dialog/close/backdrop diganti `.detail-page`/`.detail-top`/`.detail-back`/`.detail-top-label`/`.detail-missing`.
- `app/src/main.js`: routing hash (`ITEM_HASH`, `itemIdFromHash`, `openItem`/`closeItem`/`backHome`/`route`), listener `popstate` + `Escape` (lewati saat dialog lain terbuka); `onDetail` membuka route, edit-save re-render route, delete menutup route.
- `app/src/render.js`: helper `el` diexport.
- QA `qa/final-qa.mjs` kriteria 7 & 15 dan `qa/manual-image.mjs` disesuaikan ke `#detailPage`/`.detail-back` + cek route/hash.
- Tes: 50 pass, 0 fail. QA `qa/final-qa.mjs` 14/14; `qa/manual-image.mjs` 5/5. Bukti visual: `qa/manual-detail.png` (halaman detail).

## Koleksi jadi folder berwarna + atur warna

- Daftar filter Koleksi kini dirender sebagai bentuk folder: badan berwarna + tab folder di atas; `Semua Koleksi` folder hitam (teks aksen), `Belum Dikoleksi` abu; item terpilih naik (shadow lebih tebal). (`app/src/render.js`, `app/styles.css`).
- Warna disimpan di field `color` Koleksi dari palet tetap (`COLLECTION_COLORS` + `DEFAULT_COLLECTION_COLOR` + `isCollectionColor`/`safeCollectionColor` di `app/src/constants.js`). Tanpa input bebas ? nilai tetap aman untuk CSS.
- Dialog Kelola Koleksi: swatch warna per Koleksi (ubah langsung) + pemilih warna untuk Koleksi baru; `onCreate(name, color)` dan `onColorChange(id, color)` di `app/src/form.js` + wiring `app/src/main.js`. esolveNewCollection memberi warna default.
- Backup: export/import membawa `color`; nilai rusak/kosong jatuh ke default (`app/src/backup.js`). Koleksi lama tanpa warna otomatis default.
- Tes: 51 pass, 0 fail (tes baru untuk round-trip warna Koleksi). QA `qa/final-qa.mjs` 14/14; `qa/manual-image.mjs` 5/5. Bukti visual: `qa/collections-sidebar.png`, `qa/collections-manage.png`, `qa/collections-mobile.png`.

- Koleksi folder: item dikecilkan jadi kotak folder (132px, 2 kolom grid di sidebar desktop) bukan bar selebar sidebar; nama dibatasi 2 baris, lencana jumlah di bawah. Bukti: `qa/collections-sidebar.png`, `qa/collections-mobile.png`.

## Rapikan tampilan HP (390px)

- Bar atas jadi grid: brand, teks jumlah, lalu 3 tombol (+ Tambah/Import/Export) sama lebar satu baris (sebelumnya Export sendirian di baris kedua).
- Daftar Koleksi: grid kotak folder auto-fill minmax(150px,1fr) - 2 kolom rapi di HP tanpa geser mendatar (menggantikan baris scroll); desktop tetap 2 kolom di sidebar 236px.
- Chip filter tipe: satu baris yang bisa digeser di HP (hemat tinggi).
- Dialog Kelola Koleksi: nama di baris sendiri, lalu jumlah + Hapus, lalu swatch warna.
- URL di halaman detail dibungkus di HP agar terbaca penuh.
- Tes: 51 pass, 0 fail. QA qa/final-qa.mjs 14/14 (termasuk kriteria 11 tanpa overflow 390px); qa/manual-image.mjs 5/5. Bukti: qa/m-home.png, qa/m-detail.png, qa/m-manage.png, qa/m-form.png (menggantikan qa/collections-mobile.png).

- Koleksi kembali jadi folder memanjang (bar selebar kolom, tab folder di atas, nama satu baris + lencana jumlah di kanan); berlaku desktop dan HP. Bukti: qa/collections-sidebar.png, qa/collections-mobile.png.

## Sidebar koleksi bisa dibuka/tutup (HP drawer, desktop bisa disembunyikan)

- HP (<1024): sidebar jadi drawer geser dari kiri (lebar min(84vw,320px)), tertutup default, tombol Koleksi di bar atas membukanya; backdrop redup menutup saat diklik, tombol � di dalam drawer juga, dan Esc; memilih Koleksi otomatis menutup drawer.
- Desktop (>=1024): sidebar tetap tampil default; tombol Koleksi menyembunyikan/munculkan kembali, grid melebar penuh saat tersembunyi.
- Logika di `app/src/main.js` (matchMedia 1024, class `is-sidebar-open` / `is-sidebar-collapsed` di body, aria-expanded), markup di `app/index.html` (`#btnToggleSidebar`, `#sidebarBackdrop`, `#btnCloseSidebar`), CSS `app/styles.css`.
- Tes: 51 pass, 0 fail. QA 14/14 dan 5/5. Bukti: qa/sidebar-mobile-closed.png, qa/sidebar-mobile-open.png, qa/sidebar-desktop-open.png, qa/sidebar-desktop-collapsed.png.

- Revisi: tombol buka/tutup Koleksi hanya untuk HP. Desktop kembali tanpa tombol `Koleksi` - sidebar selalu tampil (default terbuka), grid tetap 2 kolom. Logika desktop-collapse dihapus; sisa drawer HP. Bukti: qa/sidebar-desktop-open.png (tanpa toggle), qa/sidebar-mobile-closed.png, qa/sidebar-mobile-open.png. qa/sidebar-desktop-collapsed.png dihapus.

## Sinkronasi antar-device (Supabase, Google OAuth, offline-first + last-write-wins)

- Keputusan user: stack Supabase, login Google OAuth, offline-first + LWW. Scope SPECS diamendemen (izIn user).
- `app/src/db.js`: `DB_VERSION` 1 -> 2; store baru `outbox` (seq autoIncrement) + `meta`; tulis lokal selalu stamp `updatedAt` + enqueue + dispatch `simpanaja:local-change`; tulis server lewat `rawPut`/`rawDelete` (tanpa stamp/outbox).
- `app/src/config.js` (baru): `SUPABASE_URL` + `SUPABASE_ANON_KEY`; kosong => sync nonaktif, app lokal penuh.
- `app/src/sync.js` (baru): import dinamis `esm.sh/@supabase/supabase-js@2` dalam try/catch (app tetap jalan offline); session + `onAuthStateChange`; pull via cursor `meta.lastPull:<table>` per tabel (halaman 200); push outbox; realtime `postgres_changes` (debounce 250ms, filter user_id); listener online/offline/focus; bootstrap data lama saat login pertama; helper murni `decide`/`toRemote`/`fromRemote`/`outboxPayload`.
- `app/index.html`: tombol `#btnAuth` + titik status `#syncStatus` di kaki sidebar; teks catatan & hint gambar diperbarui.
- `app/styles.css`: gaya `.sidebar-account` + `.sync-dot` (ok/busy/error/offline/off).
- `app/src/main.js`: wiring `initSync` (di-await tidak, agar CDN tak menahan render), `paintSync`, klik Masuk/Keluar, re-render + `route()` saat perubahan remote.
- `supabase/schema.sql` (baru): tabel `collections`/`bookmarks` (user_id default auth.uid(), created_at/updated_at/deleted_at, konten nullable untuk tombstone), RLS per-user, replica identity full, publication realtime.
- `tests/sync.test.js` (baru): 6 tes fungsi murni (LWW, tombstone, mapping camel<->snake, outbox tombstone).
- `SPECS.md`: �5 anti-goal privasi dipertegas (sync opsional setelah Masuk), �6.1 offline-first + sync opsional, �6.3, �6.4 whitelist + Supabase/esm.sh, �6.7 redirect OAuth, �6.8 perangkat kedua, �7.9 baru (Sinkronasi), �8 model data + deletedAt/updatedAt.
- `app/README.md`: intro, catatan, fitur gambar, seksi Sinkron + langkah setup Supabase, daftar non-fitur diperbarui.
- Verifikasi: unit 57 pass / 0 fail; `qa/final-qa.mjs` 14/14; `qa/manual-image.mjs` 5/5; cek runtime headless tanpa error, tombol tampil `Lokal` (nonaktif) saat config kosong. Bukti: qa/sync-auth-empty.png.
- Langkah manual user: buat project Supabase, jalankan `supabase/schema.sql`, aktifkan Google OAuth + Redirect URLs, isi `app/src/config.js`, deploy ulang.

