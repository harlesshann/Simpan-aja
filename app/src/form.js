import { TYPES, TYPE_LABELS, COLLECTION_COLORS, DEFAULT_COLLECTION_COLOR, safeCollectionColor } from './constants.js';
import { detectType, deriveTitle } from './detect.js';
import { findDuplicate } from './backup.js';
import { newId } from './id.js';
import { fetchImageBlob } from './fetchimage.js';

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
const fImage = document.getElementById('fImage');
const fImageUrl = document.getElementById('fImageUrl');
const btnFetchImage = document.getElementById('btnFetchImage');
const fImagePreview = document.getElementById('fImagePreview');
const fImageThumb = document.getElementById('fImageThumb');
const btnClearImage = document.getElementById('btnClearImage');
const urlRow = document.getElementById('urlRow');
const commandRow = document.getElementById('commandRow');
const newCollectionRow = document.getElementById('newCollectionRow');
const formError = document.getElementById('formError');

// Gambar kustom: file lokal -> canvas 16:9 -> data URL. Tidak ada unggahan jaringan.
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_TARGET_DATA = 400000;
const IMAGE_MAX_DATA = 500000;
const IMAGE_STEPS = [[1280, 0.82], [1280, 0.7], [960, 0.7]];

async function encodeImage(file, maxWidth, quality) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = objectUrl;
    await img.decode();
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    if (!srcW || !srcH) throw new Error('empty image');

    // Crop tengah ke 16:9 supaya hemat dan sesuai kartu.
    const aspect = 16 / 9;
    let cropW = srcW;
    let cropH = Math.round(srcW / aspect);
    if (cropH > srcH) {
      cropH = srcH;
      cropW = Math.round(srcH * aspect);
    }

    const outW = Math.min(maxWidth, cropW);
    const outH = Math.round(outW / aspect);
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      img,
      Math.round((srcW - cropW) / 2), Math.round((srcH - cropH) / 2), cropW, cropH,
      0, 0, outW, outH,
    );
    return canvas.toDataURL('image/webp', quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function processImageBlob(blob) {
  if (!IMAGE_TYPES.has(blob.type)) {
    throw new Error('Format gambar tidak didukung. Pakai PNG, JPG, WebP, atau GIF.');
  }
  if (blob.size > IMAGE_MAX_BYTES) {
    throw new Error('Gambar lebih dari 10 MB. Pilih file yang lebih kecil.');
  }
  let data = '';
  for (const [maxWidth, quality] of IMAGE_STEPS) {
    data = await encodeImage(blob, maxWidth, quality);
    if (data.length <= IMAGE_TARGET_DATA) return data;
  }
  if (data.length <= IMAGE_MAX_DATA) return data;
  throw new Error('Gambar terlalu besar setelah dikompres. Pilih gambar lain.');
}

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
export function openBookmarkForm({ mode = 'add', initial = {}, collections = [], bookmarks = [], error = '', onSave }) {
  fillTypeOptions();
  fillCollectionOptions(collections);
  showError(error);

  let typeTouched = mode === 'edit' || !!initial.type;
  const isCommand = initial.type === 'command';
  let image = typeof initial.image === 'string' ? initial.image : '';
  let processingImage = false;

  const drawImagePreview = () => {
    fImagePreview.hidden = !image;
    if (image) fImageThumb.src = image;
    else fImageThumb.removeAttribute('src');
  };

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

  drawImagePreview();
  fImage.value = '';
  fImageUrl.value = '';
  fImage.onchange = async () => {
    const file = fImage.files && fImage.files[0];
    if (!file) return;
    showError('');
    processingImage = true;
    try {
      image = await processImageBlob(file);
      drawImagePreview();
    } catch (err) {
      showError('Gagal memproses gambar: ' + (err && err.message ? err.message : 'kesalahan tak terduga'));
    } finally {
      processingImage = false;
      fImage.value = '';
    }
  };

  // Ambil thumbnail dari URL lewat Edge Function; hasilnya tetap data URL.
  btnFetchImage.onclick = async () => {
    const url = fImageUrl.value.trim();
    if (!url) return showError('Tempel URL gambar dulu.');
    showError('');
    processingImage = true;
    btnFetchImage.disabled = true;
    try {
      const blob = await fetchImageBlob(url);
      image = await processImageBlob(blob);
      drawImagePreview();
    } catch (err) {
      showError('Gagal mengambil gambar dari URL: ' + (err && err.message ? err.message : 'kesalahan tak terduga'));
    } finally {
      processingImage = false;
      btnFetchImage.disabled = false;
    }
  };

  btnClearImage.onclick = () => { image = ''; drawImagePreview(); fImage.value = ''; fImageUrl.value = ''; };

  document.getElementById('btnCancelForm').onclick = () => dialog.close();

  form.onsubmit = async (e) => {
    e.preventDefault();
    if (processingImage) return showError('Tunggu gambar selesai diproses.');
    const type = fType.value;
    const url = type === 'command' ? null : fUrl.value.trim();
    const command = type === 'command' ? fCommand.value : null;
    const note = fNote.value.trim();
    const rawTitle = fTitle.value.trim();

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
      ? { ...initial, title: rawTitle || deriveTitle({ type, url, command }), type, url, command, note, image: image || null, id: initial.id, createdAt: initial.createdAt, updatedAt: now }
      : { id: newId(), title: rawTitle || deriveTitle({ type, url, command }), type, url, command, note, image: image || null, createdAt: now, updatedAt: now };

    if (collectionId) bookmark.collectionId = collectionId;
    else if (fCollection.value === '__new__') bookmark.collectionId = null;
    else bookmark.collectionId = null;
    if (newCollectionName) bookmark.newCollectionName = newCollectionName;

    const dup = findDuplicate(bookmarks, bookmark, mode === 'edit' ? initial.id : undefined);
    if (dup) {
      const ok = window.confirm(`Sudah ada item dengan alamat/command sama: "${dup.title || dup.url || dup.command}". Tetap simpan?`);
      if (!ok) return;
    }

    try {
      await onSave(bookmark);
      dialog.close();
    } catch (err) {
      showError('Gagal menyimpan: ' + (err && err.message ? err.message : 'kesalahan tak terduga'));
    }
  };

  dialog.showModal();
  fTitle.focus();
}

// Kelola Koleksi (Task 9). Store mutations are injected so db.js stays swappable.

// Deretan swatch warna. Nilai tetap dari palet (bukan teks pengguna).
function colorPicker(initial, onPick) {
  let selected = safeCollectionColor(initial);
  const btns = COLLECTION_COLORS.map((color) => el('button', {
    class: 'color-swatch', type: 'button', 'data-color': color,
    'aria-label': 'Warna ' + color, title: color,
    'aria-pressed': String(color === selected), style: '--sw:' + color,
    onclick: () => {
      selected = color;
      for (const b of btns) b.setAttribute('aria-pressed', String(b.dataset.color === selected));
      onPick(color);
    },
  }));
  const wrap = el('div', { class: 'color-picker', role: 'group', 'aria-label': 'Warna Koleksi' }, btns);
  return { el: wrap, get value() { return selected; } };
}

export function openCollectionManager({ collections, counts, onCreate, onRename, onColorChange, onDelete, onChange }) {
  const dlg = document.getElementById('collectionsDialog');
  const list = document.getElementById('collectionManagerList');
  const nameInput = document.getElementById('newCollectionName');
  const newColorHost = document.getElementById('newCollectionColor');
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
      const picker = colorPicker(c.color, (color) => {
        onColorChange && onColorChange(c.id, color);
        onChange();
        draw();
      });
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
        picker.el,
      ]));
    }
  }

  const newPicker = colorPicker(DEFAULT_COLLECTION_COLOR, () => {});
  newColorHost.replaceChildren(newPicker.el);

  document.getElementById('btnCreateCollection').onclick = () => {
    const name = nameInput.value.trim();
    if (!name) return showErr('Nama Koleksi wajib diisi.');
    if (nameTaken(name)) return showErr('Nama Koleksi sudah dipakai.');
    showErr('');
    nameInput.value = '';
    onCreate(name, newPicker.value);
    onChange();
  };

  document.getElementById('btnCloseCollections').onclick = () => dlg.close();

  showErr('');
  nameInput.value = '';
  draw();
  dlg.showModal();
}
