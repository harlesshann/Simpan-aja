# Laporan QA — SimpanAja

Tanggal: 5 November 2026. Spec: `SPECS.md` §10 (14 kriteria).

## Lingkungan & metode

- Node test runner (`node --test`) untuk modul murni.
- Chrome headless + Chrome DevTools Protocol (viewport 390px & 1280px emulasi).
- Skrip QA: `qa/task6-11.mjs` (Task 6 & 11), `qa/final-qa.mjs` (kriteria 1–7, 10–13 +
  tangkapan layar + audit jaringan), `qa/export-roundtrip.mjs` (kriteria 9, unduhan nyata).
- Data pada tangkapan layar adalah data QA yang dibuat skrip, bukan data bawaan aplikasi.

## Tes otomatis modul murni

```
node --test tests/detect.test.js tests/search.test.js tests/embed.test.js tests/codec.test.js tests/backup.test.js
```

Hasil: **26 pass, 0 fail** (detect, search, embed, codec, backup).

## Hasil 14 kriteria

| # | Kriteria | Status | Bukti |
|---|----------|--------|-------|
| 1 | Satu item setiap tipe tampil dengan lencana benar | **Lulus** | `final-qa.mjs` menambah 7 item lewat formulir; lencana: Video, Website, Command, Repo GitHub, Extension, Lainnya semua sesuai. |
| 2 | Deteksi tipe (GitHub→Repo, YouTube→Video, Web Store→Extension, situs→Website) & bisa diganti manual | **Lulus** | Paste di formulir → `repo`/`video`/`extension`/`website`; set manual `other` dipertahankan. |
| 3 | Search `ffmpeg` menemukan **isi** command | **Lulus** | Judul "Konversi audio mp4" tidak memuat `ffmpeg`; hasil search = item itu saja. |
| 4 | Irisan search + chip + Koleksi; kosong = daftar penuh urut terbaru | **Lulus** | chip Video = 2; search `easing` + Video + Koleksi = 1; reset = 7 kartu, teratas "Teknik color grading". |
| 5 | Copy command persis & Copy URL persis | **Lulus** | clipboard (izin CDP): command `ffmpeg -i in.mp4 -vn -acodec libmp3lame out.mp3`, URL `https://web.dev/learn/css/layout`. |
| 6 | Hapus Koleksi tidak menghapus bookmark; pindah ke Belum Dikoleksi | **Lulus** | Hapus "Motion Design": bookmark tetap 7, `collectionId === null`, muncul di filter Belum Dikoleksi. |
| 7 | Hover YouTube → embed; Preview Threads → fallback + tombol sumber; tutup menghentikan | **Lulus** | hover 400 ms → iframe `youtube-nocookie.com/embed/dQw4w9WgXcQ` (tanpa `autoplay`); hover < 400 ms → tidak muncul; Threads → tanpa iframe + `Tonton di Sumbernya`; tutup → iframe hilang dari DOM. |
| 8 | Link Muse valid mengisi formulir + usul Koleksi; fragment dibersihkan; belum tersimpan sebelum Simpan; payload rusak → pesan + formulir kosong | **Lulus** | `task6-11.mjs`: formulir terisi (judul/tipe/URL), Koleksi diusulkan `__new__` "Motion Link" belum tersimpan, `location.hash === ''`; Batal → 0 Koleksi baru; payload rusak → "Link Muse tidak valid. Formulir dibuka kosong." |
| 9 | Export = 1 file sesuai format; Import ke kosong memulihkan; import kedua = semua duplikat | **Lulus** | `export-roundtrip.mjs`: unduhan `simpanaja-backup-2026-11-05.json`, format `app/version/collections/bookmarks` benar; DB dikosongkan → import → 3 bookmark + 1 Koleksi pulih; import kedua → `0 ditambahkan, 3 dilewati (duplikat), 0 Koleksi baru dibuat`. |
| 10 | Menambah URL duplikat memunculkan peringatan | **Lulus** | Peringatan menyebut judul lama: `Sudah ada item dengan alamat/command sama: "Belajar easing dasar". Tetap simpan?`; pilih Batal → tidak tersimpan. |
| 11 | ±390px tanpa elemen tumpang tindih; ±1280px grid multi-kolom | **Lulus** | 390px: `scrollWidth === innerWidth === 390`, grid 1 kolom, target sentuh tombol ≥ 36px; 1280px: grid 3 kolom. Tangkapan: `qa/final-390.png`, `qa/final-1280.png`. |
| 12 | Tanpa panggilan jaringan selain buka link & embed preview | **Lulus** | CDP Network saat muat + search + filter: 13 request, **0 eksternal** (semua `localhost:8000`). Audit statis: URL luar hanya host embed di `app/src/embed.js` (youtube-nocookie, tiktok); tidak ada `fetch`/`XHR`/`WebSocket`. |
| 13 | Import ke data tak kosong mempertahankan `createdAt`; tabrakan `id` → `id` baru | **Lulus** | Import item dengan `id` yang sudah ada tapi URL beda → `id` berubah, `createdAt` asli `2020-01-01T00:00:00.000Z` tetap; urutan daftar tetap berdasar `createdAt`. |
| 14 | Payload JSON > 2.000 karakter ditolak, diarahkan ke Import JSON | **Lulus** | Pesan: `Link Muse lebih dari 2.000 karakter. Pakai Export/Import JSON. Formulir dibuka kosong.` Fragment dibersihkan. |
| O1 | Judul opsional: tambah hanya dengan URL, judul diturunkan otomatis (SPECS §8.4) | **Lulus** | `qa/final-qa.mjs`: formulir disimpan dengan judul kosong, URL `https://web.dev/learn/css/grid` → kartu & DB berjudul `Learn Css Grid`. Unit test `deriveTitle` juga menutup repo/YouTube/path/hash/command. |

**Ringkasan: 14/14 kriteria + O1 lulus.**

## Audit keamanan statis

- `innerHTML`: **tidak ditemukan**. Semua teks pengguna dirender via `textContent`/`createElement`.
- `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon`: **tidak ditemukan** di `app/`.
- URL eksternal di kode hanya pada `app/src/embed.js` (`youtube-nocookie.com`, `tiktok.com/embed`).
- URL bookmark divalidasi harus `http(s)`: form menolak `javascript:`; `codec.js`/`backup.js`
  menolak skema lain.

## Catatan & batasan yang diakui

- Data hidup hanya di IndexedDB browser + alamat yang dipakai; ganti browser/alamat =
  koleksi tampak kosong. Ini perilaku sesuai spec, dan sudah diberi catatan di UI serta
  `app/README.md`.
- Judul otomatis hanya diturunkan dari URL/teks command (lokal). **Deskripsi/caption
  tidak diambil dari halaman** seperti YouTube/TikTok/Threads/Instagram: itu butuh
  panggilan jaringan yang dilarang spec dan diblokir CORS. Jalur resminya adalah Muse
  mengirim ringkasan caption di field `note` pada link `#add=`, atau Anda mengetiknya
  di Catatan.
- Fitur di luar v1 (login, sync, PWA, tag, Pin, auto-fetch metadata dari jaringan,
  analytics) memang tidak ada, sesuai SPECS §4.
