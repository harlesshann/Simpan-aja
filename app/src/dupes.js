// ponytail: duplicate rules live here only until backup.js (Task 5) owns them.
import { normalizeUrl } from './detect.js';

export function duplicateKey(b) {
  if (b.type === 'command') return 'cmd:' + b.title.trim().toLowerCase() + '|' + b.command;
  return 'url:' + normalizeUrl(b.url);
}

export function findDuplicate(bookmarks, candidate, ignoreId) {
  const key = duplicateKey(candidate);
  return bookmarks.find((b) => b.id !== ignoreId && duplicateKey(b) === key);
}
