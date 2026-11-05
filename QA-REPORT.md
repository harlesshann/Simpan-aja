# Laporan QA — SimpanAja

Tanggal: 5 November 2026. Spec: `SPECS.md` §10 (15 kriteria).

## Lingkungan & metode

- Node test runner (`node --test`) untuk modul murni.
- Chrome headless + Chrome DevTools Protocol (viewport 390px & 1280px emulasi).
- Skrip QA: `qa/task6-11.mjs` (Task 6 & 11), `qa/final-qa.mjs` (kriteria 1–7, 10–13, 15 +
  tangkapan layar + audit jaringan), `qa/export-roundtrip.mjs` (kriteria 9, unduhan nyata).
- Data pada tangkapan layar adalah data QA yang dibuat skrip, bukan data bawaan aplikasi.

## Tes otomatis modul murni

```
node --test tests/detect.test.js tests/search.test.js tests/embed.test.js tests/codec.test.js tests/backup.test.js tests/thumbnail.test.js
```

Hasil: **41 pass, 0 fail** (detect, search, embed, codec, backup, thumbnail).

## Hasil 15 kriteria

| # | Kriteria | Status | Bukti |
|---|----------|--------|-------|
| 1 | Satu item setiap tipe tampil dengan lencana benar + thumbnail sesuai sumber | **Lulus** | `final-qa.mjs` menambah 7 item lewat formulir; lencana: Video, Website, Command, Repo GitHub, Extension, Lainnya sesuai; thumbnail: YouTube → `i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg`, website → favicon `google.com/s2/favicons?domain=web.dev`, Command → tile lokal, Threads → tile lokal. |
| 2 | Deteksi tipe (GitHub→Repo, YouTube→Video, Web Store→Extension, situs→Website) & bisa diganti manual | **Lulus** | Paste di formulir → `repo`/`video`/`extension`/`website`; set manual `other` dipertahankan. |
| 3 | Search `ffmpeg` menemukan **isi** command | **Lulus** | Judul "Konversi audio mp4" tidak memuat `ffmpeg`; hasil search = item itu saja. |
| 4 | Irisan search + chip + Koleksi; kosong = daftar penuh urut terbaru | **Lulus** | chip Video = 2; search `easing` + Video + Koleksi = 1; reset = 7 kartu, teratas "Teknik color grading". |
| 5 | Buka detail → Copy command/URL persis | **Lulus** | clipboard (izin CDP) via tombol Copy di modal detail: command `ffmpeg -i in.mp4 -vn -acodec libmp3lame out.mp3`, URL `https://web.dev/learn/css/layout`. |
| 6 | Hapus Koleksi tidak menghapus bookmark; pindah ke Belum Dikoleksi | **Lulus** | Hapus "Motion Design": bookmark tetap 7, `collectionId === null`, muncul di filter Belum Dikoleksi. |
| 7 | Klik kartu Video → detail → Preview memutar embed; Threads fallback; tutup menghentikan; tanpa hover | **Lulus** | Klik kartu → detail terbuka; `Preview` → iframe `youtube-nocookie.com/embed/dQw4w9WgXcQ` (tanpa `autoplay`) + detail tertutup; Threads → tanpa iframe + `Tonton di Sumbernya`; tutup → iframe hilang dari DOM. |
| 8 | Link Muse valid mengisi formulir + usul Koleksi; fragment dibersihkan; belum tersimpan sebelum Simpan; payload rusak → pesan + formulir kosong | **Lulus** | `task6-11.mjs`: formulir terisi (judul/tipe/URL), Koleksi diusulkan `__new__` "Motion Link" belum tersimpan, `location.hash === ''`; Batal → 0 Koleksi baru; payload rusak → "Link Muse tidak valid. Formulir dibuka kosong." |
| 9 | Export = 1 file sesuai format; Import ke kosong memulihkan; import kedua = semua duplikat | **Lulus** | `export-roundtrip.mjs`: unduhan `simpanaja-backup-2026-11-05.json`, format `app/version/collections/bookmarks` benar; DB dikosongkan → import → 3 bookmark + 1 Koleksi pulih; import kedua → `0 ditambahkan, 3 dilewati (duplikat), 0 Koleksi baru dibuat`. |
| 10 | Menambah URL duplikat memunculkan peringatan | **Lulus** | Peringatan menyebut judul lama: `Sudah ada item dengan alamat/command sama: "Belajar easing dasar". Tetap simpan?`; pilih Batal → tidak tersimpan. |
| 11 | ±390px tanpa elemen tumpang tindih; ±1280px grid multi-kolom; kartu bisa difokus keyboard | **Lulus** | 390px: `scrollWidth === innerWidth === 390`, grid 1 kolom, kartu `role="button"` + `tabindex=0` + thumbnail, tidak ada overflow kartu; 1280px: grid 3 kolom. Tangkapan: `qa/final-390.png`, `qa/final-1280.png`. |
| 12 | Jaringan hanya untuk link/embed/thumbnail tersetujui | **Lulus** | CDP Network saat muat + search + filter: 24 request; eksternal hanya `i.ytimg.com` + `www.google.com/s2/favicons` + redirect `t*.gstatic.com`; `0` request tak terduga. |
| 13 | Import ke data tak kosong mempertahankan `createdAt`; tabrakan `id` → `id` baru | **Lulus** | Import item dengan `id` yang sudah ada tapi URL beda → `id` berubah, `createdAt` asli `2020-01-01T00:00:00.000Z` tetap; urutan daftar tetap berdasar `createdAt`. |
| 14 | Payload JSON > 2.000 karakter ditolak, diarahkan ke Import JSON | **Lulus** | Pesan: `Link Muse lebih dari 2.000 karakter. Pakai Export/Import JSON. Formulir dibuka kosong.` Fragment dibersihkan. |
| 15 | Klik kartu membuka modal detail lengkap + semua aksi, Tutup/Esc/backdrop menutup | **Lulus** | `final-qa.mjs`: klik kartu Repo → detail terbuka dengan thumbnail, judul, lencana `Repo GitHub`, URL, aksi `Buka/Copy/Edit/Hapus/Tutup`; Tutup → tertutup. |
| O1 | Judul opsional: tambah hanya dengan URL, judul diturunkan otomatis (SPECS §8.4) | **Lulus** | `qa/final-qa.mjs`: formulir disimpan dengan judul kosong, URL `https://web.dev/learn/css/grid` → kartu & DB berjudul `Learn Css Grid`. Unit test `deriveTitle` juga menutup repo/YouTube/path/hash/command. |

**Ringkasan: 15/15 kriteria + O1 lulus.**

## Audit keamanan statis

- `innerHTML`: **tidak ditemukan**. Semua teks pengguna dirender via `textContent`/`createElement`.
- `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon`: **tidak ditemukan** di `app/`. Thumbnail memakai elemen `<img>` biasa, bukan fetch.
- URL eksternal di kode hanya pada `app/src/embed.js` (`youtube-nocookie.com`, `tiktok.com/embed`) dan `app/src/thumbnail.js` (`i.ytimg.com`, `www.google.com/s2/favicons`) — persis izin SPECS §6 butir 4.
- URL bookmark divalidasi harus `http(s)`: form menolak `javascript:`; `codec.js`/`backup.js`
  menolak skema lain.

## Catatan & batasan yang diakui

- Data hidup hanya di IndexedDB browser + alamat yang dipakai; ganti browser/alamat =
  koleksi tampak kosong. Ini perilaku sesuai spec, dan sudah diberi catatan di UI serta
  `app/README.md`.
- Judul otomatis hanya diturunkan dari URL/teks command (lokal). **Deskripsi/caption
  tidak diambil dari halaman** seperti YouTube/TikTok/Threads/Instagram: itu butuh
  pembacaan HTML halaman yang diblokir CORS dan butuh login untuk sebagian platform.
  Jalur resminya adalah Muse mengirim ringkasan caption di field `note` pada link
  `#add=`, atau Anda mengetiknya di Catatan.
- Thumbnail: YouTube memakai gambar asli (`i.ytimg.com`), situs lain favicon
  (`google.com/s2/favicons`), sisanya tile lokal. Konsekuensi privasi: membuka dashboard
  mengirim permintaan gambar ke YouTube/Google (dilakukan lazy, hanya untuk kartu yang
  masuk viewport). TikTok/Instagram/Threads tidak punya thumbnail konten (butuh API/login)
  → tile lokal.
- Fitur di luar v1 (login, sync, PWA, tag, Pin, auto-fetch deskripsi/konten halaman,
  analytics) memang tidak ada, sesuai SPECS §4.
