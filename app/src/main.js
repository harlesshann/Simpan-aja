import { TYPES, TYPE_LABELS } from './constants.js';
import { sourceLabel } from './detect.js';
import { filterBookmarks } from './search.js';
import { createCardEl, renderCollectionFilter } from './render.js';
import { openBookmarkForm, openCollectionManager } from './form.js';
import { newId } from './id.js';
import { openPreview } from './preview.js';
import { openDetail } from './detail.js';
import {
  listBookmarks, listCollections, putBookmark, deleteBookmark, putCollection, deleteCollectionAndDetach,
} from './db.js';
import { buildExport, planImport } from './backup.js';
import { decodeAddPayload } from './codec.js';

/* ----------------------------------------------------------------
   State hidup di IndexedDB lewat db.js; export/import lewat backup.js.
---------------------------------------------------------------- */

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
    b.onclick = () => openAdd(); els.empty.append(b);
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
    onPreview: (b) => openPreview(b),
    onEdit: (b) => openEdit(b),
    onDelete: async (b) => {
      if (!window.confirm(`Hapus "${b.title || b.url || b.command}"?`)) return false;
      await deleteBookmark(b.id);
      await render();
      toast('Item dihapus.');
      return true;
    },
    onDetail: (b) => openDetail({
      bookmark: b,
      collectionName: collectionName(b.collectionId),
      sourceLabel: b.type === 'command' ? '' : sourceLabel(b.url),
      handlers: handlers(),
    }),
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

  els.grid.replaceChildren(...rows.map((b) => (
    createCardEl(b, collectionName(b.collectionId), b.type === 'command' ? '' : sourceLabel(b.url), handlers())
  )));

  els.empty.hidden = rows.length > 0;
  if (!rows.length) renderEmpty(bookmarks.length);

  renderCollectionFilter(els.collections, collections, counts, state.collection);
  renderChips();
}

function openAdd(initial = {}, error = '') {
  openBookmarkForm({
    mode: 'add',
    initial,
    error,
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
    c = { id: newId(), name, createdAt: new Date().toISOString() };
    await putCollection(c);
    collections.push(c);
  }
  b.collectionId = c.id;
}

async function downloadExport() {
  const { data, filename } = buildExport({ bookmarks, collections });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('Backup diunduh.');
}

async function importFile(file) {
  const plan = planImport(await file.text(), { bookmarks, collections });
  if (!plan.ok) return toast(`${plan.error} Import dibatalkan.`);

  for (const c of plan.addCollections) {
    collections.push(c);
    await putCollection(c);
  }
  for (const b of plan.addBookmarks) {
    bookmarks.push(b);
    await putBookmark(b);
  }
  await render();
  toast(`Import selesai: ${plan.addBookmarks.length} ditambahkan, ${plan.skippedDuplicates} dilewati (duplikat), ${plan.addCollections.length} Koleksi baru dibuat.`);
}

function wire() {
  document.getElementById('btnAdd').onclick = () => openAdd();
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
      onCreate: async (name) => { await putCollection({ id: newId(), name, createdAt: new Date().toISOString() }); },
      onRename: async (id, name) => { const c = collections.find((x) => x.id === id); await putCollection({ ...c, name }); },
      onDelete: async (id) => { await deleteCollectionAndDetach(id); },
      onChange: () => render(),
    });
  };
}

const ADD_ERRORS = {
  invalid: 'Link Muse tidak valid.',
  too_long: 'Link Muse lebih dari 2.000 karakter. Pakai Export/Import JSON.',
  bad_url: 'URL di link Muse tidak valid.',
  bad_type: 'Tipe di link Muse tidak dikenal.',
};

function handleAddFragment() {
  if (!location.hash.startsWith('#add=')) return;
  const raw = location.hash.slice(5);
  history.replaceState(null, '', location.pathname + location.search);

  const res = decodeAddPayload(raw);
  if (!res.ok) {
    openAdd({}, `${ADD_ERRORS[res.error] || ADD_ERRORS.invalid} Formulir dibuka kosong.`);
    return;
  }
  openAdd(res.value);
}

wire();
await render();
handleAddFragment();
