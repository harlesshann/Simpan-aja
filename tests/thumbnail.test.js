import test from 'node:test';
import assert from 'node:assert/strict';
import { thumbnailFor, thumbLabel } from '../app/src/thumbnail.js';
import { posterSvg, posterDataUrl } from '../app/src/poster.js';
import { youtubeVideoId } from '../app/src/detect.js';

test('youtubeVideoId: ekstrak ID dari tiga bentuk URL', () => {
  assert.equal(youtubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeVideoId('https://youtu.be/abc123'), 'abc123');
  assert.equal(youtubeVideoId('https://www.youtube.com/shorts/xyz789'), 'xyz789');
  assert.equal(youtubeVideoId('https://example.com/a'), '');
});

test('YouTube memakai thumbnail asli', () => {
  assert.deepEqual(
    thumbnailFor({ type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
    { kind: 'youtube', src: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' },
  );
  assert.deepEqual(
    thumbnailFor({ type: 'video', url: 'https://youtu.be/abc123' }),
    { kind: 'youtube', src: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg' },
  );
});

test('situs umum memakai favicon (host tanpa www)', () => {
  assert.deepEqual(
    thumbnailFor({ type: 'website', url: 'https://web.dev/learn/css/layout' }),
    { kind: 'favicon', src: 'https://www.google.com/s2/favicons?domain=web.dev&sz=128' },
  );
  assert.deepEqual(
    thumbnailFor({ type: 'repo', url: 'https://www.github.com/a/b' }),
    { kind: 'favicon', src: 'https://www.google.com/s2/favicons?domain=github.com&sz=128' },
  );
});

test('platform embed-tertutup jatuh ke poster lokal', () => {
  assert.deepEqual(thumbnailFor({ type: 'video', url: 'https://www.threads.com/@x/post/abc' }), { kind: 'poster', platform: 'Threads' });
  assert.deepEqual(thumbnailFor({ type: 'video', url: 'https://www.instagram.com/reel/abc/' }), { kind: 'poster', platform: 'Instagram' });
  assert.deepEqual(thumbnailFor({ type: 'video', url: 'https://www.tiktok.com/@x/video/123' }), { kind: 'poster', platform: 'TikTok' });
});

test('command dan URL tak valid jatuh ke tile lokal', () => {
  assert.deepEqual(thumbnailFor({ type: 'command', command: 'ls -la' }), { kind: 'local', label: 'Command' });
  assert.deepEqual(thumbnailFor({ type: 'other', url: null }), { kind: 'local', label: 'Bookmark' });
});

test('thumbLabel: label placeholder selalu ada (siteName -> host -> Bookmark)', () => {
  assert.equal(thumbLabel({ type: 'command', command: 'ls' }), 'Command');
  assert.equal(thumbLabel({ type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }, 'YouTube'), 'YouTube');
  assert.equal(thumbLabel({ type: 'website', url: 'https://web.dev/learn/css' }), 'web.dev');
  assert.equal(thumbLabel({ type: 'video', url: 'https://www.tiktok.com/@x/video/1' }), 'TikTok');
  assert.equal(thumbLabel({ type: 'other', url: null }, 'Koleksi'), 'Bookmark');
});

test('posterSvg: platform + host + judul di dalam SVG', () => {
  const svg = posterSvg({ url: 'https://www.tiktok.com/@x/video/123', title: 'Belajar color grading' }, 'TikTok');
  assert.ok(svg.includes('>TikTok</text>'));
  assert.ok(svg.includes('tiktok.com'));
  assert.ok(svg.includes('Belajar color grading'));
});

test('posterSvg: judul berbahaya di-escape, tidak dieksekusi', () => {
  const svg = posterSvg({ url: 'https://www.threads.com/@x/post/1', title: '<script>alert(1)</script>' }, 'Threads');
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('&lt;script&gt;'));
});

test('posterSvg: deterministik & tema beda per platform', () => {
  const b = { url: 'https://www.instagram.com/reel/abc/', title: 'Trik' };
  assert.equal(posterSvg(b, 'Instagram'), posterSvg(b, 'Instagram'));
  assert.notEqual(posterSvg(b, 'Instagram'), posterSvg(b, 'TikTok'));
});

test('posterDataUrl: data URI SVG valid & judul panjang maksimal 3 baris', () => {
  const b = { url: 'https://www.tiktok.com/@x/video/1', title: 'kata '.repeat(40).trim() };
  const uri = posterDataUrl(b, 'TikTok');
  assert.ok(uri.startsWith('data:image/svg+xml;charset=utf-8,'));
  const svg = decodeURIComponent(uri.slice(uri.indexOf(',') + 1));
  const lines = [...svg.matchAll(/<text class="title"/g)];
  assert.equal(lines.length, 3);
  assert.ok(svg.includes('…'));
});
