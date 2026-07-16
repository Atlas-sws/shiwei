// 端到端流程测试：新建 → 保存 → 详情 → 收藏 → 做好了 → 搜索 → 删除
// 用法：node scripts/e2e.mjs [url]
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2] || 'http://localhost:8173/';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const profile = mkdtempSync(join(tmpdir(), 'shiwei-e2e-'));
const proc = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'
], { stdio: ['ignore', 'pipe', 'pipe'] });

const wsUrl = await new Promise((res, rej) => {
  let buf = '';
  proc.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); });
  setTimeout(() => rej(new Error('devtools endpoint not found')), 15000);
});
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const pending = new Map();
const exceptions = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    exceptions.push((msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text || '').slice(0, 300));
  }
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const m = { id: ++id, method, params };
  if (sessionId) m.sessionId = sessionId;
  pending.set(m.id, { res, rej });
  ws.send(JSON.stringify(m));
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Runtime.enable', {}, sessionId);
await send('Page.enable', {}, sessionId);
await send('Page.navigate', { url }, sessionId);

async function eval_(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sessionId);
  if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(expr, desc, timeout = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await eval_(expr)) return;
    await sleep(150);
  }
  throw new Error('timeout waiting: ' + desc);
}
let passed = 0, failed = 0;
async function check(name, expr) {
  const ok = await eval_(expr);
  if (ok) { passed++; console.log('PASS', name); }
  else { failed++; console.log('FAIL', name, '<-', expr); }
}

try {
  await waitFor("document.documentElement.hasAttribute('data-app-ready')", 'app ready');
  await check('种子菜谱=3', 'state.recipes.length === 3');

  // 新建菜谱
  await eval_("location.hash = '#/new'");
  await waitFor("!!document.querySelector('#f-title')", 'edit form');
  await eval_(`
    (() => {
      const set = (sel, v) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); };
      set('#f-title', '测试红烧肉');
      set('#f-intro', '端到端测试用菜谱');
      set('#f-time', '90');
      set('#f-servings', '4人份');
      const ing = document.querySelectorAll('#ing-rows .ing-row');
      const setIn = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); };
      setIn(ing[0].querySelector('.name'), '五花肉');
      setIn(ing[0].querySelector('.amt'), '500g');
      const ta = document.querySelector('#step-rows textarea');
      setIn(ta, '肉切块焯水，炒糖色，小火炖一小时。');
      return true;
    })()
  `);
  await eval_("document.querySelector('#btn-save').click()");
  await waitFor("location.hash.startsWith('#/r/') && state.recipes.length === 4", '保存并跳转详情');
  await check('新菜谱已入库', "state.recipes.some(r => r.title === '测试红烧肉' && r.timeMinutes === 90 && r.ingredients.length === 1)");
  await check('详情标题渲染', "document.querySelector('.detail-head h1')?.textContent === '测试红烧肉'");

  // 收藏 + 做好了
  await eval_("document.querySelector('#act-fav').click()");
  await waitFor("state.recipes.find(r => r.title === '测试红烧肉')?.favorite === true", '收藏生效');
  passed++; console.log('PASS 收藏生效');
  await eval_("document.querySelector('#act-cook').click()");
  await waitFor("state.recipes.find(r => r.title === '测试红烧肉')?.cookCount === 1", '做好了+1');
  passed++; console.log('PASS 做好了计数');

  // 搜索
  await eval_("location.hash = '#/'");
  await waitFor("!!document.querySelector('#search')", '回到首页');
  await eval_("(() => { const s = document.querySelector('#search'); s.value = '五花肉'; s.dispatchEvent(new Event('input', {bubbles:true})); })()");
  await sleep(500);
  await check('按食材搜索命中1条', "document.querySelectorAll('#grid-area .card').length === 1");
  await eval_("(() => { const s = document.querySelector('#search'); s.value = ''; s.dispatchEvent(new Event('input', {bubbles:true})); })()");
  await sleep(500);

  // 收藏筛选
  await eval_("document.querySelector('[data-fav]').click()");
  await sleep(300);
  await check('收藏筛选命中1条', "document.querySelectorAll('#grid-area .card').length === 1");

  // 删除
  const rid = await eval_("state.recipes.find(r => r.title === '测试红烧肉').id");
  await eval_(`location.hash = '#/r/${rid}'`);
  await waitFor("!!document.querySelector('#act-more')", '详情页');
  await eval_("document.querySelector('#act-more').click()");
  await waitFor("!!document.querySelector('[data-key=\"del\"]')", '操作菜单');
  await eval_("document.querySelector('[data-key=\"del\"]').click()");
  await waitFor("!!document.querySelector('[data-act=\"ok\"]')", '确认弹窗');
  await eval_("document.querySelector('[data-act=\"ok\"]').click()");
  await waitFor("state.recipes.length === 3 && (location.hash === '#/' || location.hash === '')", '删除后回首页');
  passed++; console.log('PASS 删除流程');

  // 备份导出的数据完整性（不触发下载，直接校验打包函数用到的数据）
  await check('图片库无泄漏残留', "dbGetAll('images').then(a => a.length === 0)");

  // 买菜清单：解析器 + 模糊合并 + 聚合（纯函数）
  await check('解析 2汤匙', "parseAmount('2 汤匙')?.qty === 2 && parseAmount('2 汤匙')?.unit === '汤匙'");
  await check('解析 半茶匙=0.5', "parseAmount('半茶匙')?.qty === 0.5");
  await check('解析 适量→null', "parseAmount('适量') === null");
  await check('解析 带括号→null', "parseAmount('2个（约400g）') === null");
  await check('模糊合并 油=食用油', "canonicalGood('油') === canonicalGood('食用油')");
  await check('模糊合并 香油≠食用油', "canonicalGood('香油') !== canonicalGood('食用油')");
  await check('聚合 食用油=3汤匙', `(() => {
    const ids = state.recipes.filter(r => ['番茄炒蛋','可乐鸡翅'].includes(r.title)).map(r => r.id);
    const oil = buildShoppingList(ids).find(i => i.name === '食用油');
    return !!oil && oil.summed.join('+') === '3汤匙';
  })()`);
  await check('常备分栏 盐→staple', "buildShoppingList(state.recipes.map(r => r.id)).find(i => i.name === '盐')?.staple === true");
  await check('常备分栏 食用油→staple', "buildShoppingList(state.recipes.map(r => r.id)).find(i => i.name === '食用油')?.staple === true");
  await check('常备分栏 番茄→非staple', "buildShoppingList(state.recipes.map(r => r.id)).find(i => i.name === '番茄')?.staple === false");
  await check('常备分栏 小葱→staple(含葱姜蒜)', "buildShoppingList(state.recipes.map(r => r.id)).find(i => i.name === '小葱')?.staple === true");
  await check('复制文本分两段', "(() => { const t = shoppingListToText(buildShoppingList(state.recipes.map(r => r.id)), new Set()); return t.includes('主清单') && t.includes('常备调料（家里通常有）'); })()");

  // 买菜清单：选菜 → 生成 → 勾选 → 持久化 → 重开仍在
  await eval_("location.hash = '#/shop'");
  await waitFor("!!document.querySelector('.pick-list')", '买菜页');
  await eval_(`(() => {
    const want = new Set(state.recipes.filter(r => ['番茄炒蛋','可乐鸡翅'].includes(r.title)).map(r => r.id));
    document.querySelectorAll('.pick-item').forEach(b => { if (want.has(b.dataset.id)) b.click(); });
  })()`);
  await waitFor("document.querySelectorAll('#shop-list .shop-item, #staple-list .shop-item').length > 0", '清单生成');
  await check('食用油 落常备栏·3汤匙', "(() => { const li = document.querySelector('#staple-list .shop-item[data-good=\"食用油\"]'); return !!li && /3汤匙/.test(li.querySelector('.ing-amt') ? li.querySelector('.ing-amt').textContent : ''); })()");
  await check('番茄 落主清单', "!!document.querySelector('#shop-list .shop-item[data-good=\"番茄\"]')");
  await eval_("document.querySelector('#staple-list .shop-item[data-good=\"食用油\"]').click()");
  await waitFor("dbGet('meta','shoppingList').then(r => !!r && r.value.checked.includes('食用油'))", '勾选持久化');
  await eval_("location.hash = '#/'");
  await waitFor("!!document.querySelector('#search')", '回首页');
  await eval_("location.hash = '#/shop'");
  await waitFor("!!document.querySelector('.pick-list')", '再入买菜页');
  await check('选择持久化(2道)', "document.querySelectorAll('.pick-item.on').length === 2");
  await check('勾选持久化(渲染)', "!!document.querySelector('#staple-list .shop-item[data-good=\"食用油\"].done')");

  // 买菜清单：手动添加项（填名+量 → 入库 → 勾选 → 删除）
  await eval_("document.querySelector('#add-manual').click()");
  await waitFor("!document.querySelector('#manual-form').classList.contains('hidden')", '手动表单展开');
  await eval_(`(() => {
    const nm = document.querySelector('#manual-name'); nm.value = '垃圾袋';
    const am = document.querySelector('#manual-amt'); am.value = '1卷';
    document.querySelector('#manual-add').click();
  })()`);
  await waitFor("[...document.querySelectorAll('#manual-list .shop-item')].some(li => li.querySelector('.ing-name').textContent === '垃圾袋')", '手动项已添加');
  await check('手动项含数量', "[...document.querySelectorAll('#manual-list .shop-item')].some(li => li.querySelector('.ing-name').textContent === '垃圾袋' && /1卷/.test(li.querySelector('.ing-amt') ? li.querySelector('.ing-amt').textContent : ''))");
  await check('手动项持久化', "dbGet('meta','shoppingList').then(r => !!r && (r.value.manualItems || []).some(m => m.name === '垃圾袋' && m.amount === '1卷'))");
  await check('复制含手动项(主清单段)', "(() => { const t = shoppingListToText(buildShoppingList([]), new Set(), [{ id: 'x', name: '垃圾袋', amount: '1卷', done: false }]); return t.includes('主清单') && t.includes('垃圾袋'); })()");
  await eval_("[...document.querySelectorAll('#manual-list .shop-item')].find(li => li.querySelector('.ing-name').textContent === '垃圾袋').click()");
  await waitFor("dbGet('meta','shoppingList').then(r => !!r && (r.value.manualItems || []).some(m => m.name === '垃圾袋' && m.done === true))", '手动项勾选持久化');
  await eval_("[...document.querySelectorAll('#manual-list .shop-item')].find(li => li.querySelector('.ing-name').textContent === '垃圾袋').querySelector('[data-del-manual]').click()");
  await waitFor("[...document.querySelectorAll('#manual-list .shop-item')].every(li => li.querySelector('.ing-name').textContent !== '垃圾袋')", '手动项已删除');
  await check('删除后持久化清除', "dbGet('meta','shoppingList').then(r => !!r && !(r.value.manualItems || []).some(m => m.name === '垃圾袋'))");

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  if (exceptions.length) console.log('PAGE EXCEPTIONS:\n' + exceptions.join('\n'));
  process.exitCode = failed || exceptions.length ? 1 : 0;
} catch (e) {
  console.error('E2E-ABORT:', e.message);
  if (exceptions.length) console.log('PAGE EXCEPTIONS:\n' + exceptions.join('\n'));
  process.exitCode = 1;
} finally {
  proc.kill();
}
