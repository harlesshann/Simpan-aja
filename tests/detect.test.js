import test from 'node:test';
import assert from 'node:assert/strict';
import { detectType, sourceLabel, normalizeUrl, isValidHttpUrl, deriveTitle } from '../app/src/detect.js';

test('detectType menebak tipe sesuai SPECS 8.3', () => {
  assert.equal(detectType('https://github.com/stablyai/orca'), 'repo');
  assert.equal(detectType('https://youtu.be/abc123'), 'video');
  assert.equal(detectType('https://www.tiktok.com/@x/video/123'), 'video');
  assert.equal(detectType('https://www.threads.com/@x/post/abc'), 'video');
  assert.equal(detectType('https://chromewebstore.google.com/detail/x/abc'), 'extension');
  assert.equal(detectType('https://addons.mozilla.org/en-US/firefox/addon/x/'), 'extension');
  assert.equal(detectType('https://example.com/artikel'), 'website');
  assert.equal(detectType('javascript:alert(1)'), null);
});

test('sourceLabel menurunkan label platform', () => {
  assert.equal(sourceLabel('https://github.com/a/b'), 'GitHub');
  assert.equal(sourceLabel('https://sub.example.co.id/x'), 'sub.example.co.id');
});

test('normalizeUrl menyeragamkan skema/host/www/trailing slash', () => {
  assert.equal(normalizeUrl('HTTPS://WWW.GitHub.com/a/b/'), normalizeUrl('https://github.com/a/b'));
});

test('isValidHttpUrl menolak skema non-http', () => {
  assert.equal(isValidHttpUrl('ftp://example.com'), false);
});

test('deriveTitle: repo GitHub = owner/repo', () => {
  assert.equal(deriveTitle({ type: 'repo', url: 'https://github.com/stablyai/orca' }), 'stablyai/orca');
});

test('deriveTitle: YouTube memakai ID video', () => {
  assert.equal(deriveTitle({ type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }), 'YouTube — dQw4w9WgXcQ');
  assert.equal(deriveTitle({ type: 'video', url: 'https://youtu.be/abc123' }), 'YouTube — abc123');
  assert.equal(deriveTitle({ type: 'video', url: 'https://www.youtube.com/shorts/xyz789' }), 'YouTube — xyz789');
});

test('deriveTitle: path umum di-humanize', () => {
  assert.equal(deriveTitle({ type: 'website', url: 'https://web.dev/learn/css/layout' }), 'Learn Css Layout');
  assert.equal(deriveTitle({ type: 'website', url: 'https://example.com/artikel-panjang/' }), 'Artikel Panjang');
});

test('deriveTitle: segmen hash/angka dibuang, jatuh ke segmen bermakna', () => {
  assert.equal(deriveTitle({ type: 'website', url: 'https://example.com/p/1a2b3c4d5e/artikel' }), 'Artikel');
  assert.equal(deriveTitle({ type: 'website', url: 'https://example.com/en/artikel' }), 'Artikel');
});

test('deriveTitle: tanpa path berguna = nama host', () => {
  assert.equal(deriveTitle({ type: 'website', url: 'https://example.com' }), 'example.com');
  assert.equal(deriveTitle({ type: 'other', url: 'https://www.example.com/' }), 'example.com');
});

test('deriveTitle: host khusus memakai label platform', () => {
  assert.equal(deriveTitle({ type: 'extension', url: 'https://chromewebstore.google.com/detail/x/abc' }), 'Chrome Web Store');
  assert.equal(deriveTitle({ type: 'extension', url: 'https://addons.mozilla.org/en-US/firefox/addon/x/' }), 'Firefox Add-ons');
});

test('deriveTitle: command = baris pertama dipangkas', () => {
  assert.equal(deriveTitle({ type: 'command', command: 'ffmpeg -i in.mp4 -vn -acodec libmp3lame out.mp3' }), 'ffmpeg -i in.mp4 -vn -acodec libmp3lame out.mp3');
  assert.equal(deriveTitle({ type: 'command', command: '  ls -la\nnpm test\n' }), 'ls -la');
  assert.equal(deriveTitle({ type: 'command', command: 'x'.repeat(100) }).length, 60);
});
