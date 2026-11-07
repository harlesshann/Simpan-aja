// QA final: SPECS §10 criteria 1-7, 10-13, screenshots, network audit.
// (Criteria 8, 9, 14 already covered by qa/task6-11.mjs.)
const PORT = 9222;
const APP = 'http://localhost:8000/';
const OUT390 = 'qa/final-390.png';
const OUT1280 = 'qa/final-1280.png';

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('no CDP page target');
}

const page = await target();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map();
const requests = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Network.requestWillBeSent') requests.push(m.params.request.url);
};
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  const ex = r.result?.exceptionDetails;
  if (ex) return { __error: ex.exception?.description || ex.text || 'exception' };
  return r.result?.result?.value;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function nav(url) { await send('Page.navigate', { url }); await sleep(1600); }
async function navFresh(url) { await nav('about:blank'); await nav(url); }

await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Browser.grantPermissions', { origin: 'http://localhost:8000', permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Storage.clearDataForOrigin', { origin: 'http://localhost:8000', storageTypes: 'indexeddb' });
await navFresh(APP);

const R = { checks: [], notes: {} };
const check = (name, pass, detail) => {
  console.error(`[check] ${pass ? 'ok  ' : 'FAIL'} ${name}`);
  R.checks.push({ name, pass: !!pass, detail });
};

// ---------- Criterion 1: add one item of every type via the form ----------
const addResult = await evaluate(`(async()=>{
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  const q = (s)=>document.querySelector(s);
  window.confirm = () => true;
  async function add({ title, type, url, command, collection }) {
    q('#btnAdd').click(); await sleep(40);
    q('#fTitle').value = title;
    q('#fType').value = type;
    q('#fType').dispatchEvent(new Event('change', { bubbles:true }));
    await sleep(20);
    if (type === 'command') {
      q('#fCommand').value = command;
      q('#fCommand').dispatchEvent(new Event('input', { bubbles:true }));
    } else {
      q('#fUrl').value = url;
      q('#fUrl').dispatchEvent(new Event('input', { bubbles:true }));
    }
    if (collection) {
      q('#fCollection').value = '__new__';
      q('#fCollection').dispatchEvent(new Event('change', { bubbles:true }));
      q('#fNewCollection').value = collection;
    }
    q('#fNote').value = title + ' catatan';
    q('#bookmarkForm').requestSubmit();
    await sleep(120);
    return !q('#bookmarkDialog').open;
  }
  const out = {};
  out.video = await add({ title:'Belajar easing dasar', type:'video', url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ', collection:'Motion Design' });
  out.website = await add({ title:'Artikel CSS layout', type:'website', url:'https://web.dev/learn/css/layout' });
  out.command = await add({ title:'Konversi audio mp4', type:'command', command:'ffmpeg -i in.mp4 -vn -acodec libmp3lame out.mp3' });
  out.repo = await add({ title:'Orca video editor', type:'repo', url:'https://github.com/stablyai/orca', collection:'Motion Design' });
  out.extension = await add({ title:'Ekstensi React DevTools', type:'extension', url:'https://chromewebstore.google.com/detail/x/abc' });
  out.other = await add({ title:'Catatan internal', type:'other', url:'https://example.com/catatan' });
  out.threads = await add({ title:'Teknik color grading', type:'video', url:'https://www.threads.com/@x/post/abc' });
  return out;
})()`);
R.notes.addForm = addResult;

const badges = await evaluate(`([...document.querySelectorAll('.card')].map(c => ({
  title: c.querySelector('.card-title')?.textContent,
  badge: c.querySelector('.badge')?.textContent,
  thumb: c.querySelector('.card-thumb-img')?.getAttribute('src') || c.querySelector('.thumb-tile')?.getAttribute('aria-label') || null,
})))`);
R.notes.badges = badges;
const labelByTitle = Object.fromEntries((badges || []).map((b) => [b.title, b.badge]));
const thumbByTitle = Object.fromEntries((badges || []).map((b) => [b.title, b.thumb]));
check('1. semua tipe tampil dengan lencana benar + thumbnail sesuai sumber',
  labelByTitle['Belajar easing dasar'] === 'Video' &&
  labelByTitle['Artikel CSS layout'] === 'Website' &&
  labelByTitle['Konversi audio mp4'] === 'Command' &&
  labelByTitle['Orca video editor'] === 'Repo GitHub' &&
  labelByTitle['Ekstensi React DevTools'] === 'Extension' &&
  labelByTitle['Catatan internal'] === 'Lainnya' &&
  thumbByTitle['Belajar easing dasar'] === 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' &&
  thumbByTitle['Artikel CSS layout'] === 'https://www.google.com/s2/favicons?domain=web.dev&sz=128' &&
  thumbByTitle['Konversi audio mp4'] === 'Command' &&
  /^data:image\/svg\+xml/.test(thumbByTitle['Teknik color grading'] || '') &&
  decodeURIComponent(thumbByTitle['Teknik color grading'] || '').includes('Threads') &&
  Object.values(addResult || {}).every(Boolean),
  JSON.stringify({ labelByTitle, thumbByTitle }));

// ---------- Criterion 2: detection guesses, manually overridable ----------
const detect = await evaluate(`(async()=>{
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  const q = (s)=>document.querySelector(s);
  q('#btnAdd').click(); await sleep(40);
  const out = {};
  for (const [key, url] of Object.entries({
    github:'https://github.com/a/b',
    youtube:'https://youtu.be/abc123',
    chrome:'https://chromewebstore.google.com/detail/x/abc',
    plain:'https://example.org/artikel',
  })) {
    q('#fUrl').value = url;
    q('#fUrl').dispatchEvent(new Event('input', { bubbles:true }));
    await sleep(30);
    out[key] = q('#fType').value;
  }
  q('#fType').value = 'other';
  q('#fType').dispatchEvent(new Event('change', { bubbles:true }));
  const kept = q('#fType').value;
  q('#btnCancelForm').click();
  return { ...out, manualKept: kept };
})()`);
R.notes.detect = detect;
check('2. deteksi tipe + bisa diganti manual',
  detect.github === 'repo' && detect.youtube === 'video' && detect.chrome === 'extension' &&
  detect.plain === 'website' && detect.manualKept === 'other', JSON.stringify(detect));

// ---------- Criterion 3 & 4: search, chips, collection, order ----------
const filtering = await evaluate(`(async()=>{
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  const q = (s)=>document.querySelector(s);
  const cards = ()=>document.querySelectorAll('.card').length;
  const titles = ()=>[...document.querySelectorAll('.card-title')].map(e=>e.textContent);
  const db = await import('/src/db.js');
  const cols = await db.listCollections();
  const motion = cols.find(c=>c.name==='Motion Design');
  const s = q('#search');
  const setSearch = (v)=>{ s.value=v; s.dispatchEvent(new Event('input',{bubbles:true})); };
  const out = {};
  setSearch('ffmpeg'); await sleep(40); out.searchFfmpeg = titles();
  setSearch(''); await sleep(40);
  q('[data-type="video"]').click(); await sleep(40); out.chipVideo = cards();
  q('[data-collection="'+motion.id+'"]').click(); await sleep(40); out.videoInMotion = titles();
  setSearch('easing'); await sleep(40); out.intersection = titles();
  setSearch(''); q('[data-type="all"]').click(); q('[data-collection="all"]').click(); await sleep(40);
  out.all = cards(); out.first = titles()[0];
  return out;
})()`);
R.notes.filtering = filtering;
check('3. search ffmpeg menemukan isi command',
  filtering.searchFfmpeg?.length === 1 && filtering.searchFfmpeg[0] === 'Konversi audio mp4',
  JSON.stringify(filtering.searchFfmpeg));
check('4. irisan search+chip+Koleksi dan urutan terbaru',
  filtering.videoInMotion?.length === 1 && filtering.videoInMotion[0] === 'Belajar easing dasar' &&
  filtering.intersection?.length === 1 && filtering.intersection[0] === 'Belajar easing dasar' &&
  filtering.all === 7 && filtering.first === 'Teknik color grading',
  JSON.stringify(filtering));

// ---------- Criterion 5: copy exact text via detail modal ----------
// Clipboard asli menggantung di headless Chrome 156, jadi pakai buffer in-page.
await evaluate(`(() => {
  const buf = { text: '' };
  const c = navigator.clipboard;
  c.writeText = async (t) => { buf.text = String(t); };
  c.readText = async () => buf.text;
  return 'stub';
})()`);
const copy = await evaluate(`(async()=>{
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  const q = (s)=>document.querySelector(s);
  const cardBy = (t)=>[...document.querySelectorAll('.card')].find(c=>c.querySelector('.card-title')?.textContent===t);
  const btnIn = (root, t)=>[...root.querySelectorAll('button')].find(b=>b.textContent===t);
  const read = async (title)=>{
    cardBy(title).click(); await sleep(90);
    btnIn(q('#detailDialog'),'Copy').click(); await sleep(140);
    const txt = await navigator.clipboard.readText();
    q('#detailDialog .detail-close').click(); await sleep(60);
    return txt;
  };
  const cmd = await read('Konversi audio mp4');
  const web = await read('Artikel CSS layout');
  return { cmd, web };
})()`);
R.notes.copy = copy;
check('5. Copy command & URL persis',
  copy.cmd === 'ffmpeg -i in.mp4 -vn -acodec libmp3lame out.mp3' &&
  copy.web === 'https://web.dev/learn/css/layout', JSON.stringify(copy));

// ---------- Criterion 15: card click opens detail modal ----------
const detail = await evaluate(`(async()=>{
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  const q = (s)=>document.querySelector(s);
  const cardBy = (t)=>[...document.querySelectorAll('.card')].find(c=>c.querySelector('.card-title')?.textContent===t);
  const d = q('#detailDialog');
  const c = cardBy('Orca video editor');
  const role = c.getAttribute('role'); const tab = c.tabIndex; const hasThumb = !!c.querySelector('.card-thumb');
  c.click(); await sleep(90);
  const out = {
    role, tab, hasThumb,
    open: d.open,
    title: d.querySelector('.detail-title')?.textContent,
    badge: d.querySelector('.badge')?.textContent,
    url: d.querySelector('.detail-url')?.textContent,
    thumb: !!d.querySelector('.detail-thumb .card-thumb'),
    actions: [...d.querySelectorAll('.detail-actions button, .detail-actions a')].map(e=>e.textContent),
  };
  [...d.querySelectorAll('button')].find(b=>b.classList.contains('detail-close')).click(); await sleep(60);
  out.closed = !d.open;
  return out;
})()`);
R.notes.detail = detail;
check('15. klik kartu membuka detail lengkap (thumb, judul, sumber, aksi) lalu tutup ×',
  detail.role === 'button' && detail.tab === 0 && detail.hasThumb && detail.open &&
  detail.title === 'Orca video editor' && detail.badge === 'Repo GitHub' &&
  detail.url === 'https://github.com/stablyai/orca' && detail.thumb &&
  detail.actions.includes('Buka') && detail.actions.includes('Copy') &&
  detail.actions.includes('Edit') && detail.actions.includes('Hapus') &&
  !detail.actions.includes('Preview') && !detail.actions.includes('Tutup') &&
  detail.closed, JSON.stringify(detail));

// ---------- Criterion 6: delete collection keeps bookmarks ----------
const collections = await evaluate(`(async()=>{
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  const q = (s)=>document.querySelector(s);
  window.confirm = () => true;
  const db = await import('/src/db.js');
  const before = (await db.listBookmarks()).length;
  q('#btnManageCollections').click(); await sleep(60);
  const rows = [...document.querySelectorAll('#collectionManagerList .manage-row')];
  const row = rows.find(r=>r.querySelector('input').value==='Motion Design');
  [...row.querySelectorAll('button')].find(b=>b.textContent==='Hapus').click();
  await sleep(250);
  const cols = await db.listCollections();
  const bs = await db.listBookmarks();
  q('#btnCloseCollections').click(); await sleep(60);
  q('[data-collection="none"]').click(); await sleep(60);
  const noneTitles = [...document.querySelectorAll('.card-title')].map(e=>e.textContent);
  return { before, after: bs.length, cols: cols.map(c=>c.name),
    detached: bs.filter(b=>b.title==='Belajar easing dasar')[0].collectionId === null,
    noneHasVideo: noneTitles.includes('Belajar easing dasar') };
})()`);
R.notes.collections = collections;
check('6. hapus Koleksi tidak menghapus bookmark',
  collections.before === 7 && collections.after === 7 && collections.detached &&
  !collections.cols.includes('Motion Design') && collections.noneHasVideo, JSON.stringify(collections));

// reset collection filter
await evaluate(`document.querySelector('[data-collection="all"]').click()`);
await sleep(80);

// ---------- Criterion 7: detail tanpa tombol Preview; tutup berupa ikon × ----------
const detailClose = await evaluate(`(async()=>{
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  const q = (s)=>document.querySelector(s);
  const cardBy = (t)=>[...document.querySelectorAll('.card')].find(c=>c.querySelector('.card-title')?.textContent===t);
  const out = {};

  cardBy('Belajar easing dasar').click(); await sleep(90);
  out.detailOpen = q('#detailDialog').open;
  const labels = [...q('#detailDialog').querySelectorAll('button')].map(b=>b.textContent.trim());
  out.noPreview = !labels.includes('Preview');
  out.noTutupText = !labels.includes('Tutup');
  const x = q('#detailDialog .detail-close');
  out.hasX = !!x && x.textContent.trim() === '\\u00d7' && x.getAttribute('aria-label') === 'Tutup detail';
  x?.click(); await sleep(80);
  out.closed = !q('#detailDialog').open;

  cardBy('Teknik color grading').click(); await sleep(80);
  q('#detailDialog .detail-close')?.click(); await sleep(80);
  out.closed2 = !q('#detailDialog').open;
  return out;
})()`);
R.notes.detailClose = detailClose;
check('7. detail tanpa Preview; tombol tutup ikon × menutup modal',
  detailClose.detailOpen && detailClose.noPreview && detailClose.noTutupText &&
  detailClose.hasX && detailClose.closed && detailClose.closed2, JSON.stringify(detailClose));

// ---------- Criterion 10: duplicate warning ----------
const dupe = await evaluate(`(async()=>{
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  const q = (s)=>document.querySelector(s);
  let msg = null;
  window.confirm = (m) => { msg = m; return false; };
  const db = await import('/src/db.js');
  const before = (await db.listBookmarks()).length;
  q('#btnAdd').click(); await sleep(40);
  q('#fTitle').value = 'Duplikat easing';
  q('#fUrl').value = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  q('#fUrl').dispatchEvent(new Event('input', { bubbles:true }));
  q('#bookmarkForm').requestSubmit(); await sleep(120);
  const after = (await db.listBookmarks()).length;
  const stillOpen = q('#bookmarkDialog').open;
  q('#btnCancelForm').click();
  return { msg, saved: after !== before, stillOpen };
})()`);
R.notes.dupe = dupe;
check('10. peringatan duplikat menyebut judul lama & Batal tidak menyimpan',
  /Belajar easing dasar/.test(dupe.msg || '') && !dupe.saved && dupe.stillOpen, JSON.stringify(dupe));

// ---------- Criterion 13: import keeps createdAt, id collision -> new id ----------
const collision = await evaluate(`(async()=>{
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  const db = await import('/src/db.js');
  const bs = await db.listBookmarks();
  const target = bs.find(b=>b.title==='Artikel CSS layout');
  const fake = {
    app:'SimpanAja', version:1, exportedAt:new Date().toISOString(),
    collections:[],
    bookmarks:[{
      id: target.id, title:'Item Bentrok', type:'website', url:'https://example.com/bentrok',
      command:null, collectionId:null, note:'',
      createdAt:'2020-01-01T00:00:00.000Z', updatedAt:'2020-01-01T00:00:00.000Z',
    }],
  };
  const dt = new DataTransfer();
  dt.items.add(new File([JSON.stringify(fake)], 'bentrok.json', { type:'application/json' }));
  const inp = document.getElementById('importFile');
  inp.files = dt.files;
  inp.dispatchEvent(new Event('change', { bubbles:true }));
  await sleep(300);
  const after = await db.listBookmarks();
  const added = after.find(b=>b.title==='Item Bentrok');
  return { added: !!added, idChanged: added && added.id !== target.id,
    createdAt: added?.createdAt, total: after.length };
})()`);
R.notes.collision = collision;
check('13. tabrakan id -> id baru, createdAt asli dipertahankan',
  collision.added && collision.idChanged && collision.createdAt === '2020-01-01T00:00:00.000Z' && collision.total === 8,
  JSON.stringify(collision));

// ---------- Optional title: add with URL only ----------
const onlyUrl = await evaluate(`(async()=>{
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  const q = (s)=>document.querySelector(s);
  window.confirm = () => true;
  q('#btnAdd').click(); await sleep(40);
  q('#fTitle').value = '';
  q('#fUrl').value = 'https://web.dev/learn/css/grid';
  q('#fUrl').dispatchEvent(new Event('input', { bubbles:true }));
  await sleep(30);
  q('#bookmarkForm').requestSubmit(); await sleep(150);
  const db = await import('/src/db.js');
  const item = (await db.listBookmarks()).find(b=>b.url==='https://web.dev/learn/css/grid');
  const card = [...document.querySelectorAll('.card')].find(c=>c.querySelector('.card-title')?.textContent==='Learn Css Grid');
  const title = item?.title;
  const cardTitle = card?.querySelector('.card-title')?.textContent;
  if (item) await db.deleteBookmark(item.id);
  return { title, cardTitle };
})()`);
R.notes.onlyUrl = onlyUrl;
check('O1. kolom judul dikosongkan -> judul diturunkan dari URL',
  onlyUrl.title === 'Learn Css Grid' && onlyUrl.cardTitle === 'Learn Css Grid',
  JSON.stringify(onlyUrl));

// ---------- Criterion 16: save works on insecure origin (no crypto.randomUUID) ----------
// HP lewat http://IP bukan secure context -> randomUUID undefined.
const insecure = await evaluate(`(async()=>{
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  const q = (s)=>document.querySelector(s);
  window.confirm = () => true;
  const hadRandomUUID = typeof crypto.randomUUID === 'function';
  const orig = crypto.randomUUID;
  Object.defineProperty(crypto, 'randomUUID', { configurable: true, writable: true, value: undefined });
  try {
    q('#btnAdd').click(); await sleep(40);
    q('#fTitle').value = 'Uji HP insecure';
    q('#fUrl').value = 'https://example.org/hp';
    q('#fUrl').dispatchEvent(new Event('input',{bubbles:true}));
    await sleep(30);
    q('#bookmarkForm').requestSubmit(); await sleep(160);
    const db = await import('/src/db.js');
    const item = (await db.listBookmarks()).find(b=>b.url==='https://example.org/hp');
    const card = [...document.querySelectorAll('.card')].find(c=>c.querySelector('.card-title')?.textContent==='Uji HP insecure');
    const out = {
      hadRandomUUID,
      dialogClosed: !q('#bookmarkDialog').open,
      saved: !!item && /^[0-9a-f-]{36}$/.test(item.id),
      cardShown: !!card,
      error: q('#formError').hidden ? null : q('#formError').textContent,
    };
    if (item) await db.deleteBookmark(item.id);
    return out;
  } finally {
    Object.defineProperty(crypto, 'randomUUID', { configurable: true, writable: true, value: orig });
  }
})()`);
R.notes.insecure = insecure;
check('16. Simpan tetap bekerja tanpa crypto.randomUUID (origin http://IP di HP)',
  insecure.hadRandomUUID && insecure.saved && insecure.cardShown && insecure.dialogClosed && !insecure.error,
  JSON.stringify(insecure));

// ---------- Criterion 12: network audit — only approved thumbnail sources ----------
requests.length = 0;
await navFresh(APP);
await evaluate(`(async()=>{
  const s=document.getElementById('search');
  s.value='ffmpeg'; s.dispatchEvent(new Event('input',{bubbles:true}));
  await new Promise(r=>setTimeout(r,100));
  document.querySelector('[data-type="website"]').click();
  await new Promise(r=>setTimeout(r,100));
  return 1;
})()`);
await sleep(600);
const APPROVED = [
  /^https:\/\/i\.ytimg\.com\//,
  /^https:\/\/www\.google\.com\/s2\/favicons\?/,
  /^https:\/\/[a-z0-9-]+\.gstatic\.com\//,
];
const external = requests.filter((u) => !u.startsWith('http://localhost:8000') && !u.startsWith('data:'));
const unexpected = external.filter((u) => !APPROVED.some((re) => re.test(u)));
R.notes.network = { total: requests.length, external, unexpected };
check('12. jaringan hanya untuk thumbnail YouTube/favicon tersetujui', unexpected.length === 0,
  JSON.stringify(R.notes.network));

// ---------- Criterion 11 + screenshots ----------
await navFresh(APP);
await sleep(400);
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Page.reload', {}); await sleep(1600);
const small = await evaluate(`({
  innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  columns: getComputedStyle(document.getElementById('grid')).gridTemplateColumns.split(' ').length,
  cards: document.querySelectorAll('.card').length,
  cardRoles: [...document.querySelectorAll('.card')].every(c=>c.getAttribute('role')==='button' && c.tabIndex===0 && c.querySelector('.card-thumb')),
  noOverflowCards: [...document.querySelectorAll('.card')].every(c=>c.scrollWidth <= c.clientWidth+1),
})`);
let shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
(await import('node:fs')).writeFileSync(OUT390, Buffer.from(shot.result.data, 'base64'));

await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.reload', {}); await sleep(1600);
const large = await evaluate(`({
  innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  columns: getComputedStyle(document.getElementById('grid')).gridTemplateColumns.split(' ').length,
  cards: document.querySelectorAll('.card').length,
})`);
shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
(await import('node:fs')).writeFileSync(OUT1280, Buffer.from(shot.result.data, 'base64'));

R.notes.viewport390 = small;
R.notes.viewport1280 = large;
check('11. 390px tanpa overflow, 1280px grid multi-kolom',
  small.innerWidth === 390 && small.scrollWidth <= 391 && small.columns === 1 && small.cardRoles && small.noOverflowCards &&
  large.columns > 1 && small.cards === 8 && large.cards === 8,
  JSON.stringify({ small, large }));

console.log(JSON.stringify(R, null, 2));
const failed = R.checks.filter((c) => !c.pass);
console.log(`\nRESULT: ${R.checks.length - failed.length}/${R.checks.length} checks pass`);
ws.close();
process.exit(failed.length ? 1 : 0);
