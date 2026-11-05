import test from 'node:test';
import assert from 'node:assert/strict';
import { thumbnailFor } from '../app/src/thumbnail.js';
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

test('platform embed-tertutup jatuh ke tile lokal', () => {
  assert.deepEqual(thumbnailFor({ type: 'video', url: 'https://www.threads.com/@x/post/abc' }), { kind: 'local', label: 'Threads' });
  assert.deepEqual(thumbnailFor({ type: 'video', url: 'https://www.instagram.com/reel/abc/' }), { kind: 'local', label: 'Instagram' });
  assert.deepEqual(thumbnailFor({ type: 'video', url: 'https://www.tiktok.com/@x/video/123' }), { kind: 'local', label: 'TikTok' });
});

test('command dan URL tak valid jatuh ke tile lokal', () => {
  assert.deepEqual(thumbnailFor({ type: 'command', command: 'ls -la' }), { kind: 'local', label: 'Command' });
  assert.deepEqual(thumbnailFor({ type: 'other', url: null }), { kind: 'local', label: 'Bookmark' });
});
