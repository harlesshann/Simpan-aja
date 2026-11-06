# SimpanAja Implementation Plan

&gt; \*\*For agentic workers:\*\* REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

\*\*Goal:\*\* Membangun SimpanAja — website bookmark manager pribadi satu halaman (dashboard) yang client-only dan lokal, untuk menyimpan Video, Website, Command, Repo GitHub, dan Extension, lengkap dengan search, Koleksi, preview video bersyarat, pintu Muse link 1-tap, dan export/import JSON.

\*\*Architecture:\*\* Situs statis tanpa build step dan tanpa dependensi luar: HTML + CSS + JavaScript ES modules vanilla. Logika murni (deteksi tipe, search, embed, codec link Muse, backup) dipisah ke modul-modul kecil yang dapat diuji Node tanpa browser; lapisan IndexedDB dibuat tipis di atasnya; UI (render kartu, formulir, preview, wiring) mengonsumsi keduanya. Semua data hidup di IndexedDB browser HP utama pengguna pada satu alamat HTTPS kanonis.

\*\*Tech Stack:\*\* HTML5, CSS (custom properties, responsive grid), JavaScript ES2022 modules, IndexedDB (wrapper internal tipis, tanpa pustaka), Node ≥ 20 built-in test runner (`node --test`) untuk logika murni, Python 3 `http.server` hanya untuk penyajian lokal saat QA. Tanpa framework, tanpa bundler, tanpa panggilan jaringan dari aplikasi selain yang diizinkan spec.

\*\*Spec:\*\* `~/workspace/projects/simpanaja/[SPECS.md](http://SPECS.md)` (APPROVED Handy 2026-11-03) — pelaksana wajib membaca spec dan plan bersama-sama; bila bertentangan, spec yang menang.

## Global Constraints

- Bahasa antarmuka &amp; semua pesan pengguna: \*\*Bahasa Indonesia\*\*.

- Enum tipe persis: `video`, `website`, `command`, `repo`, `extension`, `other`. Label tampil: Video, Website, Command, Repo GitHub, Extension, Lainnya.

- \*\*Tanpa\*\* login, backend, sync, PWA (manifest/service worker/`[navigator.storage](http://navigator.storage).persist()`), tag, Pin/Favorit, auto-fetch metadata, dan impor otomatis dari platform lain (SPECS §4).

- Tidak ada panggilan jaringan dari aplikasi kecuali: membuka link yang diklik pengguna dan memuat embed saat preview dibuka. Tidak ada analytics. Tidak ada URL eksternal di kode selain host embed pada modul embed (Task 4).

- Data hanya di IndexedDB browser itu: nama database `simpanaja`, versi `1`, object store `bookmarks` &amp; `collections`, `keyPath: 'id'`.

- URL bookmark hanya skema [`http://`/`https://`](http://`/`https://`). Teks pengguna (judul, catatan, command) selalu dirender sebagai teks (textContent/createElement), \*\*tidak pernah\*\* lewat `innerHTML` dan tidak pernah dijalankan.

- Payload link Muse: JSON di-encode base64url UTF-8 tanpa padding pada fragment `#add=`; batas payload \*\*2.000 karakter\*\* (SPECS §7.7).

- Nama file export persis: `simpanaja-backup-YYYY-MM-DD.json` (tanggal lokal pengguna).

- Rumah kanonis: satu alamat HTTPS stabil; perangkat/browser utama = \*\*HP\*\* (SPECS §6 butir 7–9). QA utama pada viewport ±390px, kedua ±1280px.

- Proyek ini \*\*bukan\*\* repositori git (terverifikasi) — jangan `git init`/commit; setiap task diakhiri checkpoint hasil tes, bukan commit. Keputusan repo/hosting di luar plan ini.

- Deliverable aplikasi tinggal di subfolder `app/` di dalam folder proyek ini; tes di `tests/`; tidak ada file aplikasi di root proyek selain [`SPECS.md`](http://SPECS.md), [`PLAN.md`](http://PLAN.md), dan laporan QA.

## Review Focus

Lima kelas masukan/kegagalan yang paling mungkin menggigit pengguna, masing-masing dipin ke task pemiliknya:

1. \*\*File import rusak/salah\*\* (JSON tidak valid, `app`/`version` tidak cocok, field hilang) → ditolak utuh, data yang ada tidak berubah sedikit pun. → Task 6 &amp; Task 11.

2. \*\*Payload `#add=` jahat/rusak\*\* (base64 tidak valid, &gt; 2.000 karakter, `url` ber-skema `javascript:`, tipe tidak dikenal) → pesan kesalahan + formulir kosong, tidak ada yang tersimpan otomatis. → Task 5 &amp; Task 11.

3. \*\*Aturan duplikat menyimpang antar jalur\*\* (tambah manual vs link Muse vs import memakai kunci duplikat berbeda) → satu fungsi penentu duplikat yang sama dipakai ketiga jalur. → Task 6 (fungsi), Task 8 &amp; 11 (pemakaian).

4. \*\*Teks command/judul berisi HTML/script\*\* → tampil sebagai teks polos, tidak ter-eksekusi, tidak merusak kartu lain. → Task 8 (render) &amp; Task 12 (audit).

5. \*\*Sumber video yang memblokir embed\*\* (Threads/Instagram/dll.) → langsung fallback rapi berisi info + tombol sumber, tidak pernah iframe rusak/blank. → Task 4 &amp; Task 10.

---

## File Structure

- `app/index.html` — kerangka dashboard satu halaman (header, search, chip tipe, filter Koleksi, grid, wadah modal &amp; popup), memuat `styles.css` dan `src/main.js` saja.

- `app/styles.css` — token visual, lencana per tipe, layout responsif 390px/1280px, gaya kartu/modal/popup.

- `app/src/constants.js` — enum tipe, label, dan konstanta bersama (batas payload, nama DB).

- `app/src/detect.js` — deteksi tipe dari URL, label sumber, normalisasi &amp; validasi URL (murni, tanpa DOM).

- `app/src/search.js` — filter search + tipe + Koleksi dan urutan (murni).

- `app/src/embed.js` — penentu preview per sumber video (murni).

- `app/src/codec.js` — encode/decode/validasi payload link 1-tap Muse (murni).

- `app/src/backup.js` — bangun export dan rencanakan import/merge (murni; perubahan data diterapkan Task 7/11 lewat hasil rencananya).

- `app/src/db.js` — satu-satunya modul yang menyentuh IndexedDB: CRUD bookmark/Koleksi + hapus-Koleksi-sekaligus-lepas-item dalam satu transaksi.

- `app/src/render.js` — bangun elemen kartu (thumbnail + lencana + judul + meta) &amp; daftar Koleksi dari data (DOM aman, tanpa `innerHTML` untuk data pengguna); kartu = tombol pembuka detail.

- `app/src/thumbnail.js` — pilih sumber gambar thumbnail per bookmark (YouTube asli / favicon / poster lokal / tile lokal); satu-satunya modul yang menyusun URL gambar eksternal.

- `app/src/poster.js` — poster SVG lokal deterministik untuk platform tertutup (TikTok/Instagram/Threads): bar chrome palsu + hostname + nama platform + judul. Tanpa jaringan, tanpa input pengguna.

- `app/src/detail.js` — modal detail terpusat: isi lengkap satu bookmark + semua aksi (Buka/Copy/Preview/Edit/Hapus/Tutup).

- `app/src/form.js` — formulir tambah/edit (termasuk mode Command &amp; peringatan duplikat) dan dialog kelola Koleksi.

- `app/src/preview.js` — perilaku popup preview sebagai modal tengah yang dipicu dari detail (tutup/Esc/klik luar, buang embed saat ditutup).

- `app/src/main.js` — bootstrap: buka DB, muat state, wiring semua event, tangani fragment `#add=`, jalankan export/import.

- `tests/detect.test.js`, `tests/search.test.js`, `tests/embed.test.js`, `tests/codec.test.js`, `tests/backup.test.js`, `tests/thumbnail.test.js` — tes Node untuk modul murni.

- `app/[README.md](http://README.md)` — cara pakai &amp; peringatan alamat kanonis/backup (Task 12).

---

### Task 1: Konstanta &amp; deteksi tipe dari URL

\*\*Files:\*\*

- Create: `app/src/constants.js`, `app/src/detect.js`

- Test: `tests/detect.test.js`

\*\*Interfaces:\*\*

- Produces: `TYPES`, `TYPE_LABELS`, `MAX_ADD_PAYLOAD_CHARS = 2000`, `DB_NAME = 'simpanaja'`, `DB_VERSION = 1` (dari `constants.js`); `detectType(rawUrl) -> type | null`, `sourceLabel(rawUrl) -> string`, `normalizeUrl(rawUrl) -> string | null`, `isValidHttpUrl(rawUrl) -> boolean`, `deriveTitle({ type, url, command }) -> string` (dari `detect.js`). Task 5, 6, 8, 11 mengonsumsi nama-nama ini persis.

- \[ \] \*\*Step 1: Tulis tes yang gagal\*\* — `tests/detect.test.js` (node:test + assert) menegaskan nilai spec §8.3 persis:

\`\`\`js

assert.equal(detectType('[https://github.com/stablyai/orca](https://github.com/stablyai/orca)'), 'repo');

assert.equal(detectType('[https://youtu.be/abc123](https://youtu.be/abc123)'), 'video');

assert.equal(detectType('[https://www.tiktok.com/@x/video/123](https://www.tiktok.com/@x/video/123)'), 'video');

assert.equal(detectType('[https://www.threads.com/@x/post/abc](https://www.threads.com/@x/post/abc)'), 'video');

assert.equal(detectType('[https://chromewebstore.google.com/detail/x/abc](https://chromewebstore.google.com/detail/x/abc)'), 'extension');

assert.equal(detectType('[https://addons.mozilla.org/en-US/firefox/addon/x/](https://addons.mozilla.org/en-US/firefox/addon/x/)'), 'extension');

assert.equal(detectType('[https://example.com/artikel](https://example.com/artikel)'), 'website');

assert.equal(detectType('javascript:alert(1)'), null);

assert.equal(sourceLabel('[https://github.com/a/b](https://github.com/a/b)'), 'GitHub');

assert.equal(sourceLabel('[https://sub.example.co.id/x](https://sub.example.co.id/x)'), '[sub.example.co.id](http://sub.example.co.id)');

assert.equal(normalizeUrl('[HTTPS://WWW.GitHub.com/a/b/](HTTPS://WWW.GitHub.com/a/b/)'), normalizeUrl('[https://github.com/a/b](https://github.com/a/b)'));

assert.equal(isValidHttpUrl('[ftp://example.com](ftp://example.com)'), false);

\`\`\`

- \[ \] \*\*Step 2: Jalankan tes, pastikan gagal\*\* — Run: `node --test tests/detect.test.js` — Expected: FAIL (modul belum ada).

- \[ \] \*\*Step 3: Implementasikan\*\* `constants.js` dan `detect.js` sesuai tanda tangan di atas. `normalizeUrl` hanya melakukan: skema &amp; host huruf kecil, buang awalan `www.` pada host, buang trailing slash pada path; query dipertahankan apa adanya; URL tidak valid → `null`. Tabel host→tipe dan host→label persis seperti SPECS §8.3. `deriveTitle` mengikuti tabel SPECS §8.4 (murni, tanpa jaringan).

- \[ \] \*\*Step 4: Jalankan tes, pastikan lulus\*\* — Run: `node --test tests/detect.test.js` — Expected: PASS semua.

- \[ \] \*\*Step 5: Checkpoint\*\* — Catat hasil tes (jumlah pass/fail) di log eksekusi; lanjut hanya bila PASS.

### Task 2: Search, filter &amp; urutan

\*\*Files:\*\*

- Create: `app/src/search.js`

- Test: `tests/search.test.js`

\*\*Interfaces:\*\*

- Consumes: tipe dari `constants.js`.

- Produces: `filterBookmarks(bookmarks, collectionsById, { query = '', type = 'all', collection = 'all' }) -> Bookmark[]` — `collectionsById` adalah `Map<id, name>`; `collection` bernilai `'all'`, `'none'` (hanya `collectionId === null`), atau id Koleksi. Task 8 &amp; 11 mengonsumsi ini.

- \[ \] \*\*Step 1: Tulis tes yang gagal\*\* — fixture 4 bookmark (salah satunya Command berisi `ffmpeg -i in.mp4 out.mp3`, satu tanpa Koleksi) menegaskan SPECS §7.4 &amp; kriteria §10.3–10.4:

\`\`\`js

// kata dicari di isi command, bukan judul

assert.deepEqual(ids(filterBookmarks(bs, cmap, { query: 'ffmpeg' })), ['cmd1']);

// multi-kata AND lintas field: judul + nama Koleksi

assert.deepEqual(ids(filterBookmarks(bs, cmap, { query: 'render motion' })), ['vid1']);

// irisan search + chip tipe + Koleksi

assert.deepEqual(ids(filterBookmarks(bs, cmap, { query: '', type: 'video', collection: 'none' })), []);

// urutan terbaru di atas; query kosong = semua

assert.deepEqual(ids(filterBookmarks(bs, cmap, {})), ['paling-baru', 'cmd1', 'vid1', 'paling-lama']);

\`\`\`

- \[ \] \*\*Step 2: Jalankan, pastikan gagal\*\* — `node --test tests/search.test.js` — Expected: FAIL.

- \[ \] \*\*Step 3: Implementasikan\*\* `filterBookmarks`: substring tidak peka huruf besar/kecil di gabungan judul+catatan+url+command+nama Koleksi; semua kata query (pisah spasi) wajib ditemukan; hasil diurutkan `createdAt` menurun, seri dipecah oleh `id` menaik agar deterministik; tidak memutasi array masukan.

- \[ \] \*\*Step 4: Jalankan, pastikan lulus\*\* — Expected: PASS.

- \[ \] \*\*Step 5: Checkpoint\*\* — Catat hasil tes.

### Task 3: Penentu preview video (embed/fallback)

\*\*Files:\*\*

- Create: `app/src/embed.js`

- Test: `tests/embed.test.js`

\*\*Interfaces:\*\*

- Produces: `previewFor(bookmark) -> { kind: 'youtube' | 'file' | 'tiktok', embedUrl: string } | { kind: 'fallback' } | { kind: 'none' }` — `'none'` untuk tipe selain `video`. Task 10 mengonsumsi ini; modul ini adalah \*\*satu-satunya\*\* tempat URL embed boleh muncul di seluruh kode.

- \[ \] \*\*Step 1: Tulis tes yang gagal\*\* — menegaskan tabel SPECS §7.5 persis:

\`\`\`js

assert.deepEqual(previewFor(v('[https://www.youtube.com/watch?v=dQw4w9WgXcQ](https://www.youtube.com/watch?v=dQw4w9WgXcQ)')),

  { kind: 'youtube', embedUrl: '[https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ](https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ)' });

assert.equal(previewFor(v('[https://youtu.be/dQw4w9WgXcQ')).kind](https://youtu.be/dQw4w9WgXcQ')).kind), 'youtube');

assert.equal(previewFor(v('[https://www.youtube.com/shorts/dQw4w9WgXcQ')).kind](https://www.youtube.com/shorts/dQw4w9WgXcQ')).kind), 'youtube');

assert.deepEqual(previewFor(v('[https://cdn.example.com/a.webm](https://cdn.example.com/a.webm)')),

  { kind: 'file', embedUrl: '[https://cdn.example.com/a.webm](https://cdn.example.com/a.webm)' });

assert.equal(previewFor(v('[https://www.tiktok.com/@x/video/7300000000000000000')).kind](https://www.tiktok.com/@x/video/7300000000000000000')).kind), 'tiktok');

assert.deepEqual(previewFor(v('[https://www.threads.com/@x/post/abc](https://www.threads.com/@x/post/abc)')), { kind: 'fallback' });

assert.deepEqual(previewFor(v('[https://www.instagram.com/reel/abc/](https://www.instagram.com/reel/abc/)')), { kind: 'fallback' });

assert.deepEqual(previewFor({ type: 'website', url: '[https://example.com](https://example.com)' }), { kind: 'none' });

\`\`\`

- \[ \] \*\*Step 2: Jalankan, pastikan gagal\*\* — `node --test tests/embed.test.js`.

- \[ \] \*\*Step 3: Implementasikan\*\* `previewFor`: ekstrak ID YouTube dari pola `watch?v=`, [`youtu.be/`](http://youtu.be/`), `shorts/`; file langsung hanya untuk path berakhiran `.mp4`/`.webm`; TikTok embed [`https://www.tiktok.com/embed/v2/<id>`](https://www.tiktok.com/embed/v2/<id>`) hanya bila ID numerik terekstrak, selain itu `{ kind: 'fallback' }`; semua sumber video lain → `fallback`.

- \[ \] \*\*Step 4: Jalankan, pastikan lulus\*\* — Expected: PASS.

- \[ \] \*\*Step 5: Checkpoint\*\* — Catat hasil tes.

### Task 4: Codec link 1-tap Muse

\*\*Files:\*\*

- Create: `app/src/codec.js`

- Test: `tests/codec.test.js`

\*\*Interfaces:\*\*

- Consumes: `MAX_ADD_PAYLOAD_CHARS`, `TYPES` (Task 1); `isValidHttpUrl` (Task 1).

- Produces: `encodeAddPayload(obj) -> string` (melempar `RangeError` bila JSON &gt; 2.000 karakter) dan `decodeAddPayload(str) -> { ok: true, value } | { ok: false, error: 'invalid' | 'too_long' | 'bad_url' | 'bad_type' }`. `value` ternormalisasi: `{ title, url, type, command, collection, note }` dengan field tak relevan bernilai `null`; `title` boleh `''` (opsional). Task 11 mengonsumsi ini.

- \[ \] \*\*Step 1: Tulis tes yang gagal\*\*:

\`\`\`js

const s = encodeAddPayload({ v: 1, title: 'Video Remotion', url: '[https://youtu.be/x1](https://youtu.be/x1)', type: 'video', collection: 'Motion Design', note: 'teknik easing' });

assert.match(s, /^[A-Za-z0-9\_-]+$/); // base64url tanpa padding

assert.deepEqual(decodeAddPayload(s), { ok: true, value: { title: 'Video Remotion', url: '[https://youtu.be/x1](https://youtu.be/x1)', type: 'video', command: null, collection: 'Motion Design', note: 'teknik easing' } });

assert.deepEqual(decodeAddPayload('!!!bukan-base64!!!'), { ok: false, error: 'invalid' });

assert.equal(decodeAddPayload(encodeRaw({ v: 1, title: 'X', url: 'javascript:alert(1)', type: 'video' })).error, 'bad_url');

assert.equal(decodeAddPayload(encodeRaw({ v: 1, title: 'X', url: '[https://a.com](https://a.com)', type: 'aplikasi' })).error, 'bad_type');

assert.throws(() =&gt; encodeAddPayload({ v: 1, title: 'X', url: '[https://a.com](https://a.com)', type: 'website', note: 'n'.repeat(2100) }), RangeError);

assert.equal(decodeAddPayload(encodeRaw({ v: 1, title: 'X', type: 'command', command: 'ls -la', note: 'x'.repeat(2100) })).error, 'too_long');

\`\`\`

(`encodeRaw` adalah pembantu tes lokal yang meng-encode JSON apa adanya tanpa batas, untuk menempa payload buruk.)

- \[ \] \*\*Step 2: Jalankan, pastikan gagal\*\* — `node --test tests/codec.test.js`.

- \[ \] \*\*Step 3: Implementasikan\*\* codec dengan `TextEncoder`/`TextDecoder` + base64url manual (tanpa `btoa` mentah agar UTF-8 aman). Validasi decode: JSON parse → `v === 1` → `title` **opsional** (bila ada wajib string; selain itu diturunkan §8.4) → `type` ∈ `TYPES` → untuk `type === 'command'` wajib `command` tidak kosong, selain itu `url` wajib lolos `isValidHttpUrl`; panjang JSON hasil decode &gt; `MAX_ADD_PAYLOAD_CHARS` → `too_long`. Urutan pemeriksaan: `invalid` (struktur/base64/JSON/`v`/tipe `title` salah) → `too_long` → `bad_type` → `bad_url`.

- \[ \] \*\*Step 4: Jalankan, pastikan lulus\*\* — Expected: PASS.

- \[ \] \*\*Step 5: Checkpoint\*\* — Catat hasil tes.

### Task 5: Export &amp; rencana import (merge) JSON

\*\*Files:\*\*

- Create: `app/src/backup.js`

- Test: `tests/backup.test.js`

\*\*Interfaces:\*\*

- Consumes: `normalizeUrl` (Task 1).

- Produces: `buildExport({ bookmarks, collections }, now) -> { data, filename }` dengan `data` persis format SPECS §7.8, dan `planImport(text, existing, makeId) -> { ok: false, error: string } | { ok: true, addCollections, addBookmarks, skippedDuplicates, newCollections }` — murni, tidak menyentuh DB. `makeId: () => string` disuntikkan pemanggil. Task 11 mengonsumsi keduanya.

- Kunci duplikat bersama (dipakai juga Task 8): export juga `duplicateKey(bookmark) -> string` = `'url:' + normalizeUrl(url)` untuk tipe berbasis link, `'cmd:' + command` untuk Command (tidak bergantung judul, karena judul kini opsional), dan `findDuplicate(bookmarks, candidate) -> Bookmark | undefined`.

- \[ \] \*\*Step 1: Tulis tes yang gagal\*\*:

\`\`\`js

const { data, filename } = buildExport(state, new Date(2026, 10, 3, 9, 30));

assert.equal(filename, 'simpanaja-backup-2026-11-03.json');

assert.equal([data.app](http://data.app), 'SimpanAja'); assert.equal(data.version, 1);

// import file rusak / salah aplikasi: ditolak utuh (Review Focus 1)

assert.equal(planImport('{bukan json', existing, idGen).ok, false);

assert.equal(planImport(JSON.stringify({ app: 'Lain', version: 1, collections: [], bookmarks: [] }), existing, idGen).ok, false);

// restore ke kosong: semua masuk, id &amp; createdAt dipertahankan (SPECS §7.8, kriteria §10.9/10.13)

const r1 = planImport(exportText, { bookmarks: [], collections: [] }, idGen);

assert.equal(r1.addBookmarks[0].id, 'b1'); assert.equal(r1.addBookmarks[0].createdAt, '2026-11-01T00:00:00.000Z');

// import kedua kalinya: semua duplikat dilewati

const r2 = planImport(exportText, stateSesudahImport, idGen);

assert.equal(r2.addBookmarks.length, 0); assert.equal(r2.skippedDuplicates, 1);

// tabrakan id dengan bookmark berbeda: id baru, timestamp tetap

// Koleksi dicocokkan berdasar nama tak peka huruf: 'motion design' memakai Koleksi 'Motion Design' yang ada

\`\`\`

- \[ \] \*\*Step 2: Jalankan, pastikan gagal\*\* — `node --test tests/backup.test.js`.

- \[ \] \*\*Step 3: Implementasikan\*\* sesuai tanda tangan &amp; SPECS §7.8: validasi utuh dulu (parse, `app`, `version`, setiap bookmark punya field wajib sesuai tipenya) — satu saja tidak valid → `{ ok: false }` tanpa hasil parsial; Koleksi dicocokkan per nama; duplikat per `duplicateKey`; `id`/`createdAt`/`updatedAt` dipertahankan, tabrakan `id` bukan-duplikat → `makeId()`.

- \[ \] \*\*Step 4: Jalankan, pastikan lulus\*\* — Expected: PASS. Jalankan juga seluruh tes lama: `node --test tests/` — Expected: semua PASS.

- \[ \] \*\*Step 5: Checkpoint\*\* — Catat hasil tes.

### Task 6: Lapisan penyimpanan IndexedDB

\*\*Files:\*\*

- Create: `app/src/db.js`

- Create: `app/index.html` (kerangka minimal saja di task ini: judul + `<main id="app">` + memuat `src/main.js`; bentuk penuhnya Task 7)

- Create: `app/src/main.js` (bootstrap minimal: buka DB, tulis hasil smoke test ke konsol &amp; satu baris status di halaman; wiring penuhnya Task 7–11)

\*\*Interfaces:\*\*

- Produces (semua mengembalikan Promise): `openDB()`, `listBookmarks()`, `listCollections()`, `putBookmark(b)`, `deleteBookmark(id)`, `putCollection(c)`, `deleteCollectionAndDetach(collectionId)` — yang terakhir dalam \*\*satu transaksi\*\*: hapus Koleksi + set `collectionId = null` pada semua bookmark-nya (SPECS §7.6). Task 7–11 mengonsumsi nama-nama ini persis.

- \[ \] \*\*Step 1: Tulis pemeriksaan yang gagal\*\* — halaman smoke test manual terstruktur: sajikan `app/` (`python3 -m http.server 8000 --directory app`), buka [`http://localhost:8000`](http://localhost:8000`) di Chromium headless, dan jalankan di konsol urutan: put 1 Koleksi + 1 bookmark → list (harus 1/1) → `deleteCollectionAndDetach` → list (Koleksi 0, bookmark tetap ada dengan `collectionId === null`) → reload halaman → list lagi (data bertahan). Sebelum `db.js` ada, pemeriksaan ini gagal (modul tidak ditemukan).

- \[ \] \*\*Step 2: Implementasikan\*\* `db.js`: wrapper Promise tipis atas `[indexedDB.open](http://indexedDB.open)(DB_NAME, DB_VERSION)`; `onupgradeneeded` membuat kedua store; setiap fungsi membuka transaksi sendiri kecuali `deleteCollectionAndDetach` (satu transaksi lintas kedua store). Tidak ada logika bisnis (duplikat/search/dll.) di modul ini.

- \[ \] \*\*Step 3: Jalankan pemeriksaan, pastikan lulus\*\* — ulangi urutan Step 1; Expected: semua hasil sesuai, termasuk setelah reload.

- \[ \] \*\*Step 4: Checkpoint\*\* — Catat hasil pemeriksaan (tangkapan konsol/hasil urutan) di log eksekusi.

### Task 7: Kerangka dashboard, render kartu &amp; filter

\*\*Files:\*\*

- Modify: `app/index.html` (bentuk penuh SPECS §7.3: header + search + chip tipe + filter Koleksi + grid + wadah modal/popup + keadaan kosong)

- Create: `app/styles.css`

- Create: `app/src/render.js`

- Modify: `app/src/main.js` (state, muat data dari Task 6, wiring search/chip/filter → `filterBookmarks` Task 2 → render ulang)

\*\*Interfaces:\*\*

- Consumes: `listBookmarks/listCollections` (Task 6), `filterBookmarks` (Task 2), `TYPE_LABELS` (Task 1), `previewFor` bukan di sini (Task 10).

- Produces: `createCardEl(bookmark, collectionName, sourceLabel, handlers) -> HTMLElement`, `createThumbEl(bookmark, sourceLabel) -> HTMLElement` dan `renderCollectionFilter(el, collections, counts, selected)` dari `render.js`; `handlers = { onDetail, onCopy, onPreview, onEdit, onDelete }` — kartu tanpa tombol; klik/`Enter`/`Space` memanggil `onDetail` (diisi Task 8/10; di task ini belum terdaftar). Task 8–10 mengonsumsi pola handlers ini.

- \[ \] \*\*Step 1: Tulis pemeriksaan yang gagal\*\* — dengan data contoh sementara (3 bookmark: Video/Command/Repo, 1 Koleksi) yang di-seed lewat konsol memakai API Task 6: pada 390px grid 1 kolom; mengetik kata di search menyaring daftar; chip `Command` hanya menampilkan kartu Command; memilih Koleksi menyaring; keadaan kosong tampil saat filter tidak menghasilkan apa-apa. Sebelum task ini, halaman hanya menampilkan baris status Task 6 → pemeriksaan gagal.

- \[ \] \*\*Step 2: Implementasikan\*\* `index.html` + `styles.css`: token warna dengan \*\*lencana berbeda per tipe\*\* (6 tipe mudah dibedakan sekilas), layout header (nama aplikasi, jumlah total, tombol `+ Tambah`, `Import`, `Export` — Import/Export dirender di sini, wiring-nya Task 11)/search/chip/grid, daftar Koleksi sebagai sidebar di ≥1024px dan chip mendatar yang dapat di-scroll di bawah itu, fokus terlihat, target sentuh ≥ 40px. Sertakan catatan kecil yang selalu terlihat di bawah header sesuai SPECS §6 butir 3: data tersimpan lokal di browser ini dan export JSON adalah jalan backup-nya. Teks statis semua Bahasa Indonesia.

- \[ \] \*\*Step 3: Implementasikan\*\* `render.js` + wiring di `main.js`: kartu dibangun hanya dengan `createElement`/`textContent` (Review Focus 4); isi kartu persis SPECS §7.3 (thumbnail 16:9 via `createThumbEl` — YouTube asli/favicon/tile lokal, lencana, judul, sumber via `sourceLabel`, Koleksi, tanggal, cuplikan command monospace); kartu adalah tombol (`role="button"`, `tabindex="0"`, `Enter`/`Space`) yang memanggil `onDetail`; semua aksi (`Buka`/`Copy`/`Preview`/`Edit`/`Hapus`/`Tutup`) hidup di modal detail (§7.3), bukan di kartu. Urutan tampilan selalu keluaran `filterBookmarks`.

- \[ \] \*\*Step 4: Jalankan pemeriksaan, pastikan lulus\*\* — ulangi Step 1 pada \*\*390px dan 1280px\*\* (tangkapan layar headless Chromium untuk kedua ukuran, diperiksa visual: tidak ada tumpang tindih, grid 1 kolom di HP &amp; multi-kolom di desktop — kriteria SPECS §10.11).

- \[ \] \*\*Step 5: Checkpoint\*\* — Simpan kedua tangkapan layar di folder proyek (`qa/task7-390.png`, `qa/task7-1280.png`) dan catat hasilnya.

### Task 8: Formulir tambah/edit, deteksi otomatis &amp; duplikat

\*\*Files:\*\*

- Create: `app/src/form.js`

- Modify: `app/src/detail.js` (tombol `Edit` &amp; `Hapus` di modal detail lewat handlers)

- Modify: `app/src/main.js` (daftarkan handler tambah/edit/hapus; konfirmasi hapus; segarkan daftar sesudah simpan)

\*\*Interfaces:\*\*

- Consumes: `detectType`, `deriveTitle` (Task 1), `findDuplicate` (Task 5), `putBookmark/deleteBookmark` (Task 6).

- Produces: `openBookmarkForm({ mode, initial, collections, onSave })` dari `form.js` — `initial` adalah bookmark/parsial awal (dipakai Task 11 untuk hasil decode link Muse); `onSave(bookmark)` dipanggil hanya setelah validasi &amp; (bila duplikat) konfirmasi pengguna.

- \[ \] \*\*Step 1: Tulis pemeriksaan yang gagal\*\* — skenario SPECS §10.1, 10.2, 10.10: tambah satu item per tipe (Command tanpa kolom URL, kolom command monospace tampil); tempel link GitHub → tipe berubah Repo, YouTube → Video, Chrome Web Store → Extension, situs biasa → Website; ganti tipe manual lalu tempel link lain → tipe \*\*tidak\*\* ditimpa deteksi; simpan URL yang sama dua kali → peringatan menyebut judul item lama (atau URL/command bila kosong) dengan pilihan `Tetap Simpan`/`Batal`; **tambah dengan kolom judul dikosongkan → judul diturunkan otomatis (SPECS §8.4)**; edit mengubah judul &amp; `updatedAt` tetapi bukan `createdAt`; hapus meminta konfirmasi.

- \[ \] \*\*Step 2: Implementasikan\*\* `form.js`: modal satu formulir untuk tambah &amp; edit; paste/ketik URL menjalankan `detectType` hanya selama pengguna belum menyentuh pemilih tipe pada sesi formulir itu; validasi URL http(s) wajib (kecuali Command: command wajib), judul **opsional** — bila kosong diisi `deriveTitle` (§8.4) saat simpan, dengan pesan Bahasa Indonesia di dekat kolom; saat simpan, `findDuplicate` (mengabaikan item yang sedang diedit) → dialog peringatan duplikat bila ditemukan; id baru via `crypto.randomUUID()`; `createdAt`/`updatedAt` ISO sekarang.

- \[ \] \*\*Step 3: Jalankan pemeriksaan, pastikan lulus\*\* — semua skenario Step 1, termasuk judul berisi `<img src=x onerror=alert(1)>` tampil sebagai teks polos di kartu (Review Focus 4).

- \[ \] \*\*Step 4: Checkpoint\*\* — Catat hasil pemeriksaan per skenario.

### Task 9: Kelola Koleksi

\*\*Files:\*\*

- Modify: `app/src/form.js` (tambah `openCollectionManager({ collections, counts, onChange })`: buat/rename/hapus)

- Modify: `app/src/main.js` (tombol Kelola Koleksi di area filter; sesudah perubahan, render ulang filter &amp; grid)

\*\*Interfaces:\*\*

- Consumes: `putCollection`, `deleteCollectionAndDetach` (Task 6).

- Produces: `openCollectionManager` seperti di atas; `onChange()` memberi tahu `main.js` untuk memuat ulang state.

- \[ \] \*\*Step 1: Tulis pemeriksaan yang gagal\*\* — skenario SPECS §10.6: buat Koleksi "Motion Design" → muncul di filter beserta hitungan item; buat lagi "motion design" → ditolak sebagai nama kembar; rename berhasil; hapus Koleksi berisi 2 bookmark → Koleksi hilang, kedua bookmark tetap ada dan tampil di filter `Belum Dikoleksi`.

- \[ \] \*\*Step 2: Implementasikan\*\* dialog kelola: daftar Koleksi + hitungan, kolom nama baru, rename sebaris, hapus dengan konfirmasi yang menyebut jumlah item yang akan menjadi "Belum Dikoleksi" (bukan terhapus).

- \[ \] \*\*Step 3: Jalankan pemeriksaan, pastikan lulus\*\*.

- \[ \] \*\*Step 4: Checkpoint\*\* — Catat hasilnya.

### Task 10: Preview popup video (modal dari detail)

\*\*Files:\*\*

- Create: `app/src/preview.js`

- Modify: `app/src/detail.js` (tombol `Preview` hanya untuk tipe `video`)

- Modify: `app/src/main.js` (daftarkan `onPreview`)

\*\*Interfaces:\*\*

- Consumes: `previewFor` (Task 3).

- Produces: `openPreview(bookmark)` / `closePreview()` dari `preview.js` — satu popup tunggal dipakai ulang; menutup popup \*\*menghapus\*\* elemen embed dari DOM.

- \[ \] \*\*Step 1: Tulis pemeriksaan yang gagal\*\* — skenario SPECS §10.7 &amp; §10.15: klik kartu YouTube → modal detail terbuka → tekan `Preview` → popup berisi iframe `youtube-nocookie.com/embed/…` dan detail tertutup; klik kartu Threads → `Preview` → popup fallback (judul, sumber, catatan, tombol `Tonton di Sumbernya`), \*\*tanpa\*\* iframe; file `.mp4` → elemen `<video controls>`; `Esc`/klik luar menutup dan iframe/video hilang dari DOM (pemutaran berhenti); tidak ada autoplay bersuara.

- \[ \] \*\*Step 2: Implementasikan\*\* `preview.js`: popup selalu tampil sebagai \*\*modal tengah\*\* (tidak ada hover); isi popup dibangun dari hasil `previewFor` — `youtube`/`tiktok` → iframe (`allow` secukupnya, tanpa `autoplay`), `file` → `<video controls preload="metadata">`, `fallback` → panel info + tombol buka sumber; satu popup aktif pada satu waktu.

- \[ \] \*\*Step 3: Jalankan pemeriksaan, pastikan lulus\*\* — pada viewport 1280px dan 390px (satu pola modal).

- \[ \] \*\*Step 4: Checkpoint\*\* — Simpan tangkapan popup YouTube &amp; fallback (`qa/task10-preview.png`, `qa/task10-fallback.png`) dan catat hasilnya.

### Task 11: Pintu Muse (link 1-tap) &amp; export/import UI

\*\*Files:\*\*

- Modify: `app/src/main.js` (tangani `#add=` saat bootstrap; tombol Export/Import di header; ringkasan hasil import)

- Consumes: `decodeAddPayload` (Task 4), `buildExport/planImport` (Task 5), `openBookmarkForm` (Task 8), `putBookmark/putCollection` (Task 6)

\*\*Interfaces:\*\*

- Produces: alur lengkap SPECS §7.7–7.8 — tidak ada API baru; task ini murni wiring &amp; urutan.

- \[ \] \*\*Step 1: Tulis pemeriksaan yang gagal\*\* — skenario SPECS §10.8, 10.9, 10.13, 10.14: (a) buka alamat aplikasi + `#add=` valid (payload contoh dari tes Task 4) → formulir terisi termasuk usulan Koleksi baru yang \*\*belum\*\* tersimpan sebelum `Simpan` ditekan, dan fragment hilang dari address bar; batalkan → tidak ada item/Koleksi baru. (b) `#add=` rusak &amp; `#add=` berisi payload &gt; 2.000 karakter → pesan kesalahan masing-masing + formulir kosong. (c) Export → satu file terunduh bernama sesuai pola; hapus semua data (IndexedDB dibersihkan lewat devtools) → Import file itu → seluruh Koleksi &amp; bookmark pulih; Import file yang sama lagi → ringkasan melaporkan semua sebagai duplikat dilewati; Import file teks acak → ditolak utuh dan data tidak berubah.

- \[ \] \*\*Step 2: Implementasikan\*\* urutan bootstrap yang benar: buka DB &amp; muat state \*\*dulu\*\*, lalu bila `location.hash` diawali `#add=`: decode → bila `ok`, buka `openBookmarkForm` dengan `initial = value` (nama Koleksi pada payload dipetakan ke Koleksi yang ada, atau diteruskan sebagai usulan Koleksi baru yang dibuat di dalam `onSave` sebelum bookmark disimpan); bila tidak `ok`, tampilkan pesan sesuai `error` (`too_long` → arahan import JSON) dan buka formulir kosong; pada kedua cabang, `history.replaceState` untuk menghapus fragment \*\*segera sesudah\*\* payload dibaca. Export: `buildExport` → unduh via Blob. Import: `<input type="file">` tersembunyi → baca teks → `planImport` → terapkan `addCollections` lalu `addBookmarks` lewat Task 6 → tampilkan ringkasan persis format SPECS §7.8 (`X ditambahkan, Y dilewati (duplikat), Z Koleksi baru dibuat`).

- \[ \] \*\*Step 3: Jalankan pemeriksaan, pastikan lulus\*\* — semua cabang (a)–(c).

- \[ \] \*\*Step 4: Checkpoint\*\* — Catat hasil per cabang, termasuk bunyi ringkasan import yang tampil.

### Task 12: QA menyeluruh, README &amp; audit akhir

\*\*Files:\*\*

- Create: `app/[README.md](http://README.md)`

- Create: [`QA-REPORT.md`](http://QA-REPORT.md) (di root proyek, di samping [SPECS.md/PLAN.md](http://SPECS.md/PLAN.md))

- Modify: hanya perbaikan dari temuan QA (file terkait), tanpa fitur baru

\*\*Interfaces:\*\*

- Consumes: seluruh hasil Task 1–11. Produces: bukti QA untuk SPECS §10 butir 1–14.

- \[ \] \*\*Step 1: Jalankan seluruh tes otomatis\*\* — `node --test tests/` — Expected: semua PASS.

- \[ \] \*\*Step 2: Audit jaringan &amp; keamanan statis\*\* — `grep -rn "http" app/src app/index.html` — Expected: URL luar hanya host embed di `app/src/embed.js` (youtube-nocookie, tiktok) dan tidak ada `innerHTML` yang menyentuh data pengguna (`grep -rn "innerHTML" app/src` hanya boleh menemukan wadah statis bila ada, tanpa interpolasi data).

- \[ \] \*\*Step 3: Lalui 14 kriteria SPECS §10 satu per satu\*\* di browser (viewport 390px utama, 1280px kedua), termasuk kriteria 12 (tidak ada panggilan jaringan selain buka link &amp; embed preview — periksa panel Network headless saat memuat &amp; mencari) dan kriteria 5 (Copy persis untuk Command &amp; link). Tulis hasil tiap butir (lulus/gagal + bukti) ke [`QA-REPORT.md`](http://QA-REPORT.md); perbaiki kegagalan lalu ulangi butir itu.

- \[ \] \*\*Step 4: Tulis `app/[README.md](http://README.md)`\*\* — cara membuka dari alamat kanonis, peringatan bahwa ganti browser/alamat = koleksi tampak kosong, cara export/import backup, cara memakai link dari Muse, dan daftar yang sengaja tidak ada di v1 (login/sync/PWA) — semua Bahasa Indonesia, tanpa janji fitur di luar spec.

- \[ \] \*\*Step 5: Checkpoint akhir\*\* — [`QA-REPORT.md`](http://QA-REPORT.md) menyatakan 14/14 lulus atau mencatat butir yang belum lulus beserta alasannya secara jujur; tangkapan layar final 390px &amp; 1280px disimpan di `qa/final-390.png` dan `qa/final-1280.png`.

---

## Self-Review (diisi penulis plan, 2026-11-03)

- \*\*Cakupan spec:\*\* §7.1 → Task 8 (+ deteksi Task 1); §7.2 → Task 8 &amp; render Task 7; §7.3 → Task 7, `detail.js`, `thumbnail.js`, `poster.js`; §7.4 → Task 2 &amp; 7; §7.5 → Task 3 &amp; 10; §7.6 → Task 6 &amp; 9; §7.7 → Task 4 &amp; 11; §7.8 → Task 5 &amp; 11; §8 model data &amp; aturan turunan → Task 1, 5, 6; §6 batasan (jaringan hanya untuk link/embed/thumbnail tersetujui, tanpa PWA, alamat kanonis, Bahasa Indonesia, catatan risiko data lokal yang terlihat di dalam aplikasi) → Global Constraints + Task 7 (catatan di bawah header, tombol header) + Task 10 (modal preview) + audit Task 12; §10 kriteria 1–15 → dipetakan di Step pemeriksaan Task 6–11 dan dilalui utuh di Task 12. Tidak ada persyaratan spec tanpa task.

- \*\*Konsistensi nama/tipe:\*\* `filterBookmarks`, `previewFor`, `decodeAddPayload`, `planImport`, `findDuplicate`, `openBookmarkForm`, `deleteCollectionAndDetach` dieja sama di bagian Interfaces, langkah task, dan pemakaian lintas task; enum &amp; konstanta hanya didefinisikan di Task 1.

- \*\*Proporsi:\*\* plan ini berisi keputusan, tanda tangan, dan asersi tes — bukan badan program; badan fungsi hanya muncul sebagai aturan satu-dua kalimat bila tanda tangan + tes belum menentukannya (normalisasi URL, urutan validasi codec, urutan bootstrap Task 11).

