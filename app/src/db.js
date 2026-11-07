import { DB_NAME, DB_VERSION } from './constants.js';

let dbPromise;

export function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('bookmarks')) db.createObjectStore('bookmarks', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('collections')) db.createObjectStore('collections', { keyPath: 'id' });
        // Outbox: antrean perubahan lokal yang belum dikirim ke server.
        if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
        // Meta: cursor sync (mis. lastPull), flag inisialisasi.
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

const txDone = (tx) => new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(tx.error);
});

const request = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

async function getAll(store) {
  const db = await openDB();
  return request(db.transaction(store).objectStore(store).getAll());
}

async function getRow(store, id) {
  const db = await openDB();
  return request(db.transaction(store).objectStore(store).get(id));
}

export const listBookmarks = async () => (await getAll('bookmarks')).filter((b) => !b.deletedAt);
export const listCollections = async () => (await getAll('collections')).filter((c) => !c.deletedAt);

export const getBookmarkRow = (id) => getRow('bookmarks', id);
export const getCollectionRow = (id) => getRow('collections', id);

/* ---------------------------------------------------------------
   Meta + outbox
--------------------------------------------------------------- */

export async function getMeta(key, fallback = null) {
  const row = await getRow('meta', key);
  return row ? row.value : fallback;
}

export async function setMeta(key, value) {
  const db = await openDB();
  const tx = db.transaction('meta', 'readwrite');
  tx.objectStore('meta').put({ key, value });
  await txDone(tx);
}

// Satu entri per (store, id): entri lama untuk id yang sama dibuang dulu.
export async function enqueueChange(store, id, { updatedAt, deletedAt = null } = {}) {
  const db = await openDB();
  const tx = db.transaction('outbox', 'readwrite');
  const os = tx.objectStore('outbox');
  const all = await request(os.getAll());
  for (const e of all) if (e.store === store && e.id === id) os.delete(e.seq);
  os.add({ store, id, updatedAt: updatedAt || new Date().toISOString(), deletedAt });
  await txDone(tx);
}

export const listOutbox = () => getAll('outbox');

export async function clearOutbox(seqs) {
  if (!seqs.length) return;
  const db = await openDB();
  const tx = db.transaction('outbox', 'readwrite');
  const os = tx.objectStore('outbox');
  for (const seq of seqs) os.delete(seq);
  await txDone(tx);
}

/* ---------------------------------------------------------------
   Tulis lokal (selalu stamp updatedAt + masuk outbox)
--------------------------------------------------------------- */

function announceLocalChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('simpanaja:local-change'));
}

async function putLocal(store, value) {
  const now = new Date().toISOString();
  const row = { ...value, updatedAt: now };
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(row);
  await txDone(tx);
  await enqueueChange(store, row.id, { updatedAt: now });
  announceLocalChange();
  return row;
}

export const putBookmark = (b) => putLocal('bookmarks', b);
export const putCollection = (c) => putLocal('collections', c);

export async function deleteBookmark(id) {
  const db = await openDB();
  const tx = db.transaction('bookmarks', 'readwrite');
  tx.objectStore('bookmarks').delete(id);
  await txDone(tx);
  await enqueueChange('bookmarks', id, { deletedAt: new Date().toISOString() });
  announceLocalChange();
}

// Hapus Koleksi + lepas semua itemnya dalam satu transaksi.
export async function deleteCollectionAndDetach(collectionId) {
  const db = await openDB();
  const now = new Date().toISOString();
  const tx = db.transaction(['bookmarks', 'collections'], 'readwrite');
  const bookmarksStore = tx.objectStore('bookmarks');
  const detached = [];
  const req = bookmarksStore.getAll();
  req.onsuccess = () => {
    for (const b of req.result) {
      if (b.collectionId === collectionId) {
        const next = { ...b, collectionId: null, updatedAt: now };
        bookmarksStore.put(next);
        detached.push(next);
      }
    }
  };
  tx.objectStore('collections').delete(collectionId);
  await txDone(tx);

  for (const b of detached) await enqueueChange('bookmarks', b.id, { updatedAt: now });
  await enqueueChange('collections', collectionId, { deletedAt: now });
  announceLocalChange();
}

/* ---------------------------------------------------------------
   Tulis dari server (tanpa stamp/outbox, supaya tidak memantul balik)
--------------------------------------------------------------- */

export async function rawPut(store, row) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(row);
  await txDone(tx);
}

export async function rawDelete(store, id) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(id);
  await txDone(tx);
}

// Dipakai saat akun berganti: cache lokal milik akun lama jangan didorong
// ke akun baru (id-nya bisa menabrak baris milik user lain → RLS menolak).
export async function clearLocalData() {
  const db = await openDB();
  const stores = ['bookmarks', 'collections', 'outbox', 'meta'];
  const tx = db.transaction(stores, 'readwrite');
  for (const s of stores) tx.objectStore(s).clear();
  await txDone(tx);
}