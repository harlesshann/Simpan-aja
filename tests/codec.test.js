import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeAddPayload, decodeAddPayload } from '../app/src/codec.js';

// Helper tes: encode JSON apa adanya tanpa batas, untuk menempa payload buruk.
const encodeRaw = (obj) => {
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i], b1 = bytes[i + 1], b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
    if (b1 !== undefined) out += B64[((b1 & 15) << 2) | (b2 === undefined ? 0 : b2 >> 6)];
    if (b2 !== undefined) out += B64[b2 & 63];
  }
  return out;
};

test('encode base64url tanpa padding', () => {
  const s = encodeAddPayload({ v: 1, title: 'Video Remotion', url: 'https://youtu.be/x1', type: 'video', collection: 'Motion Design', note: 'teknik easing' });
  assert.match(s, /^[A-Za-z0-9_-]+$/);
});

test('decode mengembalikan value ternormalisasi', () => {
  const s = encodeAddPayload({ v: 1, title: 'Video Remotion', url: 'https://youtu.be/x1', type: 'video', collection: 'Motion Design', note: 'teknik easing' });
  assert.deepEqual(decodeAddPayload(s), {
    ok: true,
    value: { title: 'Video Remotion', url: 'https://youtu.be/x1', type: 'video', command: null, collection: 'Motion Design', note: 'teknik easing' },
  });
});

test('base64 rusak ditolak', () => {
  assert.deepEqual(decodeAddPayload('!!!bukan-base64!!!'), { ok: false, error: 'invalid' });
});

test('url javascript ditolak', () => {
  assert.equal(decodeAddPayload(encodeRaw({ v: 1, title: 'X', url: 'javascript:alert(1)', type: 'video' })).error, 'bad_url');
});

test('tipe tak dikenal ditolak', () => {
  assert.equal(decodeAddPayload(encodeRaw({ v: 1, title: 'X', url: 'https://a.com', type: 'aplikasi' })).error, 'bad_type');
});

test('encode melempar RangeError bila lebih dari 2.000 karakter', () => {
  assert.throws(
    () => encodeAddPayload({ v: 1, title: 'X', url: 'https://a.com', type: 'website', note: 'n'.repeat(2100) }),
    RangeError,
  );
});

test('decode payload terlalu panjang menolak too_long', () => {
  assert.equal(
    decodeAddPayload(encodeRaw({ v: 1, title: 'X', type: 'command', command: 'ls -la', note: 'x'.repeat(2100) })).error,
    'too_long',
  );
});

test('command kosong ditolak', () => {
  assert.equal(decodeAddPayload(encodeRaw({ v: 1, title: 'X', type: 'command' })).error, 'invalid');
});

test('judul kosong diterima dan dinormalisasi', () => {
  const r = decodeAddPayload(encodeRaw({ v: 1, url: 'https://a.com', type: 'website' }));
  assert.deepEqual(r, {
    ok: true,
    value: { title: '', url: 'https://a.com', type: 'website', command: null, collection: null, note: null },
  });
});

test('judul bukan string ditolak', () => {
  assert.equal(decodeAddPayload(encodeRaw({ v: 1, title: 42, url: 'https://a.com', type: 'website' })).error, 'invalid');
});
