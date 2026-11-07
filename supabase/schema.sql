-- Skema sinkronasi SimpanAja (jalankan sekali di Supabase SQL Editor).
-- Model: tabel milik per-user (user_id = auth.uid()), soft-delete (tombstone)
-- supaya penghapusan ikut tersebar, dan updated_at sebagai penentu
-- last-write-wins. Isi konten boleh NULL supaya tombstone pertama kali
-- (item dibuat & dihapus saat offline) tetap bisa di-upsert.

create table if not exists public.collections (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text,
  color text,
  created_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.bookmarks (
  id text not null,
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
  deleted_at timestamptz,
  primary key (user_id, id)
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

-- Masukkan ke publication realtime. Dibungkus DO supaya idempoten: error
-- "already a member" akan membatalkan seluruh batch (dan migrasi di bawahnya).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'collections'
  ) then
    alter publication supabase_realtime add table public.collections;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookmarks'
  ) then
    alter publication supabase_realtime add table public.bookmarks;
  end if;
end $$;

-- ------------------------------------------------------------------
-- Migrasi dari versi lama (PK hanya `id`). Jalankan bagian ini SEKALI kalau
-- tabel sudah ada sebelumnya. Idempoten: aman dijalankan berulang.
-- ------------------------------------------------------------------
do $$
declare cname text;
begin
  -- user_id harus punya default auth.uid()
  alter table public.collections alter column user_id set default auth.uid();
  alter table public.bookmarks   alter column user_id set default auth.uid();

  -- collections: pastikan PK = (user_id, id)
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.collections'::regclass and contype = 'p'
      and pg_get_constraintdef(oid) = 'PRIMARY KEY (user_id, id)'
  ) then
    for cname in
      select conname from pg_constraint
      where conrelid = 'public.collections'::regclass and contype = 'p'
    loop
      execute format('alter table public.collections drop constraint %I', cname);
    end loop;
    alter table public.collections add primary key (user_id, id);
  end if;

  -- bookmarks: pastikan PK = (user_id, id)
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.bookmarks'::regclass and contype = 'p'
      and pg_get_constraintdef(oid) = 'PRIMARY KEY (user_id, id)'
  ) then
    for cname in
      select conname from pg_constraint
      where conrelid = 'public.bookmarks'::regclass and contype = 'p'
    loop
      execute format('alter table public.bookmarks drop constraint %I', cname);
    end loop;
    alter table public.bookmarks add primary key (user_id, id);
  end if;
end $$;

notify pgrst, 'reload schema';
