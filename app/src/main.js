import { TYPES, TYPE_LABELS } from './constants.js';
import { sourceLabel } from './detect.js';
import { filterBookmarks } from './search.js';
import { createCardEl, renderCollectionFilter } from './render.js';
import { openBookmarkForm, openCollectionManager } from './form.js';
import { openPreview, attachPreview } from './preview.js';
import { duplicateKey, findDuplicate } from './dupes.js';

/* ------------------------------------------------------------------
   ponytail: temporary in-memory store, seeded for UI review.
   Replace these five functions with db.js (Task 6); move export/import
   into backup.js (Task 5). No persistence yet, so a reload reseeds.
------------------------------------------------------------------ */
const iso = (d) => new Date(d).toISOString();
const store = {
  collections: [
    { id: 'c-motion', name: 'Motion Design', createdAt: iso('2026-10-30T08:00:00Z') },
  ],
  bookmarks: [
    { id: 'b-web', title: 'Artikel CSS layout', type: 'website', url: 'https://web.dev/learn/css/layout', command: null, collectionId: null, note: 'contoh situs biasa', createdAt: iso('2026-10-29T09:00:00Z'), updatedAt: iso('2026-10-29T09:00:00Z') },
    { id: 'b-repo', title: 'Orca video editor', type: 'repo', url: 'https://github.com/stablyai/orca', command: null, collectionId: 'c-motion', note: '', createdAt: iso('2026-10-31T09:00:00Z'), updatedAt: iso('2026-10-31T09:00:00Z') },
    { id: 'b-cmd', title: 'Konversi audio mp4', type: 'command', url: null, command: 'ffmpeg -i in.mp4 -vn -acodec libmp3lame out.mp3', collectionId: null, note: 'ambil audio saja', createdAt: iso('2026-11-01T09:00:00Z'), updatedAt: iso('2026-11-01T09:00:00Z') },
    { id: 'b-th', title: 'Teknik color grading', type: 'video', url: 'https://www.threads.com/@x/post/abc', command: null, collectionId: null, note: 'fallback, platform ini blokir embed', createdAt: iso('2026-11-02T09:00:00Z'), updatedAt: iso('2026-11-02T09:00:00Z') },
    { id: 'b-yt', title: 'Belajar easing dasar', type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', command: null, collectionId: 'c-motion', note: 'teknik easing untuk animasi', createdAt: iso('2026-11-03T09:00:00Z'), updatedAt: iso('2026-11-03T09:00:00Z') },
  ],
};
const listBookmarks = async () => [...store.bookmarks];
const listCollections = async () => [...store.collections];
const putBookmark = async (b) => { const i = store.bookmarks.findIndex((x) => x.id === b.id); i >= 0 ? (store.bookmarks[i] = b) : store.bookmarks.push(b); };
const deleteBookmark = async (id) => { store.bookmarks = store.bookmarks.filter((b) => b.id !== id); };
const putCollection = async (c) => { const i = store.collections.findIndex((x) => x.id === c.id); i >= 0 ? (store.collections[i] = c) : store.collections.push(c); };
const deleteCollectionAndDetach = async (id) => {
  store.collections = store.collections.filter((c) => c.id !== id);
  store.bookmarks = store.bookmarks.map((b) => (b.collectionId === id ? { ...b, collectionId: null } : b));
};
/* ------------------------------ end temporary ------------------------------ */

const els = {
  total: document.getElementById('totalCount'),
  search: document.getElementById('search'),
  chips: document.getElementById('typeChips'),
  grid: document.getElementById('grid'),
  empty: document.getElementById('emptyState'),
  collections: document.getElementById('collectionList'),
  importFile: document.getElementById('importFile'),
  toast: document.getElementById('toast'),
};

const state = { query: '', type: 'all', collection: 'all' };
let bookmarks = [];
let collections = [];

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { els.toast.hidden = true; }, 2600);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Tersalin.');
  } catch {
    window.prompt('Salin manual (Ctrl+C):', text);
  }
}

const collectionName = (id) => (collections.find((c) => c.id === id) || {}).name || '';

function renderChips() {
  const rows = [{ key: 'all', label: 'Semua' }, ...TYPES.map((t) => ({ key: t, label: TYPE_LABELS[t] }))];
  els.chips.replaceChildren(...rows.map((r) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.type = r.key;
    b.textContent = r.label;
    b.setAttribute('aria-pressed', String(state.type === r.key));
    return b;
  }));
}

function renderEmpty(total) {
  els.empty.replaceChildren();
  if (!total) {
    els.empty.append(
      Object.assign(document.createElement('h2'), { textContent: 'Belum ada bookmark' }),
      Object.assign(document.createElement('p'), { textContent: 'Mulai dengan menambahkan link pertama Anda.' }),
    );
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn btn-primary'; b.textContent = '+ Tambah';
    b.onclick = openAdd; els.empty.append(b);
    els.empty.hidden = false;
    return;
  }
  els.empty.append(
    Object.assign(document.createElement('h2'), { textContent: 'Tidak ada hasil' }),
    Object.assign(document.createElement('p'), { textContent: 'Tidak ada item yang cocok dengan search atau filter.' }),
  );
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn'; b.textContent = 'Bersihkan search & filter';
  b.onclick = () => { state.query = ''; state.type = 'all'; state.collection = 'all'; els.search.value = ''; render(); };
  els.empty.append(b);
  els.empty.hidden = false;
}

function handlers() {
  return {
    onCopy: (b) => copyText(b.type === 'command' ? b.command : b.url),
    onPreview: (b, cardEl) => openPreview(b, cardEl),
    onEdit: (b) => openEdit(b),
    onDelete: async (b) => {
      if (!window.confirm(`Hapus "${b.title}"?`)) return;
      await deleteBookmark(b.id);
      await render();
      toast('Item dihapus.');
    },
  };
}

async function render() {
  bookmarks = await listBookmarks();
  collections = await listCollections();

  const byId = new Map(collections.map((c) => [c.id, c.name]));
  const counts = new Map([['none', 0]]);
  for (const c of collections) counts.set(c.id, 0);
  for (const b of bookmarks) {
    if (b.collectionId == null) counts.set('none', counts.get('none') + 1);
    else counts.set(b.collectionId, (counts.get(b.collectionId) || 0) + 1);
  }

  els.total.textContent = `${bookmarks.length} tersimpan`;

  const rows = filterBookmarks(bookmarks, byId, state);

  els.grid.replaceChildren(...rows.map((b) => {
    const card = createCardEl(b, collectionName(b.collectionId), b.type === 'command' ? '' : sourceLabel(b.url), handlers());
    if (b.type === 'video') attachPreview(card, b);
    return card;
  }));

  els.empty.hidden = rows.length > 0;
  if (!rows.length) renderEmpty(bookmarks.length);

  renderCollectionFilter(els.collections, collections, counts, state.collection);
  renderChips();
}

function openAdd() {
  openBookmarkForm({
    mode: 'add',
    collections,
    bookmarks,
    onSave: async (b) => {
      await resolveNewCollection(b);
      await putBookmark(b);
      await render();
      toast('Item disimpan.');
    },
  });
}

function openEdit(b) {
  openBookmarkForm({
    mode: 'edit',
    initial: b,
    collections,
    bookmarks,
    onSave: async (next) => {
      await resolveNewCollection(next);
      await putBookmark(next);
      await render();
      toast('Perubahan disimpan.');
    },
  });
}

async function resolveNewCollection(b) {
  if (!b.newCollectionName) return;
  const name = b.newCollectionName;
  delete b.newCollectionName;
  let c = collections.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (!c) {
    c = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() };
    await putCollection(c);
    collections.push(c);
  }
  b.collectionId = c.id;
}

function downloadExport() {
  const now = new Date();
  const stamp = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  const data = { app: 'SimpanAja', version: 1, exportedAt: now.toISOString(), collections, bookmarks };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `simpanaja-backup-${stamp}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('Backup diunduh.');
}

async function importFile(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return toast('File bukan JSON yang valid. Import dibatalkan.');
  }
  if (!data || data.app !== 'SimpanAja' || data.version !== 1 || !Array.isArray(data.bookmarks) || !Array.isArray(data.collections)) {
    return toast('File backup tidak dikenali. Import dibatalkan.');
  }

  let added = 0, skipped = 0, newCollections = 0;
  const idMap = new Map();

  for (const c of data.collections) {
    let match = collections.find((x) => x.name.toLowerCase() === String(c.name).toLowerCase());
    if (!match) {
      match = { id: crypto.randomUUID(), name: String(c.name), createdAt: c.createdAt || new Date().toISOString() };
      collections.push(match);
      await putCollection(match);
      newCollections++;
    }
    idMap.set(c.id, match.id);
  }

  for (const raw of data.bookmarks) {
    const b = {
      id: raw.id, title: String(raw.title || ''), type: raw.type,
      url: raw.url ?? null, command: raw.command ?? null,
      collectionId: raw.collectionId ? (idMap.get(raw.collectionId) ?? null) : null,
      note: raw.note || '',
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    };
    if (findDuplicate(bookmarks, b)) { skipped++; continue; }
    if (bookmarks.some((x) => x.id === b.id)) b.id = crypto.randomUUID();
    bookmarks.push(b);
    await putBookmark(b);
    added++;
  }

  await render();
  toast(`Import selesai: ${added} ditambahkan, ${skipped} dilewati (duplikat), ${newCollections} Koleksi baru dibuat.`);
}

function wire() {
  document.getElementById('btnAdd').onclick = openAdd;
  els.search.oninput = () => { state.query = els.search.value; render(); };

  els.chips.onclick = (e) => {
    const chip = e.target.closest('[data-type]');
    if (!chip) return;
    state.type = chip.dataset.type;
    render();
  };

  els.collections.onclick = (e) => {
    const item = e.target.closest('[data-collection]');
    if (!item) return;
    state.collection = item.dataset.collection;
    render();
  };

  document.getElementById('btnExport').onclick = downloadExport;
  document.getElementById('btnImport').onclick = () => els.importFile.click();
  els.importFile.onchange = async () => {
    const f = els.importFile.files[0];
    els.importFile.value = '';
    if (f) await importFile(f);
  };

  document.getElementById('btnManageCollections').onclick = () => {
    const counts = new Map();
    for (const b of bookmarks) counts.set(b.collectionId ?? 'none', (counts.get(b.collectionId ?? 'none') || 0) + 1);
    openCollectionManager({
      collections, counts,
      onCreate: async (name) => { await putCollection({ id: crypto.randomUUID(), name, createdAt: new Date().toISOString() }); },
      onRename: async (id, name) => { const c = collections.find((x) => x.id === id); await putCollection({ ...c, name }); },
      onDelete: async (id) => { await deleteCollectionAndDetach(id); },
      onChange: () => render(),
    });
  };
}

wire();
render();
