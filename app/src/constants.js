export const TYPES = ['video', 'website', 'command', 'repo', 'extension', 'other'];

export const TYPE_LABELS = {
  video: 'Video',
  website: 'Website',
  command: 'Command',
  repo: 'Repo GitHub',
  extension: 'Extension',
  other: 'Lainnya',
};

export const MAX_ADD_PAYLOAD_CHARS = 2000;
export const DB_NAME = 'simpanaja';
export const DB_VERSION = 2;

// Warna folder Koleksi. Nilai tetap (bukan teks pengguna) supaya aman dipakai di CSS.
export const COLLECTION_COLORS = [
  '#ffde00', '#ff5c8a', '#7aa7ff', '#39d98a', '#ff8a3d', '#b88cff', '#41d3c7', '#c9d12e',
];
export const DEFAULT_COLLECTION_COLOR = '#ffde00';
export const isCollectionColor = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
export const safeCollectionColor = (v) => (isCollectionColor(v) ? v.toLowerCase() : DEFAULT_COLLECTION_COLOR);
