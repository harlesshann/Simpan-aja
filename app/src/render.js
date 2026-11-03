import { TYPE_LABELS } from './constants.js';

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
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

// Review Focus 4: user text only ever reaches the DOM as textContent.
export function createCardEl(bookmark, collectionName, sourceLabel, handlers = {}) {
  const isCommand = bookmark.type === 'command';
  const link = bookmark.url || '';

  const head = el('div', { class: 'card-head' }, [
    el('h3', { class: 'card-title', text: bookmark.title }),
    el('span', { class: `badge badge-${bookmark.type}`, text: TYPE_LABELS[bookmark.type] || bookmark.type }),
  ]);

  const card = el('article', { class: 'card', 'data-id': bookmark.id }, [head]);

  if (!isCommand && link) {
    card.append(el('a', {
      class: 'card-source', href: link, target: '_blank', rel: 'noopener',
      text: sourceLabel,
    }));
  } else if (sourceLabel) {
    card.append(el('span', { class: 'card-source', text: sourceLabel }));
  }

  if (collectionName) card.append(el('span', { class: 'card-collection', text: collectionName }));

  if (isCommand) {
    card.append(el('pre', { class: 'card-command', text: bookmark.command || '' }));
  } else if (link) {
    card.append(el('div', { class: 'card-url', text: link }));
  }

  if (bookmark.note) card.append(el('p', { class: 'card-note', text: bookmark.note }));

  card.append(el('div', { class: 'card-date', text: 'Disimpan ' + fmtDate(bookmark.createdAt) }));

  const actions = el('div', { class: 'card-actions' });
  if (!isCommand && link) {
    actions.append(el('a', { class: 'btn btn-small', href: link, target: '_blank', rel: 'noopener', text: 'Buka' }));
  }
  actions.append(el('button', {
    class: 'btn btn-small', type: 'button', text: 'Copy',
    onclick: () => handlers.onCopy && handlers.onCopy(bookmark),
  }));
  if (bookmark.type === 'video') {
    actions.append(el('button', {
      class: 'btn btn-small', type: 'button', text: 'Preview',
      onclick: (e) => handlers.onPreview && handlers.onPreview(bookmark, e.currentTarget.closest('.card')),
    }));
  }
  actions.append(el('button', {
    class: 'btn btn-small', type: 'button', text: 'Edit',
    onclick: () => handlers.onEdit && handlers.onEdit(bookmark),
  }));
  actions.append(el('button', {
    class: 'btn btn-small btn-danger', type: 'button', text: 'Hapus',
    onclick: () => handlers.onDelete && handlers.onDelete(bookmark),
  }));
  card.append(actions);

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
