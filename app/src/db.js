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

async function put(store, value) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(value);
  await txDone(tx);
}

export const listBookmarks = () => getAll('bookmarks');
export const listCollections = () => getAll('collections');
export const putBookmark = (b) => put('bookmarks', b);
export const putCollection = (c) => put('collections', c);

async function remove(store, id) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(id);
  await txDone(tx);
}

export const deleteBookmark = (id) => remove('bookmarks', id);

// Hapus Koleksi + lepas semua itemnya dalam satu transaksi.
export async function deleteCollectionAndDetach(collectionId) {
  const db = await openDB();
  const tx = db.transaction(['bookmarks', 'collections'], 'readwrite');
  const bookmarksStore = tx.objectStore('bookmarks');
  const req = bookmarksStore.getAll();
  req.onsuccess = () => {
    for (const b of req.result) {
      if (b.collectionId === collectionId) bookmarksStore.put({ ...b, collectionId: null });
    }
  };
  tx.objectStore('collections').delete(collectionId);
  await txDone(tx);
}
