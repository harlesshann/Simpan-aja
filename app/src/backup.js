import { TYPES } from './constants.js';
import { normalizeUrl, isValidHttpUrl, deriveTitle } from './detect.js';

// Kunci duplikat bersama untuk tambah manual, link Muse, dan import.
export function duplicateKey(b) {
  if (b.type === 'command') return 'cmd:' + String(b.command).trim();
  return 'url:' + normalizeUrl(b.url);
}

export function findDuplicate(bookmarks, candidate, ignoreId) {
  const key = duplicateKey(candidate);
  return bookmarks.find((b) => b.id !== ignoreId && duplicateKey(b) === key);
}

const pad = (n) => String(n).padStart(2, '0');

export function buildExport({ bookmarks, collections }, now = new Date()) {
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return {
    data: {
      app: 'SimpanAja',
      version: 1,
      exportedAt: now.toISOString(),
      collections: collections.map((c) => ({ id: c.id, name: c.name, createdAt: c.createdAt })),
      bookmarks: bookmarks.map((b) => ({
        id: b.id, title: b.title, type: b.type,
        url: b.url ?? null, command: b.command ?? null,
        collectionId: b.collectionId ?? null, note: b.note || '',
        createdAt: b.createdAt, updatedAt: b.updatedAt,
      })),
    },
    filename: `simpanaja-backup-${stamp}.json`,
  };
}

// Murni: tak menyentuh DB. Pemanggil menerapkan addCollections lalu addBookmarks.
export function planImport(text, existing, makeId = () => crypto.randomUUID()) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'File bukan JSON yang valid.' };
  }

  if (!data || data.app !== 'SimpanAja' || data.version !== 1) {
    return { ok: false, error: 'File bukan backup SimpanAja versi 1.' };
  }
  if (!Array.isArray(data.collections) || !Array.isArray(data.bookmarks)) {
    return { ok: false, error: 'Struktur file tidak lengkap.' };
  }

  for (const c of data.collections) {
    if (!c || typeof c.name !== 'string' || !c.name.trim()) {
      return { ok: false, error: 'Ada Koleksi tanpa nama.' };
    }
  }
  for (const b of data.bookmarks) {
    if (!b || (b.title != null && typeof b.title !== 'string')) {
      return { ok: false, error: 'Ada bookmark dengan judul yang tidak valid.' };
    }
    if (!TYPES.includes(b.type)) {
      return { ok: false, error: 'Ada bookmark dengan tipe tidak dikenal.' };
    }
    if (b.type === 'command') {
      if (typeof b.command !== 'string' || !b.command.trim()) {
        return { ok: false, error: 'Ada Command tanpa isi.' };
      }
    } else if (!isValidHttpUrl(b.url)) {
      return { ok: false, error: 'Ada bookmark dengan URL tidak valid.' };
    }
    if (typeof b.id !== 'string' || !b.id) return { ok: false, error: 'Ada bookmark tanpa id.' };
    if (typeof b.createdAt !== 'string' || typeof b.updatedAt !== 'string') {
      return { ok: false, error: 'Ada bookmark tanpa timestamp.' };
    }
  }

  const existingCollections = existing.collections || [];
  const existingBookmarks = existing.bookmarks || [];
  const byName = new Map(existingCollections.map((c) => [c.name.toLowerCase(), c]));
  const usedCollectionIds = new Set(existingCollections.map((c) => c.id));
  const idMap = new Map();
  const addCollections = [];

  for (const c of data.collections) {
    const key = c.name.trim().toLowerCase();
    let match = byName.get(key);
    if (!match) {
      let id = typeof c.id === 'string' && c.id && !usedCollectionIds.has(c.id) ? c.id : makeId();
      while (usedCollectionIds.has(id)) id = makeId();
      match = {
        id,
        name: c.name.trim(),
        createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date().toISOString(),
      };
      usedCollectionIds.add(id);
      addCollections.push(match);
      byName.set(key, match);
    }
    idMap.set(c.id, match.id);
  }

  const seen = new Set(existingBookmarks.map(duplicateKey));
  const usedBookmarkIds = new Set(existingBookmarks.map((b) => b.id));
  const addBookmarks = [];
  let skippedDuplicates = 0;

  for (const b of data.bookmarks) {
    const candidate = {
      id: b.id,
      title: (typeof b.title === 'string' && b.title.trim()) ? b.title.trim() : deriveTitle(b),
      type: b.type,
      url: b.type === 'command' ? null : b.url,
      command: b.type === 'command' ? b.command : null,
      collectionId: b.collectionId ? (idMap.get(b.collectionId) ?? null) : null,
      note: typeof b.note === 'string' ? b.note : '',
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };

    const key = duplicateKey(candidate);
    if (seen.has(key)) { skippedDuplicates++; continue; }

    let id = candidate.id;
    if (usedBookmarkIds.has(id)) id = makeId();
    while (usedBookmarkIds.has(id)) id = makeId();
    candidate.id = id;
    usedBookmarkIds.add(id);
    seen.add(key);
    addBookmarks.push(candidate);
  }

  return { ok: true, addCollections, addBookmarks, skippedDuplicates, newCollections: addCollections.length };
}
