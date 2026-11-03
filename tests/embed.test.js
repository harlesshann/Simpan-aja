import test from 'node:test';
import assert from 'node:assert/strict';
import { previewFor } from '../app/src/embed.js';

const v = (url) => ({ type: 'video', url });

test('previewFor mengikuti tabel SPECS 7.5', () => {
  assert.deepEqual(previewFor(v('https://www.youtube.com/watch?v=dQw4w9WgXcQ')),
    { kind: 'youtube', embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' });
  assert.equal(previewFor(v('https://youtu.be/dQw4w9WgXcQ')).kind, 'youtube');
  assert.equal(previewFor(v('https://www.youtube.com/shorts/dQw4w9WgXcQ')).kind, 'youtube');
  assert.deepEqual(previewFor(v('https://cdn.example.com/a.webm')),
    { kind: 'file', embedUrl: 'https://cdn.example.com/a.webm' });
  assert.equal(previewFor(v('https://www.tiktok.com/@x/video/7300000000000000000')).kind, 'tiktok');
  assert.deepEqual(previewFor(v('https://www.threads.com/@x/post/abc')), { kind: 'fallback' });
  assert.deepEqual(previewFor(v('https://www.instagram.com/reel/abc/')), { kind: 'fallback' });
  assert.deepEqual(previewFor({ type: 'website', url: 'https://example.com' }), { kind: 'none' });
});
