const HOST_TYPE = [
  ['github.com', 'repo'],
  ['youtube.com', 'video'],
  ['youtu.be', 'video'],
  ['tiktok.com', 'video'],
  ['instagram.com', 'video'],
  ['threads.com', 'video'],
  ['threads.net', 'video'],
  ['chromewebstore.google.com', 'extension'],
  ['addons.mozilla.org', 'extension'],
];

const HOST_LABEL = [
  ['github.com', 'GitHub'],
  ['youtube.com', 'YouTube'],
  ['youtu.be', 'YouTube'],
  ['tiktok.com', 'TikTok'],
  ['instagram.com', 'Instagram'],
  ['threads.com', 'Threads'],
  ['threads.net', 'Threads'],
  ['chromewebstore.google.com', 'Chrome Web Store'],
  ['addons.mozilla.org', 'Firefox Add-ons'],
];

export function isValidHttpUrl(raw) {
  if (typeof raw !== 'string') return false;
  let u;
  try { u = new URL(raw); } catch { return false; }
  return u.protocol === 'http:' || u.protocol === 'https:';
}

function bareHost(url) {
  return url.hostname.toLowerCase().replace(/^www\./, '');
}

function hostMatches(host, base) {
  return host === base || host.endsWith('.' + base);
}

export function detectType(rawUrl) {
  if (!isValidHttpUrl(rawUrl)) return null;
  const u = new URL(rawUrl);
  const host = bareHost(u);
  if (hostMatches(host, 'chrome.google.com') && u.pathname.startsWith('/webstore')) return 'extension';
  for (const [h, t] of HOST_TYPE) if (hostMatches(host, h)) return t;
  return 'website';
}

export function sourceLabel(rawUrl) {
  if (!isValidHttpUrl(rawUrl)) return '';
  const host = bareHost(new URL(rawUrl));
  for (const [h, label] of HOST_LABEL) if (hostMatches(host, h)) return label;
  return host;
}

const LOCALE_SEG = /^(en|en-us|en-gb|id|id-id|in|de|fr|es|ja|ko|pt|pt-br|ru|zh)$/i;
const HASHY_SEG = /^[0-9a-f]{8,}$/i;

const humanizeSeg = (seg) => seg
  .replace(/[-_+]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase());

function youtubeId(u) {
  if (hostMatches(bareHost(u), 'youtu.be')) return u.pathname.replace(/^\/+/, '').split('/')[0] || '';
  if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || '';
  return u.searchParams.get('v') || '';
}

// Judul otomatis, murni dari URL/teks command — tidak pernah mengambil dari jaringan (SPECS §4).
export function deriveTitle({ type, url, command } = {}) {
  if (type === 'command') {
    const firstLine = String(command || '').split(/\r?\n/)[0].trim().replace(/\s+/g, ' ');
    return firstLine.slice(0, 60);
  }
  if (!isValidHttpUrl(url)) return '';
  const u = new URL(url);
  const host = bareHost(u);

  if (hostMatches(host, 'youtube.com') || hostMatches(host, 'youtu.be')) {
    return `YouTube — ${youtubeId(u) || host}`;
  }
  for (const [h, label] of HOST_LABEL) {
    if (h === 'chromewebstore.google.com' && hostMatches(host, h)) return 'Chrome Web Store';
    if (h === 'addons.mozilla.org' && hostMatches(host, h)) return 'Firefox Add-ons';
  }
  if (hostMatches(host, 'github.com')) {
    const [owner, repo] = u.pathname.replace(/^\/+|\/+$/g, '').split('/');
    if (owner && repo) return `${owner}/${repo}`;
  }

  const words = u.pathname.split('/')
    .filter(Boolean)
    .filter((s) => s.length > 1 && !/^\d+$/.test(s) && !LOCALE_SEG.test(s) && !HASHY_SEG.test(s))
    .slice(-3)
    .map(humanizeSeg)
    .filter(Boolean);
  return words.length ? words.join(' ') : host;
}

export function normalizeUrl(rawUrl) {
  if (!isValidHttpUrl(rawUrl)) return null;
  const u = new URL(rawUrl);
  const host = bareHost(u);
  const path = u.pathname.replace(/\/+$/, '');
  return `${u.protocol}//${host}${path}${u.search}${u.hash}`;
}
