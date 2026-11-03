import test from 'node:test';
import assert from 'node:assert/strict';
import { detectType, sourceLabel, normalizeUrl, isValidHttpUrl } from '../app/src/detect.js';

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
