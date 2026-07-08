// 无头 Edge 截图/诊断工具（CDP，无第三方依赖）
// 用法：node scripts/snap.mjs <url> <out.png> [light|dark] [scrollY]
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [, , url, out, mode = 'light', scrollY = '0'] = process.argv;
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const profile = mkdtempSync(join(tmpdir(), 'shiwei-edge-'));

const proc = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'
], { stdio: ['ignore', 'pipe', 'pipe'] });

const wsUrl = await new Promise((res, rej) => {
  let buf = '';
  proc.stderr.on('data', (d) => {
    buf += d;
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) res(m[1]);
  });
  setTimeout(() => rej(new Error('devtools endpoint not found')), 15000);
});

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 0;
const pending = new Map();
const logs = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
  } else if (msg.method === 'Runtime.consoleAPICalled') {
    logs.push(msg.params.type + ': ' + msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
  } else if (msg.method === 'Runtime.exceptionThrown') {
    const ex = msg.params.exceptionDetails;
    logs.push('EXCEPTION: ' + (ex.exception?.description || ex.text || '').slice(0, 600));
  }
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const m = { id: ++id, method, params };
  if (sessionId) m.sessionId = sessionId;
  pending.set(m.id, { res, rej });
  ws.send(JSON.stringify(m));
});

try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, sessionId);
  await send('Page.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, sessionId);
  if (mode === 'dark') await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] }, sessionId);
  await send('Page.navigate', { url }, sessionId);

  let stateVal = '';
  for (let i = 0; i < 60; i++) {
    const r = await send('Runtime.evaluate', {
      expression: "document.documentElement.getAttribute('data-app-ready') ? 'READY' : (document.documentElement.getAttribute('data-app-error') || '')",
      returnByValue: true
    }, sessionId);
    stateVal = r.result.value;
    if (stateVal) break;
    await new Promise((r2) => setTimeout(r2, 200));
  }
  if (+scrollY > 0) {
    await send('Runtime.evaluate', { expression: `window.scrollTo(0, ${+scrollY})` }, sessionId);
  }
  await new Promise((r2) => setTimeout(r2, 500));
  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  await writeFile(out, Buffer.from(shot.data, 'base64'));
  console.log('STATE:', stateVal || 'TIMEOUT');
  console.log('LOGS:', logs.length ? '\n' + logs.join('\n') : '(none)');
} catch (e) {
  console.error('SNAP-FAIL:', e.message);
  console.log('LOGS:', logs.length ? '\n' + logs.join('\n') : '(none)');
} finally {
  proc.kill();
  process.exit(0);
}
