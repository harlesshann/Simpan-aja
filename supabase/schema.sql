-- Skema sinkronasi SimpanAja (jalankan sekali di Supabase SQL Editor).
-- Model: tabel milik per-user (user_id = auth.uid()), soft-delete (tombstone)
-- supaya penghapusan ikut tersebar, dan updated_at sebagai penentu
-- last-write-wins. Isi konten boleh NULL supaya tombstone pertama kali
-- (item dibuat & dihapus saat offline) tetap bisa di-upsert.

create table if not exists public.collections (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text,
  color text,
  created_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.bookmarks (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text,
  type text,
  url text,
  command text,
  collection_id text, -- sengaja tanpa FK: sync lebih sederhana, integritas dijaga client
  note text,
  image text,
  created_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists collections_user_updated on public.collections (user_id, updated_at);
create index if not exists bookmarks_user_updated on public.bookmarks (user_id, updated_at);

-- RLS: tiap pengguna hanya boleh melihat & mengubah baris miliknya sendiri.
alter table public.collections enable row level security;
alter table public.bookmarks enable row level security;

create policy "collections own rows" on public.collections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "bookmarks own rows" on public.bookmarks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime: butuh replica identity full supaya event DELETE tetap membawa
-- user_id (filter di client memakai user_id).
alter table public.collections replica identity full;
alter table public.bookmarks replica identity full;

-- Masukkan ke publication realtime (jalankan sekali; error "already a member"
-- berarti sudah aktif).
alter publication supabase_realtime add table public.collections;
alter publication supabase_realtime add table public.bookmarks;
