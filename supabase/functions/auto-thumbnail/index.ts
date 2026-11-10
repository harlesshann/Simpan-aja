// Edge Function: cari gambar halaman (og:image / twitter:image) dan simpan ke
// Supabase Storage, lalu balas URL publiknya.
//
// Alur: JWT user -> validasi URL anti-SSRF -> ambil HTML halaman -> ekstrak
// gambar -> unduh gambar -> unggah ke bucket `thumbnails` folder milik user.
// Unggahan memakai JWT user (RLS storage), TANPA service_role.
//
// Kalau halaman tidak punya og:image dan bukan YouTube, balas 422; klien
// mengabaikannya dan kartu memakai thumbnail bawaan.

const PAGE_MAX = 2 * 1024 * 1024;
const IMG_MAX = 10 * 1024 * 1024;
const TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 3;
const BUCKET = 'thumbnails';
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Browser memanggil dari origin lain (Vercel/localhost): CORS + preflight wajib.
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
  if (parts.length !== 4) return true;
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = nums;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateIpv6(raw: string): boolean {
  const ip = raw.replace(/^\[|\]$/g, '').toLowerCase();
  if (ip === '::1' || ip === '::') return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(ip)) return true;
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
  if (u.protocol !== 'https:') throw new HttpError(400, 'Hanya URL https yang diizinkan.');
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

// Tolak host yang mengarah ke alamat internal. Dilewati bila resolver tak ada.
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

// --- Utilitas jaringan ---------------------------------------------------

async function readLimited(res: Response, limit: number, tooBig: string): Promise<Uint8Array> {
  const len = Number(res.headers.get('content-length') || '0');
  if (len && len > limit) {
    await res.body?.cancel();
    throw new HttpError(413, tooBig);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new HttpError(422, 'Isi dari URL itu tidak bisa dibaca.');
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw new HttpError(413, tooBig);
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

// Ikuti redirect manual maksimal MAX_REDIRECTS; tiap lompatan divalidasi ulang.
async function open(
  startUrl: string,
  accept: string,
): Promise<{ res: Response; finalUrl: string }> {
  let target = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const u = assertAllowed(target);
    await assertResolvesPublic(u.hostname);
    try {
      const res = await fetch(u.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        // Jangan teruskan cookie/header user ke sumber.
        headers: { Accept: accept },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        await res.body?.cancel();
        if (!loc || hop === MAX_REDIRECTS) throw new HttpError(422, 'Terlalu banyak pengalihan pada URL itu.');
        target = new URL(loc, u).toString();
        continue;
      }
      return { res, finalUrl: u.toString() };
    } catch (e) {
      if (e instanceof HttpError) throw e;
      if (e instanceof DOMException && e.name === 'TimeoutError') {
        throw new HttpError(504, 'Waktu pengambilan gambar habis. Coba lagi.');
      }
      throw new HttpError(422, 'Gambar tidak bisa diambil dari URL itu.');
    }
  }
  throw new HttpError(422, 'Gambar tidak bisa diambil dari URL itu.');
}

// --- Ekstraksi gambar dari HTML ------------------------------------------

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
  if (!m) return '';
  return (m[2] ?? m[3] ?? m[4] ?? '').trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .trim();
}

function metaImageUrl(html: string, baseUrl: string): string {
  let primary = '';
  let fallback = '';
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const key = (attr(tag, 'property') || attr(tag, 'name')).toLowerCase();
    if (!key) continue;
    const content = attr(tag, 'content');
    if (!content) continue;
    if (!primary && (key === 'og:image' || key === 'og:image:url' || key === 'og:image:secure_url')) primary = content;
    else if (!fallback && (key === 'twitter:image' || key === 'twitter:image:src')) fallback = content;
  }
  const raw = primary || fallback;
  if (!raw) return '';
  try {
    return new URL(decodeEntities(raw), baseUrl).toString();
  } catch {
    return '';
  }
}

// Cadangan: thumbnail YouTube tanpa perlu baca HTML.
function youtubeImage(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const id = host === 'youtu.be'
      ? u.pathname.slice(1).split('/')[0]
      : (host.endsWith('youtube.com') ? u.searchParams.get('v') : null);
    return id && /^[\w-]{6,20}$/.test(id) ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
  } catch {
    return '';
  }
}

// --- Unggah ke Storage ---------------------------------------------------

function safeSegment(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

async function uploadImage(
  token: string,
  bytes: Uint8Array,
  contentType: string,
  userId: string,
  bookmarkId: string,
): Promise<string> {
  const base = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!base || !anon) throw new HttpError(500, 'Penyimpanan belum siap.');

  const name = `${userId}/${safeSegment(bookmarkId) || crypto.randomUUID()}-${crypto.randomUUID().slice(0, 8)}.${EXT[contentType] || 'bin'}`;
  let res: Response;
  try {
    res = await fetch(`${base}/storage/v1/object/${BUCKET}/${name}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anon,
        'Content-Type': contentType,
        'Cache-Control': 'max-age=31536000',
        'x-upsert': 'true',
      },
      body: bytes,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new HttpError(422, 'Gagal menyimpan gambar ke penyimpanan.');
  }
  await res.body?.cancel();
  if (!res.ok) throw new HttpError(422, 'Gagal menyimpan gambar ke penyimpanan.');
  return `${base}/storage/v1/object/public/${BUCKET}/${name}`;
}

// --- Otentikasi ----------------------------------------------------------

async function verifyUser(token: string): Promise<string | null> {
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!url || !anon) return null;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data && typeof data.id === 'string' ? data.id : null;
  } catch {
    return null;
  }
}

// --- Handler -------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'Metode tidak didukung.' });

  const auth = req.headers.get('authorization') || '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  const userId = token ? await verifyUser(token) : null;
  if (!userId) return json(401, { error: 'Harus masuk dulu untuk mengambil thumbnail otomatis.' });

  let payload: { url?: unknown; id?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'Body JSON tidak valid.' });
  }
  const pageUrl = typeof payload?.url === 'string' ? payload.url.trim() : '';
  if (!pageUrl) return json(400, { error: 'URL wajib diisi.' });
  const bookmarkId = typeof payload?.id === 'string' ? payload.id : '';

  try {
    assertAllowed(pageUrl);
    const { res: pageRes, finalUrl } = await open(pageUrl, 'text/html,application/xhtml+xml,image/*');
    if (!pageRes.ok) throw new HttpError(422, 'Halaman tidak bisa diambil dari URL itu.');

    const pageType = (pageRes.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();

    let imageBytes: Uint8Array;
    let imageType: string;

    if (pageType.startsWith('image/')) {
      // URL yang ditempel ternyata langsung sebuah gambar.
      if (!ALLOWED_IMAGE.includes(pageType)) throw new HttpError(415, 'Format gambar tidak didukung.');
      imageType = pageType;
      imageBytes = await readLimited(pageRes, IMG_MAX, 'Gambar terlalu besar (maksimal 10 MB).');
    } else {
      if (pageType !== 'text/html' && pageType !== 'application/xhtml+xml') {
        throw new HttpError(422, 'Halaman itu tidak punya gambar yang bisa dipakai.');
      }
      const html = new TextDecoder('utf-8').decode(
        await readLimited(pageRes, PAGE_MAX, 'Halaman terlalu besar untuk dibaca.'),
      );
      const found = metaImageUrl(html, finalUrl) || youtubeImage(pageUrl);
      if (!found) throw new HttpError(422, 'Halaman itu tidak punya gambar yang bisa dipakai.');

      const { res: imgRes } = await open(found, 'image/*');
      if (!imgRes.ok) throw new HttpError(422, 'Gambar tidak bisa diambil dari URL itu.');
      const type = (imgRes.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!ALLOWED_IMAGE.includes(type)) throw new HttpError(415, 'URL itu bukan gambar.');
      imageType = type;
      imageBytes = await readLimited(imgRes, IMG_MAX, 'Gambar terlalu besar (maksimal 10 MB).');
    }

    const imageUrl = await uploadImage(token, imageBytes, imageType, userId, bookmarkId);
    return json(200, { imageUrl });
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: e.message });
    // Sengaja tidak mencatat isi URL atau pesan error mentah.
    console.error('[auto-thumbnail] gagal tak terduga');
    return json(422, { error: 'Gambar tidak bisa diambil dari URL itu.' });
  }
});
