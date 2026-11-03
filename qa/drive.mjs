// One-off QA driver: drives the page over CDP and prints a result JSON.
const PORT = 9222;

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

let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
};
const send = (method, params = {}) =>
  new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) return { error: r.result.exceptionDetails.exception?.description || 'exception' };
  return r.result?.result?.value;
}

const WIDTH = Number(process.env.VW || 0);
if (WIDTH) {
  await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 844, deviceScaleFactor: 2, mobile: WIDTH < 600 });
  await send('Page.reload', {});
  await new Promise((r) => setTimeout(r, 1400));
}

await new Promise((r) => setTimeout(r, 1200)); // let modules + async render settle

const script = `(async () => {
  const R = {};
  const q = (s) => document.querySelector(s);
  const cards = () => document.querySelectorAll('.card').length;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const findBtn = (card, txt) => [...card.querySelectorAll('button')].find((b) => b.textContent === txt);

  R.innerWidth = innerWidth;
  R.scrollWidth = document.documentElement.scrollWidth;
  R.overflowX = document.documentElement.scrollWidth > innerWidth + 1;
  R.cardsAll = cards();

  const s = q('#search'); s.value = 'ffmpeg'; s.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(40); R.searchFfmpeg = cards();
  s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); await sleep(40);

  q('[data-type="command"]').click(); await sleep(40); R.chipCommand = cards();
  q('[data-type="all"]').click(); await sleep(40);

  q('[data-collection="none"]').click(); await sleep(40); R.collectionNone = cards();
  q('[data-collection="all"]').click(); await sleep(40);

  const yt = [...document.querySelectorAll('.card')].find((c) => (c.querySelector('.card-url')||{}).textContent?.includes('youtube'));
  findBtn(yt, 'Preview').click(); await sleep(60);
  R.previewYtIframe = !!q('#previewPopup iframe');
  R.previewYtSrc = q('#previewPopup iframe')?.src || null;
  q('.preview-close').click(); await sleep(40);
  R.previewEmbedRemoved = !q('#previewPopup iframe') && q('#previewPopup').hidden;

  const th = [...document.querySelectorAll('.card')].find((c) => c.textContent.includes('threads.com'));
  findBtn(th, 'Preview').click(); await sleep(60);
  R.fallbackNoIframe = !q('#previewPopup iframe');
  R.fallbackHasSourceBtn = !!q('#previewPopup a[href*="threads"]');
  q('.preview-close').click(); await sleep(30);

  q('#btnAdd').click(); await sleep(40);
  R.dialogOpen = q('#bookmarkDialog').open;
  const fu = q('#fUrl');
  fu.value = 'javascript:alert(1)'; fu.dispatchEvent(new Event('input', { bubbles: true }));
  q('#fTitle').value = 'Tes item';
  q('#bookmarkForm').requestSubmit(); await sleep(40);
  R.badUrlRejected = !q('#formError').hidden;
  R.badUrlMsg = q('#formError').textContent;

  fu.value = 'https://youtu.be/x1'; fu.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(30);
  R.typeGuessedVideo = q('#fType').value;

  q('#fType').value = 'command'; q('#fType').dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(20);
  R.commandRowShown = !q('#commandRow').hidden && q('#urlRow').hidden;
  q('#fType').value = 'website'; q('#fType').dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(20);

  fu.value = 'https://example.com/tes'; fu.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(20);
  q('#bookmarkForm').requestSubmit(); await sleep(60);
  R.cardsAfterAdd = cards();
  R.dialogClosedAfterSave = !q('#bookmarkDialog').open;

  // Esc closes preview (R-32)
  const yt2 = [...document.querySelectorAll('.card')].find((c) => (c.querySelector('.card-url')||{}).textContent?.includes('youtube'));
  findBtn(yt2, 'Preview').click(); await sleep(40);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await sleep(40);
  R.escClosesPreview = q('#previewPopup').hidden;

  R.scrollWidthAfter = document.documentElement.scrollWidth;
  R.consoleOk = true;
  return JSON.stringify(R, null, 2);
})()`;

const out = await evaluate(script);
console.log(typeof out === 'string' ? out : JSON.stringify(out));
ws.close();
