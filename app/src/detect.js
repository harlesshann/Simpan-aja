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

export function normalizeUrl(rawUrl) {
  if (!isValidHttpUrl(rawUrl)) return null;
  const u = new URL(rawUrl);
  const host = bareHost(u);
  const path = u.pathname.replace(/\/+$/, '');
  return `${u.protocol}//${host}${path}${u.search}${u.hash}`;
}
