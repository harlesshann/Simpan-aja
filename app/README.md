# SimpanAja

Bookmark manager pribadi satu halaman, sepenuhnya di browser. Tanpa login data
tetap lokal; login Google (opsional) menyalakan sinkron antar-device lewat
Supabase.

## Cara membuka

Sajikan folder `app/` lalu buka di browser. Dari root proyek:

```
py serve.py
```

Lalu buka `http://localhost:8000/` (atau alamat kanonis Anda). `serve.py` mengirim
`Cache-Control: no-store` dan menambahkan versi otomatis (`?v=<waktu-start>`) pada
setiap referensi modul, jadi setelah server dijalankan ulang browser selalu memakai
kode terbaru tanpa perlu menghapus cache — beda dengan `py -m http.server` yang
membuat HP memakai JS lama dari cache.

> **Penting:** data tersimpan di browser dan alamat yang Anda pakai. Ganti browser,
> perangkat, atau alamat (port/domain/path) = koleksi tampak kosong. Login sinkron
> membuat perangkat lain melihat data yang sama; tanpa login, **Export JSON** tetap
> jalan backup utama.

## Fitur

- **Tambah** (`+ Tambah`): pilih tipe atau biarkan ditebak dari URL. Untuk tipe
  Command kolom URL diganti kolom command. **Judul opsional** — bila dikosongkan,
  aplikasi menurunkan judul dari URL/teks command secara lokal (tanpa jaringan);
  judul hasil turunan tetap bisa diedit nanti.
- **Gambar (opsional):** di form Tambah/Edit kamu bisa memilih file gambar
  (PNG/JPG/WebP/GIF). Gambar dipotong 16:9 dan dikompres di perangkat menjadi
  data URL, lalu dipakai sebagai thumbnail kartu. Disimpan sebagai bagian data
  bookmark; ikut tersinkron bila kamu login. Bisa diganti atau dihapus lewat `Edit`.
- **Tipe:** Video, Website, Command, Repo GitHub, Extension, Lainnya.
- **Search:** mencari di judul, catatan, URL, isi command, dan nama Koleksi.
  Semua kata harus cocok (AND).
- **Filter:** chip tipe + sidebar Koleksi; di HP sidebar jadi drawer yang dibuka
  lewat tombol `Koleksi` (desktop selalu tampil), termasuk `Belum Dikoleksi`.
- **Koleksi:** buat/rename/**atur warna**/hapus lewat tombol `Kelola`. Di daftar
  filter, tiap Koleksi tampil sebagai **folder berwarna** (warna dipilih dari palet
  saat membuat atau mengubah Koleksi). Menghapus Koleksi **tidak** menghapus
  bookmark-nya; itemnya pindah ke `Belum Dikoleksi`.
- **Kartu:** tiap kartu menampilkan **thumbnail konten** — thumbnail asli YouTube
  untuk video YouTube, favicon situs untuk link lain, **poster lokal otomatis** untuk
  TikTok/Instagram/Threads (bar chrome palsu + nama platform + judul, dibuat lokal
  tanpa jaringan), dan tile lokal berwarna sesuai tipe untuk Command atau bila gambar
  gagal dimuat. Kartu bisa
  diklik (atau `Enter`/`Space` saat difokus) untuk membuka **detail**.
- **Detail (halaman penuh):** kartu yang diklik membuka halaman detail lewat route
  `#/item/<id>` — grid disembunyikan, isi detail tampil penuh-lebar: thumbnail besar,
  lencana tipe, judul, sumber, URL/command, Koleksi, catatan, tanggal, dan aksi `Buka`,
  `Copy`, `Edit`, `Hapus`. Tutup lewat tombol `← Kembali`, `Esc`, atau tombol back
  browser. Satu halaman yang sama (tanpa muat ulang, tanpa file HTML terpisah).

## Backup: Export & Import

- **Export** mengunduh `simpanaja-backup-YYYY-MM-DD.json`.
- **Import** menggabungkan file ke data yang ada:
  - Koleksi dicocokkan berdasarkan nama (tidak peka huruf besar/kecil).
  - Bookmark yang sama (URL/command sama) dilewati sebagai duplikat.
  - `createdAt` asli dipertahankan; tabrakan `id` dengan item berbeda diberi `id` baru.
  - File rusak atau bukan backup SimpanAja ditolak utuh, data lama tidak berubah.
- Ringkasan hasil: `X ditambahkan, Y dilewati (duplikat), Z Koleksi baru dibuat`.
- Gambar kustom ikut di backup sebagai data URL (file JSON jadi lebih besar).
  Gambar yang tidak valid (bukan bitmap data URL atau terlalu besar) dibuang saat
  import, itemnya tetap masuk.

## Sinkron antar-device (opsional, Supabase)

Tanpa login aplikasi tetap 100% lokal. Untuk menyamakan data HP & laptop:

1. Buat project di [supabase.com](https://supabase.com) (free tier cukup untuk 1 akun).
2. Buka **SQL Editor**, tempel isi `supabase/schema.sql`, jalankan sekali. Ini membuat
   tabel `bookmarks` + `collections`, RLS per-user, dan menyalakan Realtime.
   Kalau project sudah pernah dibuat (tabel sudah ada), jalankan ulang file yang sama:
   bagian migrasi di akhir mengubah primary key jadi `(user_id, id)` secara aman.
3. **Authentication → Providers → Google**: aktifkan, isi Client ID/Secret dari
   Google Cloud Console. Tambahkan alamat aplikasi di **URL Configuration →
   Redirect URLs** (mis. `https://domain-anda.vercel.app/`) dan `http://localhost:8000/`.
4. **Project Settings → API**: salin **Project URL** dan **anon public key**, isi di
   `app/src/config.js`:
   ```js
   export const SUPABASE_URL = 'https://xxxx.supabase.co';
   export const SUPABASE_ANON_KEY = 'eyJ...';
   ```
5. Deploy ulang. Tombol `Masuk` di kaki sidebar aktif. Masuk sekali di tiap device.

Cara kerja singkat:

- Semua baca/tulis tetap ke IndexedDB (offline-first). Perubahan mengantre di
  `outbox` dan dikirim saat online.
- Konflik diselesaikan **last-write-wins** lewat `updatedAt`. Hapus memakai
  tombstone `deletedAt`, jadi penghapusan ikut tersebar.
- Login pertama mengunggah data lokal yang sudah ada, lalu tarik data server.
- Titik status: hijau `Tersinkron`, kuning `Menyinkronkan...`, abu `Offline`,
  merah `Sinkron gagal`. Tanpa `config.js` terisi, tombol tampil `Lokal` (nonaktif).

Batas yang perlu diketahui: anon key memang publik (aman), tetapi **jangan pernah**
memakai `service_role` key di browser. Free tier Supabase ±500MB; gambar kustom
(≤500KB) berarti sekitar 1.200 gambar sebelum perlu pindah ke object storage.
Jangan pindah alamat/domain setelah koleksi terisi — origin adalah rumah data dan
`redirectTo` OAuth.

## Link 1-tap Muse

Muse (LLM di luar aplikasi) bisa membuat link yang membuka SimpanAja dengan
formulir sudah terisi. Format: alamat aplikasi + `#add=` + JSON berikut yang
di-encode **base64url (UTF-8, tanpa padding)**:

```json
{ "v": 1, "title": "Judul", "url": "https://...", "type": "video", "collection": "Nama Koleksi", "note": "opsional" }
```

- `type` salah satu dari: `video`, `website`, `command`, `repo`, `extension`, `other`.
- Untuk `command`, isi `"command": "..."` dan `url` boleh kosong.
- Batas payload **2.000 karakter**. Lebih dari itu ditolak — pakai Import JSON.
- Payload rusak / URL bukan http(s) / tipe tak dikenal → pesan kesalahan dan
  formulir kosong. **Tidak ada** yang tersimpan otomatis; item baru masuk setelah
  Anda menekan `Simpan`.
- Fragment `#add=` langsung dibersihkan dari address bar setelah dibaca.

## Yang sengaja tidak ada di v1

PWA (manifest/service worker), tag, Pin/Favorit, auto-fetch deskripsi/konten
halaman, analytics, dan impor otomatis dari platform lain.
Thumbnail otomatis hanya diambil dari sumber yang diizinkan (YouTube + favicon Google);
isi halaman tidak pernah dibaca. Gambar kustom hanya dari file yang kamu pilih sendiri.
Jaringan lain hanya dipakai saat kamu menekan `Masuk` (muat SDK dari `esm.sh` +
project Supabase Anda).
