// QA gambar kustom: pilih file lokal, prioritas tampil, persist, hapus, export.
// Prasyarat: server `py serve.py` di :8000 dan Chrome headless CDP di :9222.
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
const nav = async (url) => { await send('Page.navigate', { url }); await sleep(1600); };

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Storage.clearDataForOrigin', { origin: 'http://localhost:8000', storageTypes: 'indexeddb' });
await nav(APP);

const R = { checks: [], notes: {} };
const check = (name, pass, detail) => {
  console.log(`[check] ${pass ? 'ok  ' : 'FAIL'} ${name}`);
  R.checks.push({ name, pass: !!pass, detail });
};

// 1. Simpan dengan gambar file lokal -> kartu memakai data URL.
const added = await evaluate(`(async()=>{
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const q=s=>document.querySelector(s);
  const png = await new Promise(res=>{ const c=document.createElement('canvas'); c.width=600;c.height=400; const x=c.getContext('2d'); x.fillStyle='#e91e63'; x.fillRect(0,0,600,400); x.fillStyle='#fff'; x.font='bold 80px sans-serif'; x.fillText('QA',40,140); c.toBlob(b=>res(b),'image/png'); });
  if(!png) return { __error:'canvas toBlob null' };
  const file = new File([png],'qa.png',{type:'image/png'});
  q('#btnAdd').click(); await sleep(50);
  q('#fTitle').value='Dengan gambar';
  q('#fType').value='website'; q('#fType').dispatchEvent(new Event('change',{bubbles:true}));
  q('#fUrl').value='https://web.dev/learn/css'; q('#fUrl').dispatchEvent(new Event('input',{bubbles:true}));
  const dt=new DataTransfer(); dt.items.add(file); q('#fImage').files=dt.files; q('#fImage').dispatchEvent(new Event('change',{bubbles:true}));
  for(let i=0;i<60 && q('#fImagePreview').hidden;i++) await sleep(50);
  const preview = !q('#fImagePreview').hidden;
  const previewSrc = q('#fImageThumb').getAttribute('src') || '';
  q('#bookmarkForm').requestSubmit(); await sleep(180);
  const card=[...document.querySelectorAll('.card')].find(c=>c.querySelector('.card-title')?.textContent==='Dengan gambar');
  const src = card?.querySelector('.card-thumb-img')?.getAttribute('src') || '';
  return { preview, previewWebp:/^data:image\\/webp;base64,/.test(previewSrc), closed:!q('#bookmarkDialog').open, srcHead:src.slice(0,24), srcLen:src.length };
})()`);
R.notes.added = added;
check('1. pilih gambar lokal -> pratinjau + kartu pakai data URL webp', added && added.preview && added.previewWebp && added.closed && /^data:image\/webp;base64,/.test(added.srcHead || ''), JSON.stringify(added));

{ const shot = await send('Page.captureScreenshot', { format: 'png' }); (await import('node:fs')).writeFileSync('qa/manual-image.png', Buffer.from(shot.result.data, 'base64')); }

// 2. File non-gambar ditolak dengan pesan.
const rejected = await evaluate(`(async()=>{
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const q=s=>document.querySelector(s);
  q('#btnAdd').click(); await sleep(50);
  const dt=new DataTransfer(); dt.items.add(new File(['halo'],'catatan.txt',{type:'text/plain'}));
  q('#fImage').files=dt.files; q('#fImage').dispatchEvent(new Event('change',{bubbles:true}));
  for(let i=0;i<20 && q('#formError').hidden;i++) await sleep(50);
  const err = q('#formError').hidden ? '' : q('#formError').textContent;
  q('#btnCancelForm').click();
  return err;
})()`);
R.notes.rejected = rejected;
check('2. file non-gambar ditolak + pesan error', typeof rejected === 'string' && rejected.includes('Format gambar'), String(rejected));

// 3. Export JSON membawa gambar.
const exported = await evaluate(`(async()=>{
  const db=await import('/src/db.js'); const bk=await import('/src/backup.js');
  const bms=await db.listBookmarks();
  const data=bk.buildExport({bookmarks:bms,collections:[]}).data;
  const withImg=data.bookmarks.find(b=>b.title==='Dengan gambar');
  return { total:data.bookmarks.length, hasImage:!!withImg && /^data:image\\/webp;base64,/.test(withImg.image||'') };
})()`);
R.notes.exported = exported;
check('3. export JSON memuat gambar kustom', exported && exported.total === 1 && exported.hasImage, JSON.stringify(exported));

// 4. Bertahan setelah reload (IndexedDB).
await nav(APP);
const persisted = await evaluate(`(()=>{
  const card=[...document.querySelectorAll('.card')].find(c=>c.querySelector('.card-title')?.textContent==='Dengan gambar');
  const src=card?.querySelector('.card-thumb-img')?.getAttribute('src')||'';
  return { head:src.slice(0,24), len:src.length };
})()`);
R.notes.persisted = persisted;
check('4. gambar tetap ada setelah reload', /^data:image\/webp;base64,/.test(persisted?.head || ''), JSON.stringify(persisted));

// 5. Edit -> Hapus gambar -> kartu kembali ke favicon situs.
await evaluate(`(async()=>{
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const q=s=>document.querySelector(s);
  [...document.querySelectorAll('.card')].find(c=>c.querySelector('.card-title')?.textContent==='Dengan gambar').click();
  await sleep(120);
  return !q('#detailPage').hidden;
})()`);
{ const shot = await send('Page.captureScreenshot', { format: 'png' }); (await import('node:fs')).writeFileSync('qa/manual-detail.png', Buffer.from(shot.result.data, 'base64')); }

const cleared = await evaluate(`(async()=>{
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const q=s=>document.querySelector(s);
  const find=()=>[...document.querySelectorAll('.card')].find(c=>c.querySelector('.card-title')?.textContent==='Dengan gambar');
  [...document.querySelectorAll('#detailPage .btn')].find(b=>b.textContent.trim()==='Edit').click();
  await sleep(80);
  const preEdit = !q('#fImagePreview').hidden;
  q('#btnClearImage').click(); await sleep(30);
  q('#bookmarkForm').requestSubmit(); await sleep(180);
  const after = find()?.querySelector('.card-thumb-img')?.getAttribute('src') || '';
  return { preEdit, closed:!q('#bookmarkDialog').open, after };
})()`);
R.notes.cleared = cleared;
check('5. edit memuat gambar lalu Hapus -> kembali ke favicon', cleared && cleared.preEdit && cleared.closed && /^https:\/\/www\.google\.com\/s2\/favicons\?domain=web\.dev/.test(cleared.after || ''), JSON.stringify(cleared));

console.log(JSON.stringify(R, null, 2));
const failed = R.checks.filter((c) => !c.pass);
console.log(`\nRESULT: ${R.checks.length - failed.length}/${R.checks.length} checks pass`);
ws.close();
process.exit(failed.length ? 1 : 0);
