import { previewFor } from './embed.js';
import { sourceLabel } from './detect.js';

const popup = document.getElementById('previewPopup');

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

// Preview modal terpusat. Dipanggil dari dialog detail (kartu tidak punya hover lagi).
export function openPreview(bookmark) {
  closePreview();

  const p = previewFor(bookmark);
  const body = el('div', { class: 'preview-body' });

  const closeBtn = el('button', {
    class: 'preview-close', type: 'button', 'aria-label': 'Tutup preview',
    text: '\u00d7', onclick: closePreview,
  });

  if (p.kind === 'youtube' || p.kind === 'tiktok') {
    const frame = el('div', { class: 'preview-frame' });
    const iframe = el('iframe', {
      src: p.embedUrl, title: bookmark.title || 'Preview',
      allow: 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen',
      allowfullscreen: '', referrerpolicy: 'no-referrer',
    });
    frame.append(iframe);
    popup.append(frame);
    body.append(el('h3', { text: bookmark.title || sourceLabel(bookmark.url) || 'Preview' }));
    popup.append(body);
  } else if (p.kind === 'file') {
    const frame = el('div', { class: 'preview-frame' });
    frame.append(el('video', { src: p.embedUrl, controls: '', preload: 'metadata' }));
    popup.append(frame);
    body.append(el('h3', { text: bookmark.title || 'Preview' }));
    popup.append(body);
  } else {
    body.append(el('h3', { text: bookmark.title || sourceLabel(bookmark.url) || 'Preview' }));
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
  popup.classList.add('is-modal');
  popup.setAttribute('aria-modal', 'true');
  popup.hidden = false;

  document.addEventListener('keydown', onKey);
  setTimeout(() => document.addEventListener('click', onOutside), 0);
}

function onKey(e) { if (e.key === 'Escape') closePreview(); }
function onOutside(e) { if (!popup.contains(e.target)) closePreview(); }

export function closePreview() {
  if (popup.hidden) return;
  popup.replaceChildren(); // drops the iframe/video so playback stops
  popup.hidden = true;
  popup.classList.remove('is-modal');
  popup.setAttribute('aria-modal', 'false');
  document.removeEventListener('keydown', onKey);
  document.removeEventListener('click', onOutside);
}
