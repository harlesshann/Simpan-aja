// Edge Function: ambil gambar dari URL untuk dijadikan thumbnail.
//
// Kenapa lewat server: browser kena CORS saat mengambil gambar lintas domain,
// dan sebagian host menolak permintaan langsung dari halaman. Fungsi ini
// mengambil byte gambar lalu mengembalikannya apa adanya; klien tetap mengubahnya
// jadi data URL lewat canvas (pipeline yang sama dengan upload file).
//
// Keamanan: wajib JWT user Supabase (anti penyalahgunaan) dan validasi URL
// anti-SSRF (hanya https, tidak boleh menunjuk jaringan internal).
// Tidak ada service_role di sini; otentikasi user diverifikasi lewat anon key.

const MAX_BYTES = 10 * 1024 * 1024;
const TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 3;
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

class HttpError extends Error {
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Browser memanggil dari origin lain (Vercel/localhost), jadi preflight dan
// header CORS wajib. Tidak memakai cookie; otentikasi lewat Bearer token.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// --- Validasi alamat (anti-SSRF) -----------------------------------------

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return true; // bentuk aneh -> anggap tidak aman
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = nums;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224 // multicast / reserved
  );
}

function isPrivateIpv6(raw: string): boolean {
  const ip = raw.replace(/^\[|\]$/g, '').toLowerCase();
  if (ip === '::1' || ip === '::') return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // fc00::/8
  if (/^fe[89ab]/.test(ip)) return true; // fe80::/10
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return false;
}

const isIpLiteral = (host: string) => /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':');

function assertAllowed(rawUrl: string): URL {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new HttpError(400, 'URL tidak valid.');
  }
  if (u.protocol !== 'https:') {
    throw new HttpError(400, 'Hanya URL https yang diizinkan.');
  }
  const host = u.hostname.toLowerCase();
  if (!host) throw new HttpError(400, 'URL tidak valid.');
  if (host === 'localhost' || host.endsWith('.localhost')) {
    throw new HttpError(400, 'URL menunjuk ke alamat internal, tidak diizinkan.');
  }
  if (isIpLiteral(host) && (host.includes(':') ? isPrivateIpv6(host) : isPrivateIpv4(host))) {
    throw new HttpError(400, 'URL menunjuk ke alamat internal, tidak diizinkan.');
  }
  return u;
}

// Resolusi DNS: bila bisa, tolak host yang mengarah ke alamat internal
// (mis. domain publik yang menunjuk 127.0.0.1). Bila resolver tak tersedia,
// lewati tanpa gagal.
async function assertResolvesPublic(host: string): Promise<void> {
  if (isIpLiteral(host)) return;
  let records: string[] = [];
  try {
    const [a, aaaa] = await Promise.all([
      Deno.resolveDns(host, 'A').catch(() => []),
      Deno.resolveDns(host, 'AAAA').catch(() => []),
    ]);
    records = [...a, ...aaaa];
  } catch {
    return;
  }
  for (const ip of records) {
    if (ip.includes(':') ? isPrivateIpv6(ip) : isPrivateIpv4(ip)) {
      throw new HttpError(400, 'URL menunjuk ke alamat internal, tidak diizinkan.');
    }
  }
}

// --- Pengambilan gambar --------------------------------------------------

async function readLimited(res: Response): Promise<Uint8Array> {
  const len = Number(res.headers.get('content-length') || '0');
  if (len && len > MAX_BYTES) throw new HttpError(413, 'Gambar terlalu besar (maksimal 10 MB).');
  const reader = res.body?.getReader();
  if (!reader) throw new HttpError(422, 'Gambar tidak bisa diambil dari URL itu.');
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new HttpError(413, 'Gambar terlalu besar (maksimal 10 MB).');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

async function fetchImage(startUrl: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  let target = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const u = assertAllowed(target);
    await assertResolvesPublic(u.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      // redirect: 'manual' -> kita validasi setiap lompatan sendiri.
      res = await fetch(u.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        // Jangan teruskan cookie/header user ke sumber.
        headers: { Accept: 'image/*' },
      });
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw new HttpError(504, 'Waktu pengambilan gambar habis. Coba lagi.');
      }
      throw new HttpError(422, 'Gambar tidak bisa diambil dari URL itu.');
    }

    try {
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) throw new HttpError(422, 'Gambar tidak bisa diambil dari URL itu.');
        if (hop === MAX_REDIRECTS) throw new HttpError(422, 'Terlalu banyak pengalihan pada URL itu.');
        target = new URL(loc, u).toString();
        continue;
      }
      if (!res.ok) throw new HttpError(422, 'Gambar tidak bisa diambil dari URL itu.');

      const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!contentType.startsWith('image/') || !ALLOWED_IMAGE.includes(contentType)) {
        throw new HttpError(415, 'URL itu bukan gambar. Pakai tautan langsung ke file gambar.');
      }
      const bytes = await readLimited(res);
      return { bytes, contentType };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new HttpError(422, 'Gambar tidak bisa diambil dari URL itu.');
}

// --- Otentikasi ----------------------------------------------------------

async function verifyUser(token: string): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!url || !anon) return false;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- Handler -------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'Metode tidak didukung.' });

  const auth = req.headers.get('authorization') || '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token || !(await verifyUser(token))) {
    return json(401, { error: 'Harus masuk dulu untuk mengambil gambar dari URL.' });
  }

  let payload: { url?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'Body JSON tidak valid.' });
  }
  const imageUrl = typeof payload?.url === 'string' ? payload.url.trim() : '';
  if (!imageUrl) return json(400, { error: 'URL gambar wajib diisi.' });

  try {
    const { bytes, contentType } = await fetchImage(imageUrl);
    return new Response(bytes, {
      status: 200,
      headers: { ...CORS, 'Content-Type': contentType, 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: e.message });
    // Sengaja tidak mencatat isi URL atau pesan error mentah (bisa memuat URL).
    console.error('[fetch-image] gagal tak terduga');
    return json(422, { error: 'Gambar tidak bisa diambil dari URL itu.' });
  }
});
