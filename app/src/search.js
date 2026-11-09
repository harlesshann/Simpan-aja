export function filterBookmarks(bookmarks, collectionsById, opts = {}) {
  const { query = '', type = 'all', collection = 'all', sort = 'new' } = opts;
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const dir = sort === 'old' ? 1 : -1;

  return bookmarks
    .filter((b) => {
      if (type !== 'all' && b.type !== type) return false;
      if (collection === 'none' && b.collectionId !== null) return false;
      if (collection !== 'all' && collection !== 'none' && b.collectionId !== collection) return false;
      if (words.length) {
        const name = b.collectionId != null ? (collectionsById.get(b.collectionId) || '') : '';
        const hay = [b.title, b.note, b.url, b.command, name]
          .filter(Boolean).join(' ').toLowerCase();
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    })
    .sort((a, b) => dir * (
      a.createdAt.localeCompare(b.createdAt) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)));
}
