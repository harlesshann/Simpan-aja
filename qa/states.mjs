import { writeFileSync } from 'node:fs';
const PORT = Number(process.env.PORT || 9225);
const WIDTH = Number(process.env.VW || 390);

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const t = list.find((x) => x.type === 'page' && x.webSocketDebuggerUrl);
      if (t) return t;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('no target');
}
const page = await target();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evl = (expression) => send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 844, deviceScaleFactor: 2, mobile: WIDTH < 600 });
await sleep(1500);

async function shot(file) {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(file, Buffer.from(s.result.data, 'base64'));
  console.log('saved', file);
}

const pick = `const findBtn=(c,t)=>[...c.querySelectorAll('button')].find(b=>b.textContent===t);`;

await evl(`(()=>{const c=[...document.querySelectorAll('.card')].find(x=>(x.querySelector('.card-url')||{}).textContent?.includes('youtube'));${pick}findBtn(c,'Preview').click();})()`);
await sleep(500); await shot('qa/task10-preview.png');

await evl(`document.querySelector('.preview-close').click()`);
await sleep(300);
await evl(`(()=>{const c=[...document.querySelectorAll('.card')].find(x=>x.textContent.includes('threads.com'));${pick}findBtn(c,'Preview').click();})()`);
await sleep(500); await shot('qa/task10-fallback.png');

await evl(`document.querySelector('.preview-close').click()`);
await sleep(200);
await evl(`document.getElementById('btnAdd').click()`);
await sleep(400); await shot('qa/task8-form.png');

await evl(`document.getElementById('bookmarkDialog').close()`);
await sleep(200);
await evl(`document.getElementById('btnManageCollections').click()`);
await sleep(400); await shot('qa/task9-collections.png');

ws.close();
