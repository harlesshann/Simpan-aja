// Criterion 9: real export download -> wipe -> import restore -> duplicate summary.
import { readdirSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = 9222;
const APP = 'http://localhost:8000/';
const DIR = resolve('qa/downloads');

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
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
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

rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DIR });

// Seed a known dataset, then reload so export reads it from IndexedDB.
await send('Storage.clearDataForOrigin', { origin: 'http://localhost:8000', storageTypes: 'indexeddb' });
await navFresh(APP);
await evaluate(`(async()=>{
  const m = await import('/src/db.js');
  const t = (d) => new Date(d).toISOString();
  await m.putCollection({ id:'c1', name:'Koleksi Satu', createdAt:t('2026-10-01T00:00:00Z') });
  await m.putBookmark({ id:'b1', title:'Video Lama', type:'video', url:'https://youtu.be/x1', command:null, collectionId:'c1', note:'n1', createdAt:t('2026-10-02T00:00:00Z'), updatedAt:t('2026-10-02T00:00:00Z') });
  await m.putBookmark({ id:'b2', title:'Situs Baru', type:'website', url:'https://example.com/a', command:null, collectionId:null, note:'', createdAt:t('2026-10-03T00:00:00Z'), updatedAt:t('2026-10-03T00:00:00Z') });
  await m.putBookmark({ id:'b3', title:'Command', type:'command', url:null, command:'ls -la', collectionId:'c1', note:'', createdAt:t('2026-10-04T00:00:00Z'), updatedAt:t('2026-10-04T00:00:00Z') });
  return 1;
})()`);
await navFresh(APP);

const R = {};
await evaluate(`document.getElementById('btnExport').click()`);
let files = [];
for (let i = 0; i < 40; i++) {
  files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
  if (files.length) break;
  await sleep(150);
}
R.downloaded = files;
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
R.expectedName = `simpanaja-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
R.nameOk = files[0] === R.expectedName;

const text = files[0] ? readFileSync(resolve(DIR, files[0]), 'utf8') : '';
let data = null;
try { data = JSON.parse(text); } catch {}
R.formatOk = data?.app === 'SimpanAja' && data?.version === 1 &&
  data.collections?.length === 1 && data.bookmarks?.length === 3 &&
  data.bookmarks.every((b) => b.id && b.createdAt && b.updatedAt && 'url' in b && 'command' in b);

// wipe -> import -> restore
await send('Storage.clearDataForOrigin', { origin: 'http://localhost:8000', storageTypes: 'indexeddb' });
await navFresh(APP);
R.afterWipe = await evaluate(`document.querySelectorAll('.card').length`);

R.restore = await evaluate(`(async()=>{
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const text = ${JSON.stringify(text)};
  const toastText = ()=>document.getElementById('toast').textContent;
  const doImport = async (t)=>{
    const dt = new DataTransfer();
    dt.items.add(new File([t], 'backup.json', { type:'application/json' }));
    const inp = document.getElementById('importFile');
    inp.files = dt.files;
    inp.dispatchEvent(new Event('change', { bubbles:true }));
    await sleep(350);
    return toastText();
  };
  const first = await doImport(text);
  const db = await import('/src/db.js');
  const bs = await db.listBookmarks();
  const cs = await db.listCollections();
  const second = await doImport(text);
  return {
    first, second,
    bookmarks: bs.length, collections: cs.length,
    order: bs.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(b=>b.title),
    createdAtKept: bs.find(b=>b.title==='Video Lama')?.createdAt === '2026-10-02T00:00:00.000Z',
    cards: document.querySelectorAll('.card').length,
  };
})()`);

R.pass = R.nameOk && R.formatOk && R.afterWipe === 0 &&
  R.restore.bookmarks === 3 && R.restore.collections === 1 &&
  R.restore.createdAtKept && R.restore.cards === 3 &&
  /^Import selesai: 3 ditambahkan, 0 dilewati \(duplikat\), 1 Koleksi baru dibuat\.$/.test(R.restore.first) &&
  /^Import selesai: 0 ditambahkan, 3 dilewati \(duplikat\), 0 Koleksi baru dibuat\.$/.test(R.restore.second);

console.log(JSON.stringify(R, null, 2));
console.log(R.pass ? 'RESULT: criterion 9 PASS' : 'RESULT: criterion 9 FAIL');
ws.close();
process.exit(R.pass ? 0 : 1);
