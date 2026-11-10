-- Bucket thumbnail untuk fitur auto-thumbnail (jalankan sekali di SQL Editor).
-- Gambar diunggah Edge Function `auto-thumbnail` memakai JWT user, jadi RLS di
-- bawah membatasi tiap pengguna hanya bisa menulis/menghapus di foldernya
-- sendiri (`<auth.uid()>/...`). Tidak ada service_role di mana pun.
--
-- Bucket publik untuk BACA supaya kartu bisa menampilkan gambar tanpa signed
-- URL; nama file memakai UUID acak sehingga URL praktis tidak bisa ditebak.
-- Jangan simpan apa pun yang sensitif di bucket ini.

insert into storage.buckets (id, name, public)
values ('thumbnails', 'thumbnails', true)
on conflict (id) do update set public = true;

-- Idempoten: lepas dulu kalau sudah ada dari percobaan sebelumnya.
drop policy if exists "thumbnails insert own" on storage.objects;
drop policy if exists "thumbnails update own" on storage.objects;
drop policy if exists "thumbnails delete own" on storage.objects;

create policy "thumbnails insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'thumbnails' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "thumbnails update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'thumbnails' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'thumbnails' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "thumbnails delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'thumbnails' and (storage.foldername(name))[1] = auth.uid()::text);
