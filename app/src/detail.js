import { TYPE_LABELS } from './constants.js';
import { createThumbEl } from './render.js';

const el = (tag, props = {}, children = []) => {
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
};

const fmtDateTime = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const topBar = (handlers) => el('div', { class: 'detail-top' }, [
  el('button', {
    class: 'btn detail-back', type: 'button', text: '\u2190 Kembali',
    onclick: () => handlers.onBack && handlers.onBack(),
  }),
  el('span', { class: 'detail-top-label', text: 'Detail bookmark' }),
]);

// Halaman detail penuh (bukan modal), dirender ke #detailPage saat route #/item/<id>.
export function renderDetailPage(container, { bookmark: b, collectionName = '', sourceLabel = '', handlers = {} }) {
  const body = el('div', { class: 'detail-body' }, [
    el('div', { class: 'detail-thumb' }, [createThumbEl(b, sourceLabel)]),
    el('div', { class: 'detail-head' }, [
      el('h2', { class: 'detail-title', id: 'detailTitle', text: b.title || sourceLabel || '' }),
      el('span', { class: 'badge badge-' + b.type, text: TYPE_LABELS[b.type] || b.type }),
    ]),
  ]);

  const meta = [];
  if (sourceLabel) meta.push(sourceLabel);
  if (collectionName) meta.push(collectionName);
  if (meta.length) body.append(el('p', { class: 'detail-meta', text: meta.join(' \u00b7 ') }));

  if (b.type === 'command') {
    body.append(el('pre', { class: 'detail-command', text: b.command || '' }));
  } else if (b.url) {
    body.append(el('a', { class: 'detail-url', href: b.url, target: '_blank', rel: 'noopener', text: b.url }));
  }

  if (b.note) body.append(el('p', { class: 'detail-note', text: b.note }));
  body.append(el('p', { class: 'detail-date', text: 'Disimpan ' + fmtDateTime(b.createdAt) }));

  const actions = el('div', { class: 'detail-actions' });
  if (b.type === 'command') {
    actions.append(el('button', { class: 'btn btn-primary', type: 'button', text: 'Copy', onclick: () => handlers.onCopy && handlers.onCopy(b) }));
  } else {
    actions.append(el('a', { class: 'btn btn-primary', href: b.url, target: '_blank', rel: 'noopener', text: 'Buka' }));
    actions.append(el('button', { class: 'btn', type: 'button', text: 'Copy', onclick: () => handlers.onCopy && handlers.onCopy(b) }));
  }
  actions.append(el('button', {
    class: 'btn', type: 'button', text: 'Edit',
    onclick: () => handlers.onEdit && handlers.onEdit(b),
  }));
  actions.append(el('button', {
    class: 'btn btn-danger', type: 'button', text: 'Hapus',
    onclick: () => handlers.onDelete && handlers.onDelete(b),
  }));
  body.append(actions);

  container.replaceChildren(topBar(handlers), body);
  container.hidden = false;
}

export function renderDetailNotFound(container, handlers = {}) {
  container.replaceChildren(
    topBar(handlers),
    el('p', { class: 'detail-missing', text: 'Bookmark tidak ditemukan. Mungkin sudah dihapus.' }),
  );
  container.hidden = false;
}
