# SimpanAja

Bookmark manager pribadi satu halaman, sepenuhnya di browser. Tidak ada login,
tidak ada server, tidak ada sync.

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

> **Penting:** data hanya tersimpan di browser dan alamat yang Anda pakai. Ganti
> browser, ganti perangkat, atau ganti alamat (port/domain/path) = koleksi tampak
> kosong. Karena itu **Export JSON adalah jalan backup satu-satunya**.

## Fitur

- **Tambah** (`+ Tambah`): pilih tipe atau biarkan ditebak dari URL. Untuk tipe
  Command kolom URL diganti kolom command. **Judul opsional** — bila dikosongkan,
  aplikasi menurunkan judul dari URL/teks command secara lokal (tanpa jaringan);
  judul hasil turunan tetap bisa diedit nanti.
- **Gambar (opsional):** di form Tambah/Edit kamu bisa memilih file gambar
  (PNG/JPG/WebP/GIF). Gambar dipotong 16:9 dan dikompres di perangkat menjadi
  data URL, **tidak diunggah ke server**, lalu dipakai sebagai thumbnail kartu.
  Bisa diganti atau dihapus lewat `Edit`.
- **Tipe:** Video, Website, Command, Repo GitHub, Extension, Lainnya.
- **Search:** mencari di judul, catatan, URL, isi command, dan nama Koleksi.
  Semua kata harus cocok (AND).
- **Filter:** chip tipe + filter Koleksi (termasuk `Belum Dikoleksi`).
- **Koleksi:** buat/rename/hapus lewat tombol `Kelola`. Menghapus Koleksi
  **tidak** menghapus bookmark-nya; itemnya pindah ke `Belum Dikoleksi`.
- **Kartu:** tiap kartu menampilkan **thumbnail konten** — thumbnail asli YouTube
  untuk video YouTube, favicon situs untuk link lain, **poster lokal otomatis** untuk
  TikTok/Instagram/Threads (bar chrome palsu + nama platform + judul, dibuat lokal
  tanpa jaringan), dan tile lokal berwarna sesuai tipe untuk Command atau bila gambar
  gagal dimuat. Kartu bisa
  diklik (atau `Enter`/`Space` saat difokus) untuk membuka **detail**.
- **Detail (modal):** thumbnail besar, lencana tipe, judul, sumber, URL/command,
  Koleksi, catatan, tanggal, dan aksi `Buka`, `Copy`, `Edit`, `Hapus`. Tutup lewat
  ikon **×** di pojok kanan atas, `Esc`, atau klik di luar modal.

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

Login, sync antar perangkat, PWA (manifest/service worker), tag, Pin/Favorit,
auto-fetch deskripsi/konten halaman, analytics, dan impor otomatis dari platform lain.
Thumbnail otomatis hanya diambil dari sumber yang diizinkan (YouTube + favicon Google);
isi halaman tidak pernah dibaca. Gambar kustom hanya dari file yang kamu pilih sendiri
dan disimpan lokal.
