// Poster lokal untuk platform yang menutup thumbnail/embed (TikTok, Instagram,
// Threads). Dibuat murni dari URL + judul: SVG deterministik, tanpa jaringan,
// tanpa input pengguna. Bukan tangkapan layar halaman asli — kontennya tak bisa
// diambil browser (CORS, login wall, X-Frame-Options).

const W = 640;
const H = 360;

const THEMES = {
  TikTok: {
    bg1: '#0b0b10', bg2: '#1d1d27',
    shadow: ['#00f2ea', -4, 0], shadow2: ['#ff0050', 4, 0],
    ink: '#ffffff',
  },
  Instagram: {
    bg1: '#833ab4', bg2: '#fd1d1d',
    shadow: ['#fcb045', 4, 3], shadow2: ['#405de6', -4, -3],
    ink: '#ffffff',
  },
  Threads: {
    bg1: '#0a0a0a', bg2: '#262626',
    shadow: null, shadow2: null,
    ink: '#ffffff',
  },
};

const FALLBACK = {
  bg1: '#141414', bg2: '#2b2b2b',
  shadow: ['#ffde00', 3, 3], shadow2: null,
  ink: '#ffffff',
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
}

// Bungkus judul ke maksimal `maxLines` baris; baris terakhir dipotong dengan elipsis.
function wrapTitle(text, maxChars, maxLines) {
  const words = String(text).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (next.length <= maxChars) { cur = next; continue; }
    if (cur) { lines.push(cur); cur = w; }
    else { lines.push(w.slice(0, maxChars)); cur = w.slice(maxChars); }
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines) {
    const joined = lines.join(' ') + ' ' + cur;
    if (joined.trim().length > lines.join(' ').length) {
      const last = lines[maxLines - 1];
      lines[maxLines - 1] = (last.length > maxChars - 1 ? last.slice(0, maxChars - 1) : last) + '…';
    }
  }
  return lines;
}

export function posterSvg(bookmark = {}, platform = '') {
  const theme = THEMES[platform] || FALLBACK;
  const host = hostOf(bookmark.url) || String(platform).toLowerCase() || 'bookmark';
  const wordmark = platform || 'Bookmark';
  const markSize = wordmark.length > 12 ? 42 : wordmark.length > 9 ? 54 : 68;
  const titleLines = wrapTitle(bookmark.title || host, 40, 3);
  const titleSize = titleLines.length === 1 && (bookmark.title || '').length < 22 ? 28 : 23;
  const lastBaseline = 330;
  const firstBaseline = lastBaseline - (titleLines.length - 1) * 30;

  const shadow1 = theme.shadow
    ? `<text x="320" y="188" text-anchor="middle" font-size="${markSize}" font-weight="800" letter-spacing="-1" fill="${esc(theme.shadow[0])}" opacity=".95">${esc(wordmark)}</text>`
    : '';
  const shadow2 = theme.shadow2
    ? `<text x="320" y="188" text-anchor="middle" font-size="${markSize}" font-weight="800" letter-spacing="-1" fill="${esc(theme.shadow2[0])}" opacity=".95">${esc(wordmark)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(bookmark.title || wordmark)}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${esc(theme.bg1)}"/>
    <stop offset="1" stop-color="${esc(theme.bg2)}"/>
  </linearGradient>
  <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity=".78"/>
  </linearGradient>
  <pattern id="lines" width="18" height="18" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
    <line x1="0" y1="0" x2="0" y2="18" stroke="#ffffff" stroke-opacity=".05" stroke-width="2"/>
  </pattern>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#lines)"/>
<rect width="${W}" height="42" fill="#000000" fill-opacity=".28"/>
<circle cx="22" cy="21" r="5" fill="#ff5f57"/>
<circle cx="40" cy="21" r="5" fill="#febc2e"/>
<circle cx="58" cy="21" r="5" fill="#28c840"/>
<rect x="76" y="9" width="360" height="24" fill="#ffffff" fill-opacity=".08"/>
<text x="90" y="26" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="13" fill="#ffffff" fill-opacity=".78">${esc(host)}</text>
${shadow1}
${shadow2}
<text x="320" y="188" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="${markSize}" font-weight="800" letter-spacing="-1" fill="${esc(theme.ink)}">${esc(wordmark)}</text>
<rect x="0" y="236" width="${W}" height="124" fill="url(#scrim)"/>
${titleLines.map((line, i) => `<text class="title" x="32" y="${firstBaseline + i * 30}" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="${titleSize}" font-weight="600" fill="#ffffff">${esc(line)}</text>`).join('\n')}
</svg>`;
}

export function posterDataUrl(bookmark, platform) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(posterSvg(bookmark, platform));
}
