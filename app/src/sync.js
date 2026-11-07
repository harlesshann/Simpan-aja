import { SUPABASE_URL, SUPABASE_ANON_KEY, SYNC_ENABLED } from './config.js';
import {
  getMeta, setMeta, listOutbox, clearOutbox, enqueueChange,
  getBookmarkRow, getCollectionRow, rawPut, rawDelete, clearLocalData,
  listBookmarks, listCollections,
} from './db.js';

/* Sinkronasi offline-first. IndexedDB tetap sumber kebenaran lokal; server
   hanyalah lapisan berbagi antar-device. Konflik: last-write-wins pakai
   updated_at, hapus lewat tombstone (deleted_at) supaya ikut tersebar. */

export const PULL_PAGE = 200;
const EPOCH = '1970-01-01T00:00:00.000Z';
const STORES = ['collections', 'bookmarks'];

/* ---------------------------------------------------------------
   Fungsi murni (dites tanpa jaringan / IndexedDB)
--------------------------------------------------------------- */

// 'take-remote' bila versi server lebih baru; selain itu pertahankan lokal.
export function decide(local, remote) {
  if (!local) return 'take-remote';
  const l = Date.parse(local.updatedAt || '') || 0;
  const r = Date.parse(remote.updated_at || '') || 0;
  return r > l ? 'take-remote' : 'keep-local';
}

// camelCase lokal -> snake_case kolom Supabase.
export function toRemote(store, row) {
  if (store === 'collections') {
    return {
      id: row.id, name: row.name ?? null, color: row.color ?? null,
      created_at: row.createdAt ?? null, updated_at: row.updatedAt,
      deleted_at: row.deletedAt ?? null,
    };
  }
  return {
    id: row.id, title: row.title ?? null, type: row.type ?? null,
    url: row.url ?? null, command: row.command ?? null,
    collection_id: row.collectionId ?? null, note: row.note ?? '',
    image: row.image ?? null, created_at: row.createdAt ?? null,
    updated_at: row.updatedAt, deleted_at: row.deletedAt ?? null,
  };
}

export function fromRemote(store, row) {
  if (store === 'collections') {
    return {
      id: row.id, name: row.name ?? '', color: row.color ?? null,
      createdAt: row.created_at, updatedAt: row.updated_at,
      deletedAt: row.deleted_at ?? null,
    };
  }
  return {
    id: row.id, title: row.title ?? '', type: row.type, url: row.url ?? null,
    command: row.command ?? null, collectionId: row.collection_id ?? null,
    note: row.note ?? '', image: row.image ?? null,
    createdAt: row.created_at, updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  };
}

// Akun berganti (bukan login pertama): cache lokal milik akun lama harus
// dibuang supaya tidak didorong ke akun baru.
export function shouldResetLocal(prevUserId, nextUserId) {
  return Boolean(prevUserId && nextUserId && prevUserId !== nextUserId);
}

// Baris lokal sudah tidak ada (hapus permanen) -> kirim tombstone.
export function outboxPayload(store, entry, row) {
  if (!row) {
    return { id: entry.id, updated_at: entry.updatedAt, deleted_at: entry.deletedAt || entry.updatedAt };
  }
  const payload = toRemote(store, row);
  // Baris lama (sebelum fitur sync) bisa belum punya updatedAt.
  if (!payload.updated_at) payload.updated_at = entry.updatedAt;
  return payload;
}

/* ---------------------------------------------------------------
   Runtime
--------------------------------------------------------------- */

export async function initSync({ onStatus = () => {}, onRemoteChange = () => {} } = {}) {
  const state = {
    enabled: false,
    user: null,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    syncing: false,
    error: false,
  };
  const notify = () => onStatus({ ...state });
  notify();

  const noop = { signIn() {}, signOut() {}, syncNow() {} };
  if (!SYNC_ENABLED) return noop;

  let client;
  try {
    // Dimuat saat runtime supaya app tetap jalan offline / tanpa CDN.
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  } catch {
    state.error = true;
    notify();
    return noop;
  }

  state.enabled = true;
  notify();

  let userId = null;
  let channel = null;
  let busy = false;
  let timer;

  const scoped = (base) => `${base}:${userId}`;
  const later = (fn) => {
    clearTimeout(timer);
    timer = setTimeout(() => { void fn(); }, 250);
  };
  const fail = (e) => {
    state.error = true;
    console.warn('[sync]', e && e.message ? e.message : e);
    notify();
  };

  async function flush() {
    if (!userId || !state.online) return;
    const entries = await listOutbox();
    for (const entry of entries) {
      const row = entry.store === 'collections'
        ? await getCollectionRow(entry.id)
        : await getBookmarkRow(entry.id);
      const { error } = await client.from(entry.store).upsert(outboxPayload(entry.store, entry, row));
      if (error) throw error;
      await clearOutbox([entry.seq]);
    }
  }

  async function pullStore(store) {
    const cursorKey = scoped(`lastPull:${store}`);
    let cursor = await getMeta(cursorKey, EPOCH);
    let changed = false;
    for (;;) {
      const { data, error } = await client.from(store).select('*')
        .gt('updated_at', cursor)
        .order('updated_at', { ascending: true })
        .limit(PULL_PAGE);
      if (error) throw error;
      if (!data.length) break;
      for (const r of data) {
        cursor = r.updated_at;
        const local = store === 'collections'
          ? await getCollectionRow(r.id)
          : await getBookmarkRow(r.id);
        if (decide(local, r) !== 'take-remote') continue;
        if (r.deleted_at) await rawDelete(store, r.id);
        else await rawPut(store, fromRemote(store, r));
        changed = true;
      }
      // Cursor per tabel; cukup untuk satu pengguna. Batas: baris dengan
      // updated_at identik di batas halaman bisa terlewat (LWW sudah
      // mengasumsikan timestamp unik). Naikkan ke keyset (updated_at,id)
      // kalau ini mulai terasa.
      await setMeta(cursorKey, cursor);
      if (data.length < PULL_PAGE) break;
    }
    return changed;
  }

  async function pullAll() {
    if (!userId || !state.online) return;
    let changed = false;
    for (const store of STORES) {
      if (await pullStore(store)) changed = true;
    }
    if (changed) {
      state.error = false;
      notify();
      await onRemoteChange();
    }
  }

  async function syncAll() {
    if (!userId || busy || !state.online) return;
    busy = true;
    state.syncing = true;
    state.error = false;
    notify();
    try {
      await flush();
      await pullAll();
    } catch (e) {
      fail(e);
    } finally {
      busy = false;
      state.syncing = false;
      notify();
    }
  }

  // Login pertama: data yang dibuat sebelum fitur sync belum punya outbox.
  async function bootstrap() {
    if (!userId || await getMeta(scoped('bootstrapped'), false)) return;
    for (const c of await listCollections()) await enqueueChange('collections', c.id, { updatedAt: c.updatedAt });
    for (const b of await listBookmarks()) await enqueueChange('bookmarks', b.id, { updatedAt: b.updatedAt });
    await setMeta(scoped('bootstrapped'), true);
  }

  function subscribe() {
    if (channel) return;
    channel = client.channel('simpanaja-sync');
    for (const store of STORES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: store, filter: `user_id=eq.${userId}` },
        () => later(pullAll),
      );
    }
    channel.subscribe();
  }

  function unsubscribe() {
    if (!channel) return;
    void client.removeChannel(channel);
    channel = null;
  }

  async function onSession(session) {
    const next = session && session.user
      ? { id: session.user.id, email: session.user.email || '' }
      : null;
    const switched = (next && next.id) !== userId;
    userId = next ? next.id : null;
    state.user = next;
    notify();
    if (!next) { unsubscribe(); return; }
    if (!switched) return; // token refresh: tidak perlu tarik ulang
    try {
      // Akun berganti: cache lokal milik akun lama jangan ikut didorong ke
      // akun baru (id bisa menabrak baris milik user lain → RLS menolak).
      const prevUser = await getMeta('userId', null);
      if (shouldResetLocal(prevUser, next.id)) {
        await clearLocalData();
        await onRemoteChange();
      }
      await setMeta('userId', next.id);
      // Tarik dulu supaya versi server yang lebih baru menang sebelum data
      // lokal lama diunggah (LWW tetap benar saat login pertama).
      await pullAll();
      await bootstrap();
      await syncAll();
      subscribe();
    } catch (e) {
      fail(e);
    }
  }

  // Callback auth tidak boleh async (bisa deadlock di supabase-js).
  client.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => { void onSession(session); }, 0);
  });

  const { data } = await client.auth.getSession();
  await onSession(data.session);

  window.addEventListener('simpanaja:local-change', () => later(syncAll));
  window.addEventListener('online', () => { state.online = true; notify(); void syncAll(); });
  window.addEventListener('offline', () => { state.online = false; notify(); });
  window.addEventListener('focus', () => { void pullAll(); });

  return {
    signIn() {
      state.error = false;
      notify();
      return client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: location.origin + location.pathname },
      });
    },
    async signOut() {
      await client.auth.signOut();
    },
    syncNow() { return syncAll(); },
  };
}