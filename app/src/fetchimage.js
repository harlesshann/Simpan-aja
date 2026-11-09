import { SUPABASE_URL, SUPABASE_ANON_KEY, SYNC_ENABLED } from './config.js';
import { getAccessToken } from './sync.js';

// Ambil gambar lewat Edge Function `fetch-image` (browser kena CORS bila
// mengambil langsung). Hasilnya Blob; form.js mengubahnya ke data URL lewat
// pipeline canvas yang sama dengan upload file — tidak ada unggahan gambar.
export async function fetchImageBlob(imageUrl) {
  if (!SYNC_ENABLED) throw new Error('Harus masuk dulu untuk mengambil gambar dari URL.');
  const token = await getAccessToken();
  if (!token) throw new Error('Harus masuk dulu untuk mengambil gambar dari URL.');

  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/fetch-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ url: imageUrl }),
    });
  } catch {
    throw new Error('Tidak bisa menghubungi server. Cek koneksi lalu coba lagi.');
  }

  if (!res.ok) {
    let message = 'Gambar tidak bisa diambil dari URL itu.';
    try {
      const data = await res.json();
      if (data && typeof data.error === 'string' && data.error) message = data.error;
    } catch {
      // respons bukan JSON: pakai pesan umum
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  if (!blob.type.startsWith('image/')) {
    throw new Error('URL itu bukan gambar. Pakai tautan langsung ke file gambar.');
  }
  return blob;
}
