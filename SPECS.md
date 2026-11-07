# [SPECS.md](http://SPECS.md) — SimpanAja (Website Bookmark Manager)

- \*\*Status:\*\* APPROVED — disetujui Handy 2026-11-03 17:23 WIB ("Approve spec, lanjut buat [PLAN.md](http://PLAN.md)"). Belum ada kode yang boleh ditulis; implementasi menunggu [PLAN.md](http://PLAN.md) direview, pilihan metode eksekusi, dan "go" eksplisit Handy.

- \*\*Tanggal:\*\* 2026-11-03

- \*\*Workflow:\*\* Superpowers — brainstorming → spec ini → approval Handy → [PLAN.md](http://PLAN.md) → berhenti, menunggu "go" eksplisit Handy sebelum implementasi

- \*\*Nama aplikasi:\*\* SimpanAja (dipilih Handy dari 3 usulan Harless: SimpanAja / MarkahKu / KoleksiKu)

- \*\*Ukuran pekerjaan:\*\* Proyek (bukan perubahan kecil)

Keputusan dalam dokumen ini yang berasal dari Handy ditandai \*\*\[Handy\]\*\*. Keputusan kecil yang Harless selesaikan sendiri agar builder tidak perlu menebak ditandai \*\*\[Usulan Harless\]\*\* — Handy dapat mengubahnya saat mereview spec ini.

---

## 1. Maksud &amp; Alasan (Intent)

Handy menemukan banyak hal bermanfaat yang berserakan di tempat berbeda: video di medsos tersimpan di Saved TikTok/Threads/Instagram, repo di Star GitHub, extension di Chrome Web Store, website di bookmark browser, dan command di catatan entah di mana. Saat dibutuhkan lagi, semuanya sulit ditemukan kembali.

SimpanAja adalah \*\*satu website bookmark manager pribadi\*\* tempat semua jenis hal bermanfaat itu disimpan dalam satu aplikasi, bisa disimpan dengan cepat, dan bisa ditemukan lagi dengan cepat. \*\*\[Handy\]\*\*

Prinsip yang memandu seluruh desain:

- *Simpan harus secepat mungkin* — kalau menyimpan ribet, pengguna kembali menyimpan berserakan.

- *Temukan harus secepat mungkin* — membuka aplikasi ini tujuannya menemukan satu item lama dalam hitungan detik.

## 2. Pengguna

- Satu orang: Handy sendiri. Tidak ada peran pengguna lain, tidak ada admin, tidak ada area publik. \*\*\[Handy\]\*\*

## 3. Tujuan (Goals)

1. Menyimpan 6 jenis item dalam satu tempat: \*\*Video, Website, Command, Repo GitHub, Extension, Lainnya\*\*. \*\*\[Handy\]\*\*

2. Menyimpan item baru dalam waktu singkat lewat alur tambah cepat (lihat §7.1). \*\*\[Handy\]\*\*

3. Menemukan item lama terutama lewat \*\*search\*\*, dibantu filter tipe dan filter Koleksi (lihat §7.4). \*\*\[Handy\]\*\*

4. Command dapat disalin kembali dengan \*\*Copy 1-klik\*\*, tanpa perlu memblok teks manual. \*\*\[Handy\]\*\*

5. Kartu Video dapat diintip lewat \*\*preview popup\*\* sebelum membuka sumbernya (bersyarat, lihat §7.5). \*\*\[Handy\]\*\*

6. Bookmark hasil kurasi AI (Muse/Harless di chat) dapat masuk ke aplikasi lewat \*\*link 1-tap\*\* dan \*\*import JSON\*\* (lihat §7.7). \*\*\[Handy\]\*\*

7. Seluruh koleksi dapat di-\*\*export/import JSON\*\* sebagai backup (lihat §7.8). \*\*\[Handy\]\*\*

## 4. Bukan Tujuan (Non-Goals) — v1

Hal berikut \*\*sengaja di luar scope v1\*\* dan builder tidak boleh membuatnya:

- Login, akun, backend, database server, dan \*\*sync antar perangkat\*\*. \*\*\[Handy\]\*\*

- Multi-user, berbagi koleksi ke orang lain, halaman publik.

- \*\*Impor otomatis dari Saved platform lain\*\* (mis. klik Save di aplikasi Threads lalu otomatis masuk SimpanAja). Ini terverifikasi *tidak bisa* untuk website standalone: saves Threads bersifat tertutup tanpa API/export yang dapat ditunjuk, dan API resmi Instagram tidak menyediakan endpoint saved-media untuk aplikasi pihak ketiga. \*\*\[Handy — setelah penjelasan terverifikasi\]\*\*

- \*\*Extension pendamping\*\* browser (pola seperti "Threads Clipper for Obsidian" yang menangkap klik bookmark di Threads web). Diparkir; bukan bagian v1. \*\*\[Handy — memilih jalur Muse sebagai perantara\]\*\*

- \*\*AI/LLM yang tertanam di dalam aplikasi.\*\* Muse yang dipakai Handy adalah jatah langganan di aplikasi Muse, bukan API key yang dapat disalin ke website lain. AI pengatur bookmark hidup *di luar* aplikasi, yaitu Muse di chat (lihat §7.7). \*\*\[Handy\]\*\*

- Mengambil judul/thumbnail/isi halaman \*\*secara otomatis dari link\*\* (auto-fetch metadata). Banyak situs memblokir pengambilan dari browser; v1 tidak menjanjikannya.

- Sistem \*\*tag terpisah\*\*. Search + Koleksi dinilai cukup untuk v1. \*\*\[Usulan Harless — diterima dalam daftar fitur\]\*\*

- \*\*Pin/Favorit.\*\* Tidak masuk v1. \*\*\[Handy — tidak memilih opsi ini saat ditawarkan\]\*\*

- Deployment/hosting. Di mana SimpanAja nantinya di-hosting \*\*tidak termasuk scope spec ini\*\* dan diputuskan terpisah — selain syarat alamat kanonis di §6 butir 7–8. \*\*\[Usulan Harless\]\*\*

- \*\*PWA / aplikasi terpasang.\*\* Ikon home-screen, service worker/offline terpasang, dan penyimpanan persisten — di luar v1 atas keputusan Handy (`2b`, §6 butir 9). \*\*\[Handy\]\*\*

## 5. Anti-Tujuan (Anti-Goals)

Hasil berikut dianggap \*\*gagal\*\* walaupun aplikasinya secara teknis berjalan:

- Alur menyimpan yang memaksa pengguna mengisi banyak kolom atau memilih Koleksi dulu sebelum bisa menyimpan.

- Aplikasi yang terasa seperti spreadsheet/formulir administrasi — ia harus terasa seperti tempat menyimpan yang ringan dan visual.

- Preview video yang menjanjikan semua platform bisa diputar di dalam popup (janji palsu — lihat §7.5).

- Data pengguna terkirim ke server/analytics pihak mana pun.

## 6. Batasan (Constraints)

1. \*\*Lokal &amp; satu perangkat:\*\* aplikasi berjalan client-only di satu browser/perangkat. Tanpa login &amp; sync. \*\*\[Handy\]\*\*

2. \*\*Penyimpanan lokal browser:\*\* data disimpan di penyimpanan lokal browser pada perangkat itu (IndexedDB — pola yang sama seperti aplikasi SnippetCode milik Handy, yang sanggup menampung koleksi besar dan teks command panjang, melebihi batas praktis localStorage). \*\*\[Usulan Harless\]\*\*

3. Konsekuensi batasan 1–2 yang harus terlihat jujur di aplikasi: mengganti browser/perangkat atau menghapus data browser membuat koleksi tidak ikut — karena itu export JSON (§7.8) adalah jalan keluar resminya dan tombolnya harus mudah ditemukan.

4. \*\*Panggilan jaringan dibatasi dan eksplisit.\*\* Aplikasi boleh memanggil jaringan hanya untuk: (a) membuka link bookmark yang diklik pengguna, (b) memuat embed video saat preview dibuka (§7.5), dan (c) \*\*memuat gambar thumbnail kartu\*\* dari dua sumber tetap: `https://i.ytimg.com/vi/<id>/hqdefault.jpg` (thumbnail asli YouTube) dan `https://www.google.com/s2/favicons?domain=<host>&sz=128` (favicon situs). Tidak ada endpoint lain, tidak ada pembacaan isi halaman sumber, tidak ada analytics/tracking. Gambar dimuat lazy (hanya saat kartu masuk viewport) dan punya fallback lokal bila gagal: placeholder huruf awal tampil sampai gambar termuat, lalu menimpanya; bila gagal, placeholder tetap.

5. Antarmuka dan semua pesan untuk pengguna dalam \*\*Bahasa Indonesia\*\*.

6. Harus nyaman dipakai pada layar HP (±390px) dan desktop (±1280px). \*\*\[Usulan Harless — mengikuti standar QA proyek Handy sebelumnya\]\*\*

7. \*\*Alamat kanonis \[Usulan Harless\]:\*\* aplikasi disampaikan sebagai situs statis pada \*\*satu alamat HTTPS yang stabil\*\* (pola yang sama seperti SnippetCode di GitHub Pages). Data lokal terikat pada alamat (origin) dan browser itu: membuka alamat yang berbeda (file lokal, `localhost`, domain lain) akan menampilkan toko data yang berbeda dan tampak kosong. Karena itu aplikasi harus selalu dibuka dari alamat kanonis dan browser utama yang sama, link 1-tap Muse (§7.7) selalu memakai alamat kanonis itu, dan `file://` bukan rumah kanonis yang didukung (Clipboard API untuk Copy 1-klik juga membutuhkan konteks aman HTTPS/`localhost`). Akun/domain hosting persisnya adalah detail tahap rencana.

8. \*\*Perangkat &amp; browser utama \[Handy — kode `1a`\]:\*\* rumah kanonis SimpanAja adalah \*\*HP Handy\*\* — aplikasi selalu dipakai dari browser utama yang sama di HP itu, dan link 1-tap Muse (§7.7) diketuk di HP yang sama. Laptop/desktop tetap harus bisa menampilkan aplikasi dengan baik (§6 butir 6), tetapi toko data di browser lain adalah toko terpisah dan bukan koleksi utama; pemindahan antar perangkat dilakukan lewat export/import JSON (§7.8).

9. \*\*Bentuk halaman web biasa, bukan PWA \[Handy — kode `2b`\]:\*\* v1 adalah halaman web biasa. Tidak ada manifest, service worker, ikon home-screen, mode offline terpasang, maupun permintaan penyimpanan persisten (`[navigator.storage](http://navigator.storage).persist()`) di v1. Konsekuensinya diterima secara sadar: penyimpanan yang dipakai adalah penyimpanan situs biasa, sehingga export JSON (§7.8) tetap menjadi pengaman utama data dan tombolnya harus mudah ditemukan.

## 7. Fitur (yang disetujui Handy, termasuk amendemen preview)

### 7.1 Tambah bookmark cepat

- Tombol utama `+ Tambah` membuka formulir tambah/edit (modal atau panel — builder yang menentukan, selama tetap satu halaman).

- Alur utama (semua tipe berbasis link):

  1. Pengguna menempel (paste) link.

  2. \*\*Tipe ditebak otomatis dari domain link\*\* (aturan di §8.3); pengguna dapat mengganti tebakan lewat pemilih tipe kapan pun. Deteksi otomatis hanya mengubah tipe selama pengguna belum mengganti tipe secara manual dalam sesi formulir yang sama. \*\*\[Usulan Harless\]\*\*

  3. Pengguna boleh mengisi \*\*judul\*\* (opsional). Bila dikosongkan, aplikasi menurunkan judul otomatis dari URL / teks command secara lokal (§8.4) — \*\*tanpa\*\* panggilan jaringan.

  4. \*\*Catatan\*\* opsional: alasan/konteks kenapa item ini berguna (teks bebas, ikut terindeks search).

  5. \*\*Koleksi\*\* opsional: boleh dikosongkan. Item tanpa Koleksi masuk penampung virtual \*\*"Belum Dikoleksi"\*\* — bukan Koleksi sungguhan, tidak bisa dihapus/di-rename, dan tidak menghalangi penyimpanan. \*\*\[Usulan Harless — bentuk konkret dari keputusan "Koleksi opsional"\]\*\*

  6. Tombol `Simpan`.

- Validasi: judul \*\*opsional\*\*; untuk tipe berbasis link, URL wajib dan hanya skema [`http://`/`https://`](http://`/`https://`) yang diterima (skema lain seperti `javascript:` ditolak dengan pesan kesalahan berbahasa Indonesia). Untuk tipe Command, teks command wajib.

- \*\*Peringatan duplikat \[Usulan Harless\]:\*\* bila URL yang sama (setelah normalisasi sederhana: skema/host huruf kecil, `www.` diabaikan, trailing slash diabaikan) sudah tersimpan, tampilkan peringatan menyebut judul item yang sudah ada (atau URL/teks command bila judulnya kosong), dengan pilihan `Tetap Simpan` atau `Batal`.

### 7.2 Form khusus Command

- Bila tipe = Command, kolom URL \*\*diganti\*\* kolom teks command (multi-baris, font monospace). Kolom command wajib diisi; judul \*\*opsional\*\* (diturunkan dari teks command bila kosong, §8.4); catatan &amp; Koleksi tetap opsional.

- Teks command disimpan dan ditampilkan \*\*sebagai teks biasa (di-escape)\*\*. Aplikasi tidak pernah menjalankan command apa pun.

- Di kartu Command, teks command tampil sebagai cuplikan monospace terpotong, dan aksi utamanya adalah \*\*Copy\*\* (menyalin teks command persis).

### 7.3 Dashboard kartu — pendekatan A, satu halaman \*\*\[Handy\]\*\*

Pendekatan yang dipilih: \*\*dashboard satu halaman\*\*. Semua fungsi utama hidup dalam satu layar; tambah/edit lewat modal/panel di halaman yang sama; link dari Muse (§7.7) juga mendarat di halaman yang sama.

Susunan halaman (atas ke bawah):

1. \*\*Header:\*\* nama aplikasi "SimpanAja", jumlah total bookmark, tombol `+ Tambah`, tombol `Import`, tombol `Export`.

2. \*\*Search:\*\* kolom search besar dan menonjol (lihat §7.4).

3. \*\*Filter tipe:\*\* chip `Semua | Video | Website | Command | Repo GitHub | Extension | Lainnya`.

4. \*\*Filter Koleksi:\*\* daftar Koleksi (di desktop tampil sebagai daftar/sidebar; di HP tampil ringkas, mis. chip yang bisa di-scroll mendatar atau dropdown — bentuk persisnya builder yang menentukan selama tetap satu halaman dan nyaman di 390px) termasuk pilihan `Semua Koleksi` dan `Belum Dikoleksi`.

5. \*\*Grid kartu\*\* bookmark (responsif: 1 kolom di HP, beberapa kolom di desktop).

6. \*\*Kelola Koleksi:\*\* sebuah area/tombol untuk membuat, me-rename, dan menghapus Koleksi (lihat §7.6).

Isi satu kartu (ringkas — detail lengkap ada di modal detail saat kartu diklik):

- \*\*Thumbnail\*\* rasio 16:9 di bagian atas: thumbnail asli YouTube bila video YouTube; favicon situs untuk tipe berbasis link lain; \*\*poster lokal otomatis\*\* (mirip tangkapan layar: bar chrome palsu + hostname + nama platform + judul, dibuat dari URL/judul secara lokal dan deterministik) untuk TikTok/Instagram/Threads; tile lokal berwarna sesuai tipe (inisial label) untuk Command dan fallback saat gambar gagal dimuat. Poster bukan tangkapan halaman asli — konten TikTok/IG/Threads tidak bisa diambil browser (CORS, login wall).

- Lencana (badge) tipe yang jelas berbeda warna/ikon per tipe + label tipenya.

- Judul (maks 2 baris).

- Sumber: label platform yang diturunkan dari domain (mis. YouTube, GitHub, TikTok) atau hostname untuk domain lain.

- Nama Koleksi (bila ada).

- Tanggal disimpan.

- Khusus Command: cuplikan command (monospace, terpotong).

Kartu itu sendiri adalah tombol (dapat difokus keyboard, `Enter`/`Space`): mengklik kartu membuka \*\*modal detail\*\* di tengah layar. Modal detail memuat thumbnail besar, lencana, judul, sumber, URL/command lengkap, Koleksi, catatan penuh, tanggal, dan semua aksi:

  - `Buka` (tipe berbasis link; membuka tab baru dengan `rel="noopener"`)

  - `Copy` (menyalin URL untuk tipe berbasis link; menyalin teks command untuk Command)

  - `Preview` (hanya item Video; lihat §7.5)

  - `Edit`

  - `Hapus` (dengan konfirmasi dulu)

  - `Tutup`

Tidak ada tombol aksi di kartu grid dan tidak ada hover-preview; semua aksi lewat modal detail. Tujuan: grid rapi dan visual, satu pola interaksi di HP & desktop.

Keadaan kosong yang harus ditangani dengan pesan berbahasa Indonesia:

- Belum ada bookmark sama sekali → pesan sambutan singkat + ajakan `+ Tambah`.

- Search/filter tidak menghasilkan apa-apa → pesan kosong + tombol untuk membersihkan search/filter.

### 7.4 Search &amp; filter \*\*\[Handy\]\*\*

- Search adalah \*\*cara utama\*\* menemukan item; filter tipe adalah penyaring; Koleksi adalah cara cadangan saat kata kunci terlupa. Ketiganya dapat digabung (hasil = irisan ketiganya).

- Search bersifat *substring*, tidak peka huruf besar/kecil, dan mencari di: \*\*judul, catatan, URL, isi command, dan nama Koleksi\*\* item.

- Kata yang dipisah spasi bersifat AND: semua kata harus ditemukan (masing-masing boleh di field berbeda). \*\*\[Usulan Harless — pola yang sama seperti search SnippetCode\]\*\*

- Urutan hasil selalu \*\*terbaru disimpan di atas\*\* (`createdAt` menurun); search/filter tidak mengubah urutan.

### 7.5 Preview popup untuk item Video \*\*\[Handy — dengan syarat yang disetujui Handy; diubah: modal dari detail\]\*\*

Bunyi fitur yang disepakati persis: *"Preview popup untuk kartu Video, memutar embed bila platformnya mengizinkan, fallback info + buka sumber bila diblokir."*

Perilaku:

- \*\*Modal tengah, dipicu dari detail (semua perangkat):\*\* tidak ada hover. Preview dibuka lewat tombol `Preview` di \*\*modal detail\*\* (§7.3). Popup preview tampil sebagai modal di tengah layar di HP maupun desktop — satu pola, ringkas.

- Embed \*\*baru dimuat saat preview dibuka\*\* (tidak semua kartu dimuat di awal) dan \*\*dibuang saat popup ditutup\*\*, agar pemutaran berhenti dan halaman tetap ringan.

- Suara \*\*tidak\*\* autoplay; pengguna menekan play di dalam player, sesuai aturan browser.

- Tombol `Esc` dan klik di luar popup menutupnya.

Aturan embed per sumber \*\*\[Usulan Harless — bentuk konkret dari syarat Handy\]\*\*:

| Sumber | Preview |

|---|---|

| YouTube ([`youtube.com/watch`](http://youtube.com/watch`), [`youtu.be/`](http://youtu.be/`), [`youtube.com/shorts/`](http://youtube.com/shorts/`)) | Player embed [`youtube-nocookie.com/embed/<id>`](http://youtube-nocookie.com/embed/<id>`) dari ID video yang diekstrak dari URL |

| File video langsung (URL berakhiran `.mp4` / `.webm`) | Elemen `<video controls>` |

| TikTok | Dicoba embed [`tiktok.com/embed/v2/<id>`](http://tiktok.com/embed/v2/<id>`) bila ID dapat diekstrak dari URL; bila tidak, fallback |

| Threads, Instagram, Facebook, X, dan sumber video lain | \*\*Langsung fallback\*\* (platform-platform ini terverifikasi sering memblokir embed / mengunci file video) |

\*\*Fallback\*\* (bukan player bohongan): popup menampilkan judul, sumber, catatan, dan tombol `Tonton di Sumbernya` yang membuka link asli.

### 7.6 Kelola Koleksi \*\*\[Handy\]\*\*

- Operasi: buat Koleksi baru (nama wajib, unik tanpa memandang huruf besar/kecil), ganti nama, hapus.

- Menghapus Koleksi \*\*tidak\*\* menghapus bookmark di dalamnya; item-itemnya menjadi "Belum Dikoleksi" (`collectionId` dikosongkan).

- Jumlah bookmark per Koleksi ditampilkan di daftar Koleksi (dihitung, tidak disimpan terpisah).

### 7.7 Pintu Muse — perantara AI lewat link 1-tap \*\*\[Handy — Pendekatan A\]\*\*

Keputusan arsitektur: website tetap \*\*mandiri\*\*; Muse (Harless) berperan sebagai perantara pengatur *di luar* aplikasi, dari chat. Alur yang didukung:

1. Handy mengirim link (atau file video beserta link aslinya) ke Muse di chat dan meminta menyimpannya.

2. Muse membaca isi/keterangan konten, lalu menentukan: judul ringkas, tipe, Koleksi yang disarankan, dan catatan ringkasan kenapa item itu berguna.

3. Muse mengirim balik satu link "Tambahkan ke SimpanAja" (format di bawah).

4. Handy mengetuk link itu → SimpanAja terbuka dengan formulir tambah \*\*sudah terisi\*\* → Handy memeriksa dan menekan `Simpan`. Tidak ada penyimpanan otomatis tanpa konfirmasi Handy.

\*\*Format link 1-tap \[Usulan Harless — harus persis seperti ini agar link buatan Muse selalu cocok dengan aplikasi\]:\*\*

\`\`\`

&lt;alamat-aplikasi&gt;#add=&lt;PAYLOAD&gt;

\`\`\`

- `PAYLOAD` adalah JSON berikut yang di-encode \*\*base64url (UTF-8, tanpa padding)\*\*:

\`\`\`json

{

  "v": 1,

  "title": "judul usulan (opsional; bila kosong diturunkan dari URL)",

  "url": "[https://…](https://…)",

  "type": "video | website | command | repo | extension | other",

  "command": "khusus type=command, opsional untuk tipe lain",

  "collection": "nama Koleksi usulan (teks, opsional)",

  "note": "catatan usulan (opsional)"

}

\`\`\`

- Perilaku aplikasi saat membuka link ini:

  - Decode &amp; validasi payload. Bila tidak valid → tampilkan pesan kesalahan singkat dan buka formulir tambah kosong.

  - Bila nama Koleksi pada payload belum ada → Koleksi itu \*\*belum dibuat\*\*; formulir menampilkan usulan nama itu sebagai Koleksi baru terpilih yang baru benar-benar dibuat saat pengguna menekan `Simpan`. \*\*\[Usulan Harless\]\*\*

  - Buka formulir terisi persis seperti tambah manual (termasuk deteksi/peringatan duplikat §7.1).

  - Setelah formulir dibuka, \*\*hapus fragment `#add=…` dari URL\*\* (history replace) agar refresh tidak membuka formulir berulang dan payload tidak tertinggal di riwayat alamat.

  - \*\*Batas panjang \[Usulan Harless\]:\*\* payload JSON (sebelum di-encode) maksimal \*\*2.000 karakter\*\*. Muse hanya membuat link 1-tap bila payload di dalam batas itu; bookmark yang lebih panjang (terutama Command panjang atau catatan panjang) \*\*wajib dikirim Muse sebagai file import JSON\*\* (§7.8), bukan link. Bila aplikasi menerima payload yang melebihi batas, payload ditolak dengan pesan bahwa bookmark itu terlalu panjang untuk link dan harus memakai import JSON, lalu formulir tambah kosong dibuka.

- Pintu kedua dari Muse adalah \*\*import JSON\*\* (§7.8): Muse dapat menyiapkan satu file JSON berisi banyak bookmark hasil kurasi, Handy meng-import-nya sekali.

### 7.8 Export / Import JSON (backup) \*\*\[Handy — wajib v1\]\*\*

\*\*Format file export (versi 1):\*\*

\`\`\`json

{

  "app": "SimpanAja",

  "version": 1,

  "exportedAt": "&lt;ISO 8601&gt;",

  "collections": \[{ "id": "…", "name": "…" }\],

  "bookmarks": \[

    {

      "id": "…",

      "title": "…",

      "type": "video | website | command | repo | extension | other",

      "url": "[https://…](https://…) (null untuk command)",

      "command": "teks command (null untuk tipe berbasis link)",

      "collectionId": "id Koleksi atau null",

      "note": "…",

      "createdAt": "&lt;ISO 8601&gt;",

      "updatedAt": "&lt;ISO 8601&gt;"

    }

  \]

}

\`\`\`

- \*\*Export:\*\* satu tombol mengunduh satu file JSON berisi seluruh Koleksi &amp; bookmark, bernama `simpanaja-backup-YYYY-MM-DD.json` (tanggal hari export, zona waktu pengguna).

- \*\*Import = gabung (merge), bukan timpa total \[Usulan Harless\]:\*\*

  - File divalidasi (`app` &amp; `version` cocok, struktur benar). File yang tidak valid ditolak utuh dengan pesan kesalahan; tidak ada import sebagian dari file rusak.

  - Koleksi dicocokkan berdasarkan \*\*nama\*\* (tidak peka huruf besar/kecil); yang belum ada dibuatkan.

  - Bookmark yang URL-nya (untuk Command: teks command-nya) sudah ada → \*\*dilewati\*\* sebagai duplikat, tidak ditimpa.

  - \*\*Identitas &amp; waktu saat import \[Usulan Harless\]:\*\* `id`, `createdAt`, dan `updatedAt` dari file \*\*dipertahankan\*\*, agar restore mempertahankan urutan "terbaru di atas" berdasarkan waktu simpan aslinya dan bukan waktu import. Pengecualian: bila `id` yang masuk sudah dipakai bookmark lain yang *bukan* duplikat menurut aturan di atas, bookmark yang masuk mendapat `id` baru (timestamp-nya tetap dipertahankan). Pemeriksaan duplikat dilakukan sebelum penanganan `id`.

  - Selesai import, tampilkan ringkasan: `X ditambahkan, Y dilewati (duplikat), Z Koleksi baru dibuat`.

## 8. Model Data &amp; Aturan Turunan

### 8.1 Bookmark

| Field | Aturan |

|---|---|

| `id` | String unik dibuat aplikasi (UUID/random) |

| `title` | Teks; opsional di formulir/Muse/import — bila kosong diturunkan otomatis (§8.4) |

| `type` | Enum persis: `video`, `website`, `command`, `repo`, `extension`, `other` |

| `url` | Wajib untuk semua tipe kecuali `command`; hanya `http(s)`; untuk `command` bernilai `null` |

| `command` | Wajib untuk tipe `command`; untuk tipe lain bernilai `null` |

| `collectionId` | ID Koleksi atau `null` (= Belum Dikoleksi) |

| `note` | Teks, boleh kosong |

| `createdAt` / `updatedAt` | Timestamp ISO 8601; `createdAt` tidak berubah saat edit |

### 8.2 Koleksi (Collection)

| Field | Aturan |

|---|---|

| `id` | String unik dibuat aplikasi |

| `name` | Wajib, unik tidak peka huruf besar/kecil |

| `createdAt` | Timestamp ISO 8601 |

### 8.3 Aturan tebak tipe dari domain \*\*\[Handy — ditebak otomatis; tabel: Usulan Harless\]\*\*

Tebakan bersifat saran yang dapat diganti pengguna:

| Pola host | Tebakan tipe |

|---|---|

| [`github.com`](http://github.com) | Repo GitHub (`repo`) |

| [`youtube.com`](http://youtube.com), [`youtu.be`](http://youtu.be), [`tiktok.com`](http://tiktok.com), [`instagram.com`](http://instagram.com), [`threads.com`](http://threads.com), [`threads.net`](http://threads.net) | Video (`video`) |

| [`chromewebstore.google.com`](http://chromewebstore.google.com), [`chrome.google.com/webstore`](http://chrome.google.com/webstore`), [`addons.mozilla.org`](http://addons.mozilla.org) | Extension (`extension`) |

| Semua host lain | Website (`website`) |

Label sumber pada kartu diturunkan dari host: [`github.com`](http://github.com)→"GitHub", [`youtube.com`](http://youtube.com)/[`youtu.be`](http://youtu.be)→"YouTube", [`tiktok.com`](http://tiktok.com)→"TikTok", [`instagram.com`](http://instagram.com)→"Instagram", `threads.*`→"Threads", [`chromewebstore.google.com`](http://chromewebstore.google.com)→"Chrome Web Store", [`addons.mozilla.org`](http://addons.mozilla.org)→"Firefox Add-ons", selain itu hostname apa adanya.

### 8.4 Judul otomatis (lokal, tanpa jaringan)

Bila `title` kosong saat simpan, item dari link Muse tanpa judul, atau import tanpa judul, aplikasi menurunkan judul dari data yang sudah ada. Tidak ada panggilan jaringan dan tidak ada pembacaan halaman sumber (tetap sesuai §4).

| Sumber | Judul |
|---|---|
| Repo GitHub `github.com/owner/repo` | `owner/repo` |
| YouTube (`watch?v=ID`, `youtu.be/ID`, `shorts/ID`) | `YouTube — ID` |
| Chrome Web Store / Firefox Add-ons | `Chrome Web Store` / `Firefox Add-ons` |
| Path umum (`web.dev/learn/css/layout`) | `Learn Css Layout` — path di-humanize (`-`/`_`/`+` → spasi, Title Case), maks 3 segmen terakhir, buang segmen locale/angka/hash |
| Tanpa path bermakna | hostname tanpa `www.` |
| Command | baris pertama teks command, spasi dirapatkan, dipotong 60 karakter |

Judul hasil turunan disimpan seperti judul biasa dan tetap bisa diedit.

## 9. Pendekatan yang Dipertimbangkan

### 9.1 Bentuk aplikasi

- \*\*A — Dashboard satu halaman (DIPILIH Handy):\*\* semua fungsi dalam satu layar; simpan &amp; temukan tercepat; paling simpel dibuat dan dipakai di HP.

- B — Banyak halaman terpisah (Beranda / per-Koleksi / detail): ruang detail luas, tetapi terlalu banyak klik untuk tugas harian dan lebih lama dibuat.

- C — Daftar padat gaya tabel: efisien untuk Command/Repo dalam jumlah besar, tetapi Video tidak visual dan kurang nyaman di HP.

### 9.2 Jalur otomatisasi / AI

- \*\*Perantara Muse lewat link 1-tap + import JSON (DIPILIH Handy):\*\* aplikasi tetap mandiri &amp; lokal; pengorganisasian cerdas dilakukan Muse di chat; pengguna tetap mengonfirmasi tiap penyimpanan dari link.

- Impor otomatis langsung dari Saved platform (Threads dll.): \*\*ditolak karena terverifikasi tidak bisa\*\* untuk website standalone (lihat §4).

- Extension pendamping penangkap klik bookmark di situs web platform: bisa secara teknis (ada bukti produk sejenis), tetapi proyek kedua terpisah dan hanya bekerja di browser desktop — \*\*diparkir\*\*.

- LLM tertanam dalam aplikasi dengan API key sendiri: membatalkan kesederhanaan lokal/gratis/tanpa login — \*\*ditolak\*\*.

## 10. Kriteria Keberhasilan (untuk QA di tahap rencana)

Aplikasi dianggap memenuhi spec ini bila skenario berikut lulus:

1. Menambah satu item untuk \*\*setiap tipe\*\* (termasuk Command tanpa URL) dan semuanya muncul di grid dengan lencana tipe yang benar. Bila kolom judul dikosongkan, judul diturunkan otomatis (§8.4) dan tetap tampil di kartu.

2. Menempel link [`github.com`](http://github.com) menebak tipe Repo; link YouTube menebak Video; link Chrome Web Store menebak Extension; link situs biasa menebak Website; tebakan dapat diganti manual.

3. Search `ffmpeg` menemukan Command yang \*\*isi command-nya\*\* mengandung kata itu, walaupun judulnya tidak.

4. Kombinasi search + chip tipe + filter Koleksi menghasilkan irisan yang benar; mengosongkan semuanya mengembalikan daftar penuh urut terbaru-di-atas.

5. Membuka detail kartu Command lalu menekan Copy menyalin teks command persis; membuka detail kartu berbasis link lalu menekan Copy menyalin URL persis.

6. Menghapus Koleksi tidak menghapus bookmark-nya; itemnya tampil di "Belum Dikoleksi".

7. Menekan kartu Video membuka modal detail; tombol `Preview` di sana memutar embed YouTube; item Threads menampilkan popup fallback dengan tombol `Tonton di Sumbernya`; menutup popup menghentikan pemutaran. Tidak ada hover-preview.

8. Link 1-tap Muse yang valid membuka formulir terisi (termasuk usulan Koleksi baru), fragment dibersihkan dari URL, dan item \*\*belum\*\* tersimpan sebelum `Simpan` ditekan. Link dengan payload rusak menampilkan pesan kesalahan dan formulir kosong.

9. Export menghasilkan satu file JSON sesuai format §7.8; import file itu ke aplikasi yang masih kosong memulihkan seluruh Koleksi &amp; bookmark; import file yang sama kedua kali melaporkan semua bookmark sebagai duplikat yang dilewati.

10. Menambah URL yang sudah tersimpan memunculkan peringatan duplikat §7.1.

11. Seluruh alur di atas dapat dilakukan pada viewport ±390px tanpa elemen tumpang tindih yang menghalangi, dan pada ±1280px grid tampil multi-kolom. Kartu dapat difokus keyboard (role tombol, `Enter`/`Space` membuka detail); thumbnail tidak merusak lebar kartu.

12. Panggilan jaringan saat aplikasi dipakai hanya ke sumber yang diizinkan §6: membuka link yang diklik pengguna, embed saat preview dibuka, dan gambar thumbnail dari `i.ytimg.com` serta `www.google.com/s2/favicons` (termasuk redirect layanannya). Tidak ada panggilan lain.

13. Import ke aplikasi yang tidak kosong mempertahankan `createdAt` asli tiap bookmark (urutan daftar tidak berubah menjadi urutan import), dan tabrakan `id` dengan bookmark berbeda diselesaikan dengan `id` baru untuk item yang masuk.

14. Link 1-tap dengan payload JSON lebih dari 2.000 karakter ditolak dengan pesan kesalahan yang mengarahkan ke import JSON.

15. Mengklik kartu membuka modal detail terpusat yang memuat thumbnail, lencana tipe, judul, sumber, URL/command, Koleksi, catatan, tanggal, dan semua aksi (`Buka`/`Copy`/`Preview`/`Edit`/`Hapus`/`Tutup`); `Tutup`, `Esc`, dan klik backdrop menutup modal tanpa perubahan data.

## 11. Yang Diserahkan ke Builder (tahap rencana yang memutuskan)

Spec ini sengaja \*\*tidak\*\* menentukan, dan rencana implementasi yang memutuskan:

- Tumpukan teknologi &amp; struktur file persis (bahasa/framework/bundler atau tanpa framework), selama hasilnya client-only dan memenuhi seluruh § di atas.

- Skema visual persis (palet warna per tipe, ikon, tipografi), selama lencana tipe mudah dibedakan sekilas dan tampilannya tidak generik.

- Bentuk persis modal/panel formulir, dialog konfirmasi, dan daftar Koleksi di HP.

- Mekanisme persis IndexedDB (pustaka atau vanilla) dan strategi pengujian/verifikasinya.

## 12. Riwayat Keputusan Brainstorming (ringkas)

1. Scope: personal, satu browser/perangkat, \*\*tanpa login &amp; sync\*\*. \*\*\[Handy\]\*\*

2. Export/import JSON: \*\*wajib v1\*\*. \*\*\[Handy\]\*\*

3. Cara menemukan: \*\*Search utama + filter tipe + Koleksi\*\*. \*\*\[Handy — dari usulan Harless\]\*\*

4. Cara menyimpan: \*\*simpan cepat, tipe ditebak otomatis\*\*; judul manual (auto-fetch tidak dijanjikan). \*\*\[Handy\]\*\*

5. Impor otomatis dari Saved Threads: \*\*tidak bisa\*\* (terverifikasi); jalur otomatisasi dipilih \*\*perantara Muse\*\*. \*\*\[Handy — setelah penjelasan\]\*\*

6. AI: \*\*Muse di luar aplikasi lewat link 1-tap (Pendekatan A)\*\*, bukan LLM tertanam, bukan aplikasi yang hidup di dalam Muse. \*\*\[Handy\]\*\*

7. Bentuk aplikasi: \*\*Dashboard satu halaman (Pendekatan A)\*\*. \*\*\[Handy\]\*\*

8. Fitur: 6 fitur §7.1–7.8 disetujui, \*\*tanpa Pin/Favorit\*\*, lalu diamendemen Handy dengan \*\*preview popup Video\*\*. \*\*\[Handy\]\*\*

9. Preview popup: \*\*bersyarat embed + fallback\*\* untuk platform yang memblokir. \*\*\[Handy\]\*\*

10. Nama: \*\*SimpanAja\*\*. \*\*\[Handy\]\*\*

11. Rumah kanonis &amp; bentuk: \*\*HP sebagai perangkat/browser utama\*\* dan \*\*halaman web biasa (bukan PWA)\*\* — keputusan Handy (`1a 2b`) menjawab pertanyaan hasil builder check. \*\*\[Handy\]\*\*

## 13. Catatan Hasil Builder Check (2026-11-03)

Spec ini sudah dibaca ulang oleh reviewer dari sisi builder. Hasilnya:

- \*\*Diselesaikan sebagai \[Usulan Harless\] dan sudah dimasukkan ke spec:\*\* (a) alamat kanonis HTTPS tunggal &amp; konsekuensi origin/browser (§6 butir 7); (b) identitas &amp; timestamp saat import (§7.8); (c) batas payload link 1-tap 2.000 karakter dengan jalur import JSON untuk yang lebih panjang (§7.7).

- \*\*Keputusan Handy setelah builder check (kode `1a 2b`, 2026-11-03):\*\* (a) perangkat &amp; browser utama = \*\*HP\*\* (§6 butir 8); (b) bentuk v1 = \*\*halaman web biasa, bukan PWA\*\* (§6 butir 9). Dengan ini tidak ada lagi pertanyaan builder check yang menggantung.

