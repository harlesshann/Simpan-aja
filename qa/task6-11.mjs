// QA driver: Task 6 (IndexedDB persistence) + Task 11 (Muse #add=, export/import).
const PORT = 9222;
const APP = 'http://localhost:8000/';

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

const R = {};

// --- clean slate: clear IndexedDB for the origin, then load the app ---
await send('Storage.clearDataForOrigin', { origin: 'http://localhost:8000', storageTypes: 'indexeddb' });
R.wiped = true;
await navFresh(APP);

// --- Task 6: CRUD + cascade delete ---
R.t6 = await evaluate(`(async()=>{
  const m = await import('/src/db.js');
  const now = new Date().toISOString();
  await m.putCollection({ id:'c-smoke', name:'Smoke', createdAt:now });
  await m.putBookmark({ id:'b-smoke', title:'Item Uji', type:'command', url:null, command:'ls -la', collectionId:'c-smoke', note:'', createdAt:now, updatedAt:now });
  const b1 = (await m.listBookmarks()).length, c1 = (await m.listCollections()).length;
  await m.deleteCollectionAndDetach('c-smoke');
  const bs = await m.listBookmarks(), cs = await m.listCollections();
  return { b1, c1, c2: cs.length, kept: bs.length, detached: bs[0].collectionId === null };
})()`);

// --- persistence across reload ---
await navFresh(APP);
R.persist = await evaluate(`(async()=>{ const m = await import('/src/db.js'); return { b:(await m.listBookmarks()).length, c:(await m.listCollections()).length }; })()`);

// --- Task 11: import (restore into empty), duplicate import, junk import ---
R.importFlow = await evaluate(`(async()=>{
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  const { buildExport } = await import('/src/backup.js');
  const db = await import('/src/db.js');
  await db.deleteBookmark('b-smoke');
  const now = new Date().toISOString();
  const text = JSON.stringify(buildExport({
    collections:[{ id:'c-x', name:'Motion', createdAt:now }],
    bookmarks:[{ id:'b-x', title:'Video A', type:'video', url:'https://youtu.be/x1', command:null, collectionId:'c-x', note:'', createdAt:now, updatedAt:now }],
  }).data);
  const toastText = () => document.getElementById('toast').textContent;
  const doImport = async (t) => {
    const dt = new DataTransfer();
    dt.items.add(new File([t], 'backup.json', { type:'application/json' }));
    const inp = document.getElementById('importFile');
    inp.files = dt.files;
    inp.dispatchEvent(new Event('change', { bubbles:true }));
    await sleep(350);
    return toastText();
  };
  const first = await doImport(text);
  const second = await doImport(text);
  const beforeJunk = (await db.listBookmarks()).length;
  const junk = await doImport('ini bukan json');
  const afterJunk = (await db.listBookmarks()).length;
  return { first, second, junk, unchanged: beforeJunk === afterJunk };
})()`);

// --- Task 11: Muse #add= branches ---
const good = await evaluate(`(async()=>{ const { encodeAddPayload } = await import('/src/codec.js'); return encodeAddPayload({ v:1, title:'Video Muse', url:'https://youtu.be/x1', type:'video', collection:'Motion Link', note:'catatan' }); })()`);
await navFresh(APP + '#add=' + good);
R.addGood = await evaluate(`({
  dialogOpen: document.getElementById('bookmarkDialog').open,
  title: document.getElementById('fTitle').value,
  type: document.getElementById('fType').value,
  collectionPick: document.getElementById('fCollection').value,
  newCollection: document.getElementById('fNewCollection').value,
  hashCleared: location.hash === '',
})`);

// cancel must not persist the suggested collection
await evaluate(`document.getElementById('btnCancelForm').click()`);
await sleep(150);
R.addCancel = await evaluate(`(async()=>{ const m = await import('/src/db.js'); const cs = await m.listCollections(); return { collections: cs.length, hasMotionLink: cs.some(c=>c.name==='Motion Link') }; })()`);

await navFresh(APP + '#add=!!!bukan-base64!!!');
R.addBroken = await evaluate(`({ dialogOpen: document.getElementById('bookmarkDialog').open, error: document.getElementById('formError').textContent, hashCleared: location.hash === '' })`);

const tooLong = await evaluate(`(async()=>{
  const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const json = JSON.stringify({ v:1, title:'X', type:'command', command:'ls -la', note:'n'.repeat(2100) });
  const bytes = new TextEncoder().encode(json); let out='';
  for (let i=0;i<bytes.length;i+=3){const b0=bytes[i],b1=bytes[i+1],b2=bytes[i+2];
    out+=B64[b0>>2]; out+=B64[((b0&3)<<4)|(b1===undefined?0:b1>>4)];
    if(b1!==undefined) out+=B64[((b1&15)<<2)|(b2===undefined?0:b2>>6)];
    if(b2!==undefined) out+=B64[b2&63];}
  return out;
})()`);
await navFresh(APP + '#add=' + tooLong);
R.addTooLong = await evaluate(`({ dialogOpen: document.getElementById('bookmarkDialog').open, error: document.getElementById('formError').textContent, hashCleared: location.hash === '' })`);

console.log(JSON.stringify(R, null, 2));
ws.close();
