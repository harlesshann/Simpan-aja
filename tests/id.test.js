import test from 'node:test';
import assert from 'node:assert/strict';
import { newId } from '../app/src/id.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('newId: UUID v4 valid & unik', () => {
  const ids = new Set(Array.from({ length: 200 }, newId));
  assert.equal(ids.size, 200);
  for (const id of ids) assert.match(id, UUID);
});

test('newId: tetap jalan tanpa crypto.randomUUID (simulasi http://IP di HP)', () => {
  const orig = globalThis.crypto.randomUUID;
  Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, writable: true, value: undefined });
  try {
    assert.equal(typeof globalThis.crypto.randomUUID, 'undefined');
    assert.match(newId(), UUID);
  } finally {
    Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, writable: true, value: orig });
  }
});
