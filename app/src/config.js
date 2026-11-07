// Konfigurasi sinkronasi Supabase.
// Isi dua nilai dari Supabase Dashboard → Project Settings → API:
//   Project URL  = SUPABASE_URL
//   anon public key = SUPABASE_ANON_KEY
// Anon key memang untuk dipublikasikan (keamanan lewat RLS, bukan key).
// JANGAN pernah menaruh service_role key di file/umum.
// Biarkan kosong → sinkron nonaktif, app tetap jalan lokal penuh.
export const SUPABASE_URL = 'https://zuaixjabpszdjmgxtiyk.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_27irMM2auMVnUfX1TPI4fQ_bP4bVE1f';
export const SYNC_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
