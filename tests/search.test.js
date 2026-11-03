import test from 'node:test';
import assert from 'node:assert/strict';
import { filterBookmarks } from '../app/src/search.js';

const cmap = new Map([
  ['col-motion', 'Motion Design'],
]);

const bs = [
  { id: 'vid1', title: 'Render', type: 'video', url: 'https://youtu.be/1', command: null, collectionId: 'col-motion', note: 'teknik', createdAt: '2026-01-02T00:00:00.000Z' },
  { id: 'cmd1', title: 'Konversi audio', type: 'command', url: null, command: 'ffmpeg -i in.mp4 out.mp3', collectionId: null, note: '', createdAt: '2026-01-03T00:00:00.000Z' },
  { id: 'paling-lama', title: 'Lama', type: 'website', url: 'https://a.com', command: null, collectionId: null, note: '', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'paling-baru', title: 'Baru', type: 'website', url: 'https://b.com', command: null, collectionId: null, note: '', createdAt: '2026-01-04T00:00:00.000Z' },
];

const ids = (rows) => rows.map((b) => b.id);

test('search menemukan isi command, bukan hanya judul', () => {
  assert.deepEqual(ids(filterBookmarks(bs, cmap, { query: 'ffmpeg' })), ['cmd1']);
});

test('multi-kata AND lintas field: judul + nama Koleksi', () => {
  assert.deepEqual(ids(filterBookmarks(bs, cmap, { query: 'render motion' })), ['vid1']);
});

test('irisan search + chip tipe + Koleksi', () => {
  assert.deepEqual(ids(filterBookmarks(bs, cmap, { query: '', type: 'video', collection: 'none' })), []);
});

test('urutan terbaru di atas; query kosong = semua', () => {
  assert.deepEqual(ids(filterBookmarks(bs, cmap, {})), ['paling-baru', 'cmd1', 'vid1', 'paling-lama']);
});

test('tidak memutasi array masukan', () => {
  const before = bs.map((b) => b.id);
  filterBookmarks(bs, cmap, {});
  assert.deepEqual(bs.map((b) => b.id), before);
});
