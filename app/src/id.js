// Pembuat id. `crypto.randomUUID` hanya ada di secure context (https / localhost),
// sehingga HP lewat `http://IP` akan gagal senyap. `getRandomValues` tetap tersedia
// di insecure context; fallback Math.random bila crypto hilang.
export function newId() {
  const b = new Uint8Array(16);
  const g = globalThis.crypto && globalThis.crypto.getRandomValues;
  if (g) {
    g.call(globalThis.crypto, b);
  } else {
    for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  }
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
