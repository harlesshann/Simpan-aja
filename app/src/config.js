// Konfigurasi sinkronasi Supabase.
// Isi dua nilai dari Supabase Dashboard → Project Settings → API:
//   Project URL  = SUPABASE_URL
//   anon public key = SUPABASE_ANON_KEY
// Anon key memang untuk dipublikasikan (keamanan lewat RLS, bukan key).
// JANGAN pernah menaruh service_role key di file/umum.
// Biarkan kosong → sinkron nonaktif, app tetap jalan lokal penuh.
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
export const SYNC_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
