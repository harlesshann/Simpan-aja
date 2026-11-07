import test from 'node:test';
import assert from 'node:assert/strict';
import { decide, toRemote, fromRemote, outboxPayload, shouldResetLocal, isRlsError, PULL_PAGE } from '../app/src/sync.js';

const bookmark = {
  id: 'b1', title: 'Video Remotion', type: 'video',
  url: 'https://youtu.be/x1', command: null, collectionId: 'c1',
  note: 'easing', image: 'data:image/webp;base64,AA==',
  createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z',
  deletedAt: null,
};

const collection = {
  id: 'c1', name: 'Motion Design', color: '#ff5c8a',
  createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z',
  deletedAt: null,
};

test('decide: last-write-wins dengan tombstone', () => {
  assert.equal(decide(null, { updated_at: '2026-11-02T00:00:00Z' }), 'take-remote');
  assert.equal(
    decide(bookmark, { updated_at: '2026-11-03T00:00:00Z', deleted_at: '2026-11-03T00:00:00Z' }),
    'take-remote',
  );
  assert.equal(decide(bookmark, { updated_at: '2026-11-01T00:00:00Z' }), 'keep-local');
  // Timestamp sama -> versi lokal dipertahankan (outbox yang akan menang).
  assert.equal(decide(bookmark, { updated_at: bookmark.updatedAt }), 'keep-local');
  // Timestamp rusak/kosong tidak boleh mengalahkan lokal.
  assert.equal(decide(bookmark, { updated_at: 'bukan-tanggal' }), 'keep-local');
});

test('toRemote/fromRemote: bookmark bolak-balik utuh', () => {
  const remote = toRemote('bookmarks', bookmark);
  assert.equal(remote.collection_id, 'c1');
  assert.equal(remote.created_at, bookmark.createdAt);
  assert.equal(remote.updated_at, bookmark.updatedAt);
  assert.equal(remote.deleted_at, null);
  assert.deepEqual(fromRemote('bookmarks', remote), bookmark);
});

test('toRemote/fromRemote: koleksi bolak-balik utuh', () => {
  const remote = toRemote('collections', collection);
  assert.equal(remote.color, '#ff5c8a');
  assert.deepEqual(fromRemote('collections', remote), collection);
});

test('tombstone remote memetakan deletedAt', () => {
  const row = fromRemote('bookmarks', {
    id: 'b1', title: null, type: null, url: null, command: null,
    collection_id: null, note: null, image: null,
    created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-03T00:00:00Z',
    deleted_at: '2026-11-03T00:00:00Z',
  });
  assert.equal(row.deletedAt, '2026-11-03T00:00:00Z');
  assert.equal(row.note, '');
  assert.equal(row.collectionId, null);
});

test('outboxPayload: baris hilang jadi tombstone', () => {
  const entry = { id: 'b9', updatedAt: '2026-11-04T00:00:00.000Z', deletedAt: null };
  assert.deepEqual(outboxPayload('bookmarks', entry, undefined), {
    id: 'b9',
    updated_at: '2026-11-04T00:00:00.000Z',
    deleted_at: '2026-11-04T00:00:00.000Z',
  });
  const payload = outboxPayload('bookmarks', entry, bookmark);
  assert.equal(payload.id, bookmark.id);
  assert.equal(payload.deleted_at, null);
  // Baris lama tanpa updatedAt memakai timestamp entri outbox.
  const legacy = { id: 'b1', title: 'x' };
  assert.equal(outboxPayload('bookmarks', entry, legacy).updated_at, entry.updatedAt);
});

test('PULL_PAGE wajar untuk paginasi', () => {
  assert.ok(PULL_PAGE >= 100 && PULL_PAGE <= 1000);
});

test('shouldResetLocal: reset hanya saat akun berganti', () => {
  assert.equal(shouldResetLocal(null, 'u2'), false);   // login pertama: klaim data lokal
  assert.equal(shouldResetLocal('u1', 'u1'), false);   // login ulang akun sama
  assert.equal(shouldResetLocal('u1', 'u2'), true);    // akun berganti
  assert.equal(shouldResetLocal('u1', null), false);   // sign out
});

test('isRlsError: kenali penolakan RLS', () => {
  assert.equal(isRlsError({ code: '42501', message: 'permission denied' }), true);
  assert.equal(isRlsError({ message: 'new row violates row-level security policy (USING expression) for table "collections"' }), true);
  assert.equal(isRlsError({ code: '23505', message: 'duplicate key value' }), false);
  assert.equal(isRlsError(null), false);
});