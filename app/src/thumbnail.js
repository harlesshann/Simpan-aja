import { sourceLabel, youtubeVideoId } from './detect.js';

const CLOSED = ['tiktok.com', 'instagram.com', 'threads.com', 'threads.net'];

// Sumber gambar thumbnail per kartu. URL di sini adalah satu-satunya izin jaringan
// saat render (SPECS §6): YouTube asli + favicon Google, sisanya tile lokal.
export function thumbnailFor(bookmark) {
  if (bookmark.type === 'command') return { kind: 'local', label: 'Command' };

  const url = bookmark.url;
  const id = youtubeVideoId(url);
  if (id) return { kind: 'youtube', src: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };

  const host = (() => {
    try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
  })();

  if (!host) return { kind: 'local', label: sourceLabel(url) || 'Bookmark' };

  const closed = CLOSED.some((h) => host === h || host.endsWith('.' + h));
  if (closed) return { kind: 'local', label: sourceLabel(url) };

  return {
    kind: 'favicon',
    src: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`,
  };
}