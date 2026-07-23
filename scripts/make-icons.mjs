// 生成拾味应用图标：线装书封面 + 竖排题签「拾味」
// 用无头 Edge 渲染 CSS（零依赖），输出 512 / 192 / 180 三个尺寸的方形 PNG
// 用法：node scripts/make-icons.mjs
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const outDir = resolve('docs/icons');
const SIZES = [512, 192, 180];

// 设计稿基于 220px 见方，全部尺寸按比例换算；输出方形满幅，圆角交给系统遮罩
const html = (s) => `
<style>
  html,body { margin:0; padding:0; background:transparent; }
  .ic { width:${s}px; height:${s}px; position:relative; overflow:hidden;
        background:linear-gradient(150deg,#ca5830,#8f3216); }
  .stitch { position:absolute; left:${s * 0.091}px; top:0; bottom:0;
            display:flex; flex-direction:column; justify-content:center; gap:${s * 0.118}px; }
  .stitch i { display:block; width:${s * 0.032}px; height:${s * 0.032}px;
              border-radius:50%; background:rgba(255,244,235,.5); }
  .label { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
           writing-mode:vertical-rl; white-space:nowrap;
           background:#f7f0e4; color:#a8401c; border-radius:${s * 0.032}px;
           font-family:KaiTi,STKaiti,SimSun,serif; font-weight:700;
           font-size:${s * 0.264}px; letter-spacing:.16em; line-height:1;
           padding:${s * 0.109}px ${s * 0.064}px ${s * 0.082}px;
           box-shadow:0 ${s * 0.009}px ${s * 0.036}px rgba(60,25,10,.28); }
</style>
<div class="ic"><div class="stitch"><i></i><i></i><i></i></div><div class="label">拾味</div></div>`;

const profile = mkdtempSync(join(tmpdir(), 'shiwei-icon-'));
const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'pipe', 'pipe'] });
const wsUrl = await new Promise((res, rej) => {
  let b = '';
  proc.stderr.on('data', (d) => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); });
  setTimeout(() => rej(new Error('devtools endpoint not found')), 15000);
});
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  }
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const m = { id: ++id, method, params };
  if (sessionId) m.sessionId = sessionId;
  pending.set(m.id, { res, rej });
  ws.send(JSON.stringify(m));
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  await mkdir(outDir, { recursive: true });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  for (const s of SIZES) {
    await send('Emulation.setDeviceMetricsOverride', { width: s, height: s, deviceScaleFactor: 1, mobile: false }, sessionId);
    await send('Page.setDocumentContent', { frameId: targetId, html: html(s) }, sessionId);
    await sleep(350);
    const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    const path = join(outDir, `icon-${s}.png`);
    await writeFile(path, Buffer.from(shot.data, 'base64'));
    console.log('generated', path);
  }
  console.log('\n提示：图标在 sw.js 的缓存清单里，改完记得 bump docs/sw.js 的 VERSION');
} catch (e) {
  console.error('ICON-FAIL:', e.message);
  process.exitCode = 1;
} finally {
  proc.kill();
  process.exit(process.exitCode || 0);
}
