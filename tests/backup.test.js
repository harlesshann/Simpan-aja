import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExport, planImport, duplicateKey } from '../app/src/backup.js';

const state = {
  collections: [{ id: 'c1', name: 'Motion Design', createdAt: '2026-10-01T00:00:00.000Z' }],
  bookmarks: [{
    id: 'b1', title: 'Video Remotion', type: 'video',
    url: 'https://youtu.be/x1', command: null, collectionId: 'c1',
    note: 'teknik easing', createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z',
  }],
};

let n = 0;
const idGen = () => 'gen-' + (++n);

test('buildExport: nama file & format', () => {
  const { data, filename } = buildExport(state, new Date(2026, 10, 3, 9, 30));
  assert.equal(filename, 'simpanaja-backup-2026-11-03.json');
  assert.equal(data.app, 'SimpanAja');
  assert.equal(data.version, 1);
  assert.equal(data.collections.length, 1);
});

test('planImport menolak file rusak/salah aplikasi utuh', () => {
  assert.equal(planImport('{bukan json', { bookmarks: [], collections: [] }, idGen).ok, false);
  const bad = JSON.stringify({ app: 'Lain', version: 1, collections: [], bookmarks: [] });
  assert.equal(planImport(bad, { bookmarks: [], collections: [] }, idGen).ok, false);
});

test('restore ke kosong mempertahankan id & createdAt', () => {
  const { data } = buildExport(state, new Date());
  const r = planImport(JSON.stringify(data), { bookmarks: [], collections: [] }, idGen);
  assert.equal(r.ok, true);
  assert.equal(r.addBookmarks[0].id, 'b1');
  assert.equal(r.addBookmarks[0].createdAt, '2026-11-01T00:00:00.000Z');
  assert.equal(r.addCollections.length, 1);
});

test('import kedua kali: semua duplikat dilewati', () => {
  const text = JSON.stringify(buildExport(state, new Date()).data);
  const r1 = planImport(text, { bookmarks: [], collections: [] }, idGen);
  const existing = { bookmarks: r1.addBookmarks, collections: r1.addCollections };
  const r2 = planImport(text, existing, idGen);
  assert.equal(r2.ok, true);
  assert.equal(r2.addBookmarks.length, 0);
  assert.equal(r2.skippedDuplicates, 1);
});

test('tabrakan id beda item: id baru, timestamp tetap', () => {
  const { data } = buildExport(state, new Date());
  const existing = {
    collections: [],
    bookmarks: [{ id: 'b1', title: 'Lain', type: 'website', url: 'https://other.com', command: null, collectionId: null, note: '', createdAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z' }],
  };
  const r = planImport(JSON.stringify(data), existing, idGen);
  const added = r.addBookmarks[0];
  assert.notEqual(added.id, 'b1');
  assert.equal(added.createdAt, '2026-11-01T00:00:00.000Z');
});

test('Koleksi dicocokkan per nama tak peka huruf', () => {
  const { data } = buildExport(state, new Date());
  const existing = { bookmarks: [], collections: [{ id: 'cx', name: 'motion design', createdAt: '2020-01-01T00:00:00.000Z' }] };
  const r = planImport(JSON.stringify(data), existing, idGen);
  assert.equal(r.addCollections.length, 0);
  assert.equal(r.addBookmarks[0].collectionId, 'cx');
});

test('duplicateKey: url dinormalisasi', () => {
  assert.equal(
    duplicateKey({ type: 'website', url: 'HTTPS://WWW.GitHub.com/a/b/' }),
    duplicateKey({ type: 'website', url: 'https://github.com/a/b' }),
  );
});

test('duplicateKey: command tidak bergantung judul', () => {
  assert.equal(
    duplicateKey({ type: 'command', title: 'A', command: 'ls -la' }),
    duplicateKey({ type: 'command', title: 'B', command: 'ls -la' }),
  );
});

test('import tanpa judul menurunkan judul dari URL', () => {
  const text = JSON.stringify({
    app: 'SimpanAja', version: 1, exportedAt: '2026-11-05T00:00:00.000Z',
    collections: [],
    bookmarks: [{
      id: 'bx', title: '', type: 'repo', url: 'https://github.com/owner/repo',
      command: null, collectionId: null, note: '',
      createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z',
    }],
  });
  const r = planImport(text, { bookmarks: [], collections: [] }, idGen);
  assert.equal(r.ok, true);
  assert.equal(r.addBookmarks[0].title, 'owner/repo');
});
