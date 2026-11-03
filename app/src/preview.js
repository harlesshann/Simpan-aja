import { previewFor } from './embed.js';
import { sourceLabel } from './detect.js';

const popup = document.getElementById('previewPopup');
let current = null;

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

const finePointer = () => window.matchMedia('(pointer: fine)').matches;

// Debounced hover, desktop only.
export function attachPreview(cardEl, bookmark) {
  if (!finePointer()) return;
  let timer = null;
  cardEl.addEventListener('mouseenter', () => {
    timer = setTimeout(() => openPreview(bookmark, cardEl), 400);
  });
  cardEl.addEventListener('mouseleave', () => {
    clearTimeout(timer);
    timer = null;
  });
}

export function openPreview(bookmark, anchorEl) {
  closePreview();
  current = bookmark;

  const p = previewFor(bookmark);
  const body = el('div', { class: 'preview-body' });

  const closeBtn = el('button', {
    class: 'preview-close', type: 'button', 'aria-label': 'Tutup preview',
    text: '\u00d7', onclick: closePreview,
  });

  const isModal = !finePointer() || !anchorEl;
  if (p.kind === 'youtube' || p.kind === 'tiktok') {
    const frame = el('div', { class: 'preview-frame' });
    const iframe = el('iframe', {
      src: p.embedUrl, title: bookmark.title,
      allow: 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen',
      allowfullscreen: '', referrerpolicy: 'no-referrer',
    });
    frame.append(iframe);
    popup.append(frame);
    body.append(el('h3', { text: bookmark.title }));
    popup.append(body);
  } else if (p.kind === 'file') {
    const frame = el('div', { class: 'preview-frame' });
    frame.append(el('video', { src: p.embedUrl, controls: '', preload: 'metadata' }));
    popup.append(frame);
    body.append(el('h3', { text: bookmark.title }));
    popup.append(body);
  } else {
    body.append(el('h3', { text: bookmark.title }));
    body.append(el('p', { class: 'card-source', text: sourceLabel(bookmark.url) || 'Sumber video' }));
    if (bookmark.note) body.append(el('p', { class: 'card-note', text: bookmark.note }));
    body.append(el('p', { class: 'card-source', text: 'Platform ini tidak mengizinkan pemutaran di dalam preview.' }));
    body.append(el('a', {
      class: 'btn btn-primary', href: bookmark.url, target: '_blank', rel: 'noopener',
      text: 'Tonton di Sumbernya',
    }));
    popup.append(body);
  }

  popup.append(closeBtn);
  popup.classList.toggle('is-modal', isModal);
  popup.hidden = false;

  if (!isModal) positionNear(anchorEl);

  document.addEventListener('keydown', onKey);
  setTimeout(() => document.addEventListener('click', onOutside), 0);
}

function positionNear(anchorEl) {
  const r = anchorEl.getBoundingClientRect();
  const w = popup.offsetWidth;
  const h = popup.offsetHeight;
  const gap = 8;
  let top = r.bottom + gap;
  if (top + h > innerHeight - 12) top = Math.max(12, r.top - h - gap);
  let left = Math.min(Math.max(12, r.left), innerWidth - w - 12);
  popup.style.top = top + 'px';
  popup.style.left = left + 'px';
}

function onKey(e) { if (e.key === 'Escape') closePreview(); }
function onOutside(e) { if (!popup.contains(e.target)) closePreview(); }

export function closePreview() {
  if (popup.hidden) return;
  popup.replaceChildren(); // drops the iframe/video so playback stops
  popup.hidden = true;
  popup.classList.remove('is-modal');
  popup.style.top = '';
  popup.style.left = '';
  current = null;
  document.removeEventListener('keydown', onKey);
  document.removeEventListener('click', onOutside);
}
