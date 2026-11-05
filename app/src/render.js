import { TYPE_LABELS } from './constants.js';
import { thumbnailFor } from './thumbnail.js';

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

const fmtDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

function localTile(label, type) {
  return el('div', {
    class: 'thumb-tile tile-' + type, role: 'img', 'aria-label': label || 'Bookmark',
  }, [el('span', { text: (label || '?').slice(0, 2).toUpperCase() })]);
}

// Review Focus 4: label/data pengguna hanya lewat textContent.
export function createThumbEl(bookmark, sourceLabelText) {
  const t = thumbnailFor(bookmark);
  const wrap = el('div', { class: 'card-thumb thumb-' + t.kind });
  if (t.kind === 'local') {
    wrap.append(localTile(t.label, bookmark.type));
  } else {
    const img = el('img', {
      class: 'card-thumb-img', src: t.src, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer',
    });
    img.onerror = () => wrap.replaceChildren(localTile(t.kind === 'youtube' ? 'YouTube' : t.label, bookmark.type));
    wrap.append(img);
  }
  return wrap;
}

// Kartu ringkas: thumbnail + lencana + judul + meta. Klik kartu membuka detail.
export function createCardEl(bookmark, collectionName, sourceLabelText, handlers = {}) {
  const isCommand = bookmark.type === 'command';
  const link = bookmark.url || '';
  const open = () => handlers.onDetail && handlers.onDetail(bookmark);

  const head = el('div', { class: 'card-head' }, [
    el('h3', { class: 'card-title', text: bookmark.title || sourceLabelText || '' }),
    el('span', { class: 'badge badge-' + bookmark.type, text: TYPE_LABELS[bookmark.type] || bookmark.type }),
  ]);

  const card = el('article', {
    class: 'card', 'data-id': bookmark.id, tabindex: '0', role: 'button',
    'aria-label': 'Lihat detail ' + (bookmark.title || link || 'bookmark'),
  }, [createThumbEl(bookmark, sourceLabelText), head]);

  const meta = [];
  if (sourceLabelText) meta.push(sourceLabelText);
  if (collectionName) meta.push(collectionName);
  if (meta.length) card.append(el('p', { class: 'card-meta', text: meta.join(' · ') }));

  if (isCommand && bookmark.command) {
    card.append(el('pre', { class: 'card-command', text: bookmark.command }));
  }

  card.append(el('div', { class: 'card-date', text: 'Disimpan ' + fmtDate(bookmark.createdAt) }));

  card.addEventListener('click', open);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });

  return card;
}

export function renderCollectionFilter(container, collections, counts, selected) {
  container.replaceChildren();
  let total = 0;
  for (const c of collections) total += counts.get(c.id) || 0;
  total += counts.get('none') || 0;

  const rows = [
    { key: 'all', name: 'Semua Koleksi', count: total },
    { key: 'none', name: 'Belum Dikoleksi', count: counts.get('none') || 0 },
    ...collections.map((c) => ({ key: c.id, name: c.name, count: counts.get(c.id) || 0 })),
  ];

  for (const r of rows) {
    container.append(el('button', {
      class: 'collection-item', type: 'button',
      'data-collection': r.key, 'aria-current': String(selected === r.key),
    }, [
      el('span', { text: r.name }),
      el('span', { class: 'count', text: String(r.count) }),
    ]));
  }
}
