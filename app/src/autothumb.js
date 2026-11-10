import { SUPABASE_URL, SUPABASE_ANON_KEY, SYNC_ENABLED } from './config.js';
import { getAccessToken } from './sync.js';

// Thumbnail otomatis: minta Edge Function `auto-thumbnail` mencari gambar
// halaman dan menyimpannya ke Supabase Storage, lalu pakai URL publiknya
// sebagai field `image`. File dihapus lagi saat bookmark dihapus.
//
// Butuh login (Edge Function verifikasi JWT + RLS storage). Tanpa itu,
// fungsi-fungsi di sini diam saja (kartu memakai thumbnail bawaan).

const PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/thumbnails/`;

// Balikan: URL gambar Storage, atau null bila tidak ada / gagal / belum login.
export async function autoThumbnail(bookmark) {
  if (!SYNC_ENABLED) return null;
  if (!bookmark || bookmark.type === 'command' || !bookmark.url || bookmark.image) return null;
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/auto-thumbnail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ url: bookmark.url, id: bookmark.id }),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const imageUrl = data && typeof data.imageUrl === 'string' ? data.imageUrl : '';
    return imageUrl.startsWith(PUBLIC_PREFIX) ? imageUrl : null;
  } catch {
    return null;
  }
}

// Hapus file thumbnail dari Storage. Hanya menyentuh URL milik bucket kita;
// data URL gambar kustom (upload file) dibiarkan.
export async function removeThumbnail(imageUrl) {
  if (!SYNC_ENABLED || typeof imageUrl !== 'string' || !imageUrl.startsWith(PUBLIC_PREFIX)) return;
  const token = await getAccessToken();
  if (!token) return;
  const path = imageUrl.slice(PUBLIC_PREFIX.length);
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/object/thumbnails`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ prefixes: [path] }),
    });
  } catch {
    // Diamkan: file yatim lebih baik daripada mengganggu alur hapus bookmark.
  }
}
