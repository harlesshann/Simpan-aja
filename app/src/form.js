import { TYPES, TYPE_LABELS } from './constants.js';
import { detectType } from './detect.js';
import { findDuplicate } from './dupes.js';

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) node.append(c);
  return node;
}

const dialog = document.getElementById('bookmarkDialog');
const form = document.getElementById('bookmarkForm');
const fType = document.getElementById('fType');
const fUrl = document.getElementById('fUrl');
const fCommand = document.getElementById('fCommand');
const fTitle = document.getElementById('fTitle');
const fNote = document.getElementById('fNote');
const fCollection = document.getElementById('fCollection');
const fNewCollection = document.getElementById('fNewCollection');
const urlRow = document.getElementById('urlRow');
const commandRow = document.getElementById('commandRow');
const newCollectionRow = document.getElementById('newCollectionRow');
const formError = document.getElementById('formError');

function fillTypeOptions() {
  fType.replaceChildren(...TYPES.map((t) => el('option', { value: t, text: TYPE_LABELS[t] })));
}

function fillCollectionOptions(collections) {
  const opts = [
    el('option', { value: '', text: 'Belum Dikoleksi' }),
    ...collections.map((c) => el('option', { value: c.id, text: c.name })),
    el('option', { value: '__new__', text: '+ Koleksi baru...' }),
  ];
  fCollection.replaceChildren(...opts);
}

function syncTypeRows() {
  const isCommand = fType.value === 'command';
  commandRow.hidden = !isCommand;
  urlRow.hidden = isCommand;
}

function showError(msg) {
  formError.textContent = msg;
  formError.hidden = !msg;
}

// mode: 'add' | 'edit'. `initial` may come from a decoded Muse payload (Task 11).
export function openBookmarkForm({ mode = 'add', initial = {}, collections = [], bookmarks = [], onSave }) {
  fillTypeOptions();
  fillCollectionOptions(collections);
  showError('');

  let typeTouched = mode === 'edit' || !!initial.type;
  const isCommand = initial.type === 'command';

  fType.value = initial.type || 'website';
  fTitle.value = initial.title || '';
  fNote.value = initial.note || '';
  fUrl.value = isCommand ? '' : (initial.url || '');
  fCommand.value = isCommand ? (initial.command || '') : '';

  // Map a suggested collection name onto an existing one, else offer to create it.
  const wanted = (initial.collection || '').trim();
  const existing = collections.find((c) => c.name.toLowerCase() === wanted.toLowerCase());
  if (existing) {
    fCollection.value = existing.id;
    fNewCollection.value = '';
  } else if (wanted) {
    fCollection.value = '__new__';
    fNewCollection.value = wanted;
  } else if (initial.collectionId) {
    fCollection.value = initial.collectionId;
  } else {
    fCollection.value = '';
  }
  fNewCollection.value = fCollection.value === '__new__' ? (fNewCollection.value || wanted) : '';

  syncTypeRows();
  newCollectionRow.hidden = fCollection.value !== '__new__';

  fType.onchange = () => { typeTouched = true; syncTypeRows(); };

  fUrl.oninput = () => {
    if (typeTouched) return;
    const guess = detectType(fUrl.value.trim());
    if (guess) { fType.value = guess; syncTypeRows(); }
  };

  fCollection.onchange = () => { newCollectionRow.hidden = fCollection.value !== '__new__'; };

  document.getElementById('btnCancelForm').onclick = () => dialog.close();

  form.onsubmit = (e) => {
    e.preventDefault();
    const type = fType.value;
    const title = fTitle.value.trim();
    const url = type === 'command' ? null : fUrl.value.trim();
    const command = type === 'command' ? fCommand.value : null;
    const note = fNote.value.trim();

    if (!title) return showError('Judul wajib diisi.');
    if (type === 'command') {
      if (!command || !command.trim()) return showError('Command wajib diisi.');
    } else {
      if (!url) return showError('URL wajib diisi.');
      if (!/^https?:\/\//i.test(url) || !detectType(url)) {
        return showError('URL harus diawali http:// atau https://.');
      }
    }

    let newCollectionName = null;
    let collectionId = null;
    if (fCollection.value === '__new__') {
      newCollectionName = fNewCollection.value.trim();
      if (!newCollectionName) return showError('Nama Koleksi baru wajib diisi.');
    } else {
      collectionId = fCollection.value || null;
    }

    const now = new Date().toISOString();
    const bookmark = mode === 'edit'
      ? { ...initial, title, type, url, command, note, id: initial.id, createdAt: initial.createdAt, updatedAt: now }
      : { id: crypto.randomUUID(), title, type, url, command, note, createdAt: now, updatedAt: now };

    if (collectionId) bookmark.collectionId = collectionId;
    else if (fCollection.value === '__new__') bookmark.collectionId = null;
    else bookmark.collectionId = null;
    if (newCollectionName) bookmark.newCollectionName = newCollectionName;

    const dup = findDuplicate(bookmarks, bookmark, mode === 'edit' ? initial.id : undefined);
    if (dup) {
      const ok = window.confirm(`Sudah ada item dengan alamat/command sama: "${dup.title}". Tetap simpan?`);
      if (!ok) return;
    }

    onSave(bookmark);
    dialog.close();
  };

  dialog.showModal();
  fTitle.focus();
}

// Kelola Koleksi (Task 9). Store mutations are injected so db.js stays swappable.
export function openCollectionManager({ collections, counts, onCreate, onRename, onDelete, onChange }) {
  const dlg = document.getElementById('collectionsDialog');
  const list = document.getElementById('collectionManagerList');
  const nameInput = document.getElementById('newCollectionName');
  const err = document.getElementById('collectionError');
  const showErr = (m) => { err.textContent = m; err.hidden = !m; };

  const nameTaken = (name, ignoreId) =>
    collections.some((c) => c.id !== ignoreId && c.name.toLowerCase() === name.toLowerCase());

  function draw() {
    list.replaceChildren();
    if (!collections.length) {
      list.append(el('p', { class: 'manage-empty', text: 'Belum ada Koleksi.' }));
      return;
    }
    for (const c of collections) {
      const input = el('input', { type: 'text', value: c.name, 'aria-label': 'Nama Koleksi', maxlength: '80' });
      input.onchange = () => {
        const name = input.value.trim();
        if (!name) { input.value = c.name; return; }
        if (nameTaken(name, c.id)) { showErr('Nama Koleksi sudah dipakai.'); input.value = c.name; return; }
        showErr('');
        onRename(c.id, name);
        onChange();
        draw();
      };
      list.append(el('div', { class: 'manage-row' }, [
        input,
        el('span', { class: 'count', text: `${counts?.get(c.id) || 0} item` }),
        el('button', {
          class: 'btn btn-small btn-danger', type: 'button', text: 'Hapus',
          onclick: () => {
            const n = counts?.get(c.id) || 0;
            if (!window.confirm(`Hapus Koleksi "${c.name}"? ${n} item di dalamnya tetap ada dan pindah ke Belum Dikoleksi.`)) return;
            onDelete(c.id);
            onChange();
            draw();
          },
        }),
      ]));
    }
  }

  document.getElementById('btnCreateCollection').onclick = () => {
    const name = nameInput.value.trim();
    if (!name) return showErr('Nama Koleksi wajib diisi.');
    if (nameTaken(name)) return showErr('Nama Koleksi sudah dipakai.');
    showErr('');
    nameInput.value = '';
    onCreate(name);
    onChange();
  };

  document.getElementById('btnCloseCollections').onclick = () => dlg.close();

  showErr('');
  nameInput.value = '';
  draw();
  dlg.showModal();
}
