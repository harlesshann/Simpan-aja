const PORT = Number(process.env.PORT || 9223);
const WIDTH = Number(process.env.VW || 390);
const HEIGHT = Number(process.env.VH || 844);
const OUT = process.env.OUT || 'qa/shot.png';

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

await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.reload', { ignoreCache: true });
await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: WIDTH < 600 });
await new Promise((r) => setTimeout(r, 1500));
const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
const { writeFileSync } = await import('node:fs');
writeFileSync(OUT, Buffer.from(shot.result.data, 'base64'));
console.log('saved', OUT);
ws.close();
