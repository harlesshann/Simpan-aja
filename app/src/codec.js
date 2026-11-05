import { MAX_ADD_PAYLOAD_CHARS, TYPES } from './constants.js';
import { isValidHttpUrl } from './detect.js';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function bytesToB64url(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
    if (b1 !== undefined) out += B64[((b1 & 15) << 2) | (b2 === undefined ? 0 : b2 >> 6)];
    if (b2 !== undefined) out += B64[b2 & 63];
  }
  return out;
}

function b64urlToBytes(str) {
  if (typeof str !== 'string' || !/^[A-Za-z0-9_-]*$/.test(str)) return null;
  const vals = [...str].map((c) => B64.indexOf(c));
  if (vals.length % 4 === 1) return null;
  const bytes = [];
  for (let i = 0; i < vals.length; i += 4) {
    const n0 = vals[i];
    const n1 = vals[i + 1];
    const n2 = vals[i + 2];
    const n3 = vals[i + 3];
    bytes.push((n0 << 2) | (n1 >> 4));
    if (n2 !== undefined) bytes.push(((n1 & 15) << 4) | (n2 >> 2));
    if (n3 !== undefined) bytes.push(((n2 & 3) << 6) | n3);
  }
  return new Uint8Array(bytes);
}

export function encodeAddPayload(obj) {
  const json = JSON.stringify(obj);
  if (json.length > MAX_ADD_PAYLOAD_CHARS) throw new RangeError('Payload melebihi batas 2000 karakter.');
  return bytesToB64url(new TextEncoder().encode(json));
}

// Urutan validasi: invalid (base64/JSON/v/judul) -> too_long -> bad_type -> bad_url.
export function decodeAddPayload(str) {
  const bytes = b64urlToBytes(str);
  if (!bytes) return { ok: false, error: 'invalid' };

  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, error: 'invalid' };
  }

  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalid' };
  }

  if (!obj || obj.v !== 1) {
    return { ok: false, error: 'invalid' };
  }
  if (obj.title != null && typeof obj.title !== 'string') {
    return { ok: false, error: 'invalid' };
  }

  if (text.length > MAX_ADD_PAYLOAD_CHARS) return { ok: false, error: 'too_long' };

  if (!TYPES.includes(obj.type)) return { ok: false, error: 'bad_type' };

  const isCommand = obj.type === 'command';
  const command = typeof obj.command === 'string' ? obj.command : null;
  const url = typeof obj.url === 'string' ? obj.url : null;

  if (isCommand) {
    if (!command || !command.trim()) return { ok: false, error: 'invalid' };
  } else if (!isValidHttpUrl(url)) {
    return { ok: false, error: 'bad_url' };
  }

  return {
    ok: true,
    value: {
      title: typeof obj.title === 'string' ? obj.title.trim() : '',
      url: isCommand ? null : url,
      type: obj.type,
      command: isCommand ? command : null,
      collection: typeof obj.collection === 'string' && obj.collection.trim() ? obj.collection.trim() : null,
      note: typeof obj.note === 'string' && obj.note ? obj.note : null,
    },
  };
}
