function youtubeId(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    if (u.pathname === '/watch') return u.searchParams.get('v');
    if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || null;
    if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || null;
  }
  return null;
}

function tiktokId(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (!(host === 'tiktok.com' || host.endsWith('.tiktok.com'))) return null;
  const m = u.pathname.match(/\/video\/(\d+)/);
  return m ? m[1] : null;
}

export function previewFor(bookmark) {
  if (!bookmark || bookmark.type !== 'video' || !bookmark.url) return { kind: 'none' };
  const url = bookmark.url;

  const yt = youtubeId(url);
  if (yt) return { kind: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${yt}` };

  if (/\.(mp4|webm)(\?|#|$)/i.test(url)) return { kind: 'file', embedUrl: url };

  const tt = tiktokId(url);
  if (tt) return { kind: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${tt}` };

  return { kind: 'fallback' };
}
