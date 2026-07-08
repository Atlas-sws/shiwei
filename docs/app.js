/* ==========================================================================
   拾味 · 应用主逻辑
   零依赖原生 JS：IndexedDB 本地存储 + hash 路由 + 模板渲染
   ========================================================================== */
'use strict';

/* ---------- 工具 ---------- */
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10));
const appEl = $('#app');

const ICONS = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.08A1.7 1.7 0 0 0 10.1 3.6V3.5a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56h.08a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03h.1a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03z"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  bowl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 11h16c0 3.5-2 6-4.5 7l-.5 2h-6l-.5-2C6 17 4 14.5 4 11z"/><path d="M9 4c-1 1.5 1 2 0 3.5M14 4c-1 1.5 1 2 0 3.5"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s-6 5.6-6 10a6 6 0 0 0 12 0c0-1.8-.8-3.7-2-5.4-.7 1-1.5 1.7-2.3 2C13.4 7.6 12 3 12 3z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z"/></svg>',
  starFill: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="m12 3 2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3.5 20.5 7 8.5 19l-4.5 1 1-4.5z"/></svg>',
  pot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 10h16v4a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z"/><path d="M2 10h20M8 10V8m8 2V8M10 4c-.7 1 .7 1.4 0 2.6M14 4c-.7 1 .7 1.4 0 2.6"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l1 12.2a1.6 1.6 0 0 0 1.6 1.3h5.8a1.6 1.6 0 0 0 1.6-1.3l1-12.2"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 4.5h8L17.5 7h2A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v11m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14V3m0 0 4 4m-4-4L8 7M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8v.5"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0-12L8 7m4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
  chevR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><path d="m9 5 7 7-7 7"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2m0 15v2m9.5-9.5h-2m-15 0h-2m16.2-6.7-1.4 1.4M6.7 17.3l-1.4 1.4m0-13.4 1.4 1.4m10.6 10.6 1.4 1.4"/></svg>',
  emptyBowl: '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M38 16c-3 5 3 8 0 13M50 12c-3 5 3 8 0 13M62 16c-3 5 3 8 0 13"/><path d="M16 46h64c0 13-8 22-17 26l-2 8H35l-2-8c-9-4-17-13-17-26z"/><path d="M30 56c2 5 6 9 10 11"/></svg>'
};

/* ---------- 本地存储层（IndexedDB，失败时退化为内存模式） ---------- */
const DB_NAME = 'shiwei';
let _db = null;
let memMode = false;
const memStores = { recipes: new Map(), images: new Map(), meta: new Map() };

function openDB() {
  return new Promise((resolve, reject) => {
    let req;
    try { req = indexedDB.open(DB_NAME, 1); } catch (e) { reject(e); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('recipes')) db.createObjectStore('recipes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function db() {
  if (memMode) return null;
  if (_db) return _db;
  try { _db = await openDB(); } catch { memMode = true; return null; }
  return _db;
}
const idbReq = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function dbGetAll(store) {
  const d = await db();
  if (memMode) return [...memStores[store].values()];
  return idbReq(d.transaction(store).objectStore(store).getAll());
}
async function dbGet(store, key) {
  const d = await db();
  if (memMode) return memStores[store].get(key);
  return idbReq(d.transaction(store).objectStore(store).get(key));
}
async function dbPut(store, val) {
  const d = await db();
  if (memMode) { memStores[store].set(val.id ?? val.key, val); return; }
  return idbReq(d.transaction(store, 'readwrite').objectStore(store).put(val));
}
async function dbDel(store, key) {
  const d = await db();
  if (memMode) { memStores[store].delete(key); return; }
  return idbReq(d.transaction(store, 'readwrite').objectStore(store).delete(key));
}
async function dbClear(store) {
  const d = await db();
  if (memMode) { memStores[store].clear(); return; }
  return idbReq(d.transaction(store, 'readwrite').objectStore(store).clear());
}
const safeLS = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 忽略 */ } }
};

/* ---------- 图片 ---------- */
const imgURLCache = new Map();
function loadImageEl(src) {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = src; });
}
async function compressImage(file, maxDim = 1440, quality = 0.82) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageEl(url);
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const out = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
    return out || file;
  } catch { return file; } finally { URL.revokeObjectURL(url); }
}
async function saveImageFile(file, maxDim) {
  const blob = await compressImage(file, maxDim);
  const id = 'img-' + uid();
  await dbPut('images', { id, blob });
  return id;
}
async function imageURL(id) {
  if (!id) return null;
  if (imgURLCache.has(id)) return imgURLCache.get(id);
  const rec = await dbGet('images', id);
  if (!rec || !rec.blob) return null;
  const url = URL.createObjectURL(rec.blob);
  imgURLCache.set(id, url);
  return url;
}
async function deleteImage(id) {
  if (!id) return;
  if (imgURLCache.has(id)) { URL.revokeObjectURL(imgURLCache.get(id)); imgURLCache.delete(id); }
  await dbDel('images', id);
}
function hydrateImages(root = appEl) {
  $$('[data-img-id]', root).forEach(async (img) => {
    const url = await imageURL(img.dataset.imgId);
    if (url) img.src = url; else img.closest('.card-cover, .hero')?.classList.add('ph');
  });
}
function pickImageFile(cb) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.hidden = true;
  document.body.append(input);
  input.addEventListener('change', () => { const f = input.files && input.files[0]; input.remove(); if (f) cb(f); });
  input.click();
}

/* ---------- 数据模型 ---------- */
function normalizeRecipe(r) {
  return {
    id: r.id || uid(),
    title: String(r.title || '').slice(0, 60),
    cover: r.cover || null,
    intro: String(r.intro || ''),
    tags: Array.isArray(r.tags) ? r.tags.map((t) => String(t).slice(0, 12)).filter(Boolean).slice(0, 10) : [],
    servings: String(r.servings || ''),
    timeMinutes: Number.isFinite(+r.timeMinutes) && +r.timeMinutes > 0 ? Math.round(+r.timeMinutes) : null,
    difficulty: [1, 2, 3].includes(+r.difficulty) ? +r.difficulty : 2,
    favorite: !!r.favorite,
    ingredients: (Array.isArray(r.ingredients) ? r.ingredients : []).map((i) => ({ name: String(i.name || ''), amount: String(i.amount || '') })),
    steps: (Array.isArray(r.steps) ? r.steps : []).map((s) => ({ text: String(s.text || ''), photo: s.photo || null })),
    tips: String(r.tips || ''),
    createdAt: r.createdAt || Date.now(),
    updatedAt: r.updatedAt || Date.now(),
    cookCount: Number.isFinite(+r.cookCount) ? +r.cookCount : 0,
    lastCookedAt: r.lastCookedAt || null
  };
}

const SEEDS = [
  {
    id: 'seed-1', title: '番茄炒蛋', tags: ['家常菜', '快手', '下饭'], servings: '2人份', timeMinutes: 15, difficulty: 1,
    intro: '示例菜谱 · 国民下饭菜，浓浓茄汁裹着嫩蛋，五分钟学会一辈子受用。',
    ingredients: [
      { name: '番茄', amount: '2 个（约400g）' }, { name: '鸡蛋', amount: '3 个' }, { name: '小葱', amount: '1 根' },
      { name: '盐', amount: '1 茶匙' }, { name: '白糖', amount: '半茶匙' }, { name: '食用油', amount: '2 汤匙' }
    ],
    steps: [
      { text: '番茄顶部划十字，开水烫 1 分钟后撕去外皮，切滚刀块；鸡蛋加一小撮盐打散；小葱切成葱花。' },
      { text: '热锅倒油，油温六成热（筷子插入冒小泡）时倒入蛋液，凝固后用铲子划成大块，盛出备用。' },
      { text: '锅内留底油，下番茄中火翻炒约 2 分钟，炒出红亮的汁水后，加入白糖和剩下的盐。' },
      { text: '倒回鸡蛋，轻轻翻炒半分钟，让每块蛋都裹满茄汁，撒上葱花即可出锅。' }
    ],
    tips: '想要汁多拌饭，可在第 3 步加两汤匙热水；白糖是去酸提鲜的关键，别省略。'
  },
  {
    id: 'seed-2', title: '可乐鸡翅', tags: ['家常菜', '下饭'], servings: '3人份', timeMinutes: 40, difficulty: 2,
    intro: '示例菜谱 · 甜咸油亮，焦糖色全靠一罐可乐，零失败的宴客硬菜。',
    ingredients: [
      { name: '鸡翅中', amount: '8 个' }, { name: '可乐（经典原味）', amount: '330ml' }, { name: '生姜', amount: '3 片' },
      { name: '生抽', amount: '2 汤匙' }, { name: '老抽', amount: '半汤匙' }, { name: '料酒', amount: '1 汤匙' }, { name: '食用油', amount: '1 汤匙' }
    ],
    steps: [
      { text: '鸡翅两面各划一刀方便入味。冷水下锅，加料酒和 1 片姜，水开后再煮 2 分钟，捞出洗净沥干。' },
      { text: '锅里放少许油，小火把鸡翅两面煎到金黄出香。' },
      { text: '倒入可乐没过鸡翅，加生抽、老抽和剩下的姜片，大火烧开后转中小火炖 15 分钟。' },
      { text: '转大火收汁，不停翻动鸡翅，直到汤汁浓稠发亮、能挂在翅上，关火装盘。' }
    ],
    tips: '收汁阶段千万别走开，可乐含糖高极易糊锅；无糖可乐做不出焦糖色，务必用经典原味。'
  },
  {
    id: 'seed-3', title: '紫菜蛋花汤', tags: ['汤羹', '快手'], servings: '2人份', timeMinutes: 10, difficulty: 1,
    intro: '示例菜谱 · 三分钟一碗鲜汤，蛋花嫩滑的秘诀全在火候。',
    ingredients: [
      { name: '干紫菜', amount: '1 小把' }, { name: '鸡蛋', amount: '2 个' }, { name: '虾皮', amount: '1 小撮' },
      { name: '小葱', amount: '1 根' }, { name: '香油', amount: '几滴' }, { name: '盐', amount: '适量' }, { name: '白胡椒粉', amount: '少许' }
    ],
    steps: [
      { text: '紫菜撕成小块放进汤碗，加入虾皮；鸡蛋打散备用；小葱切葱花。' },
      { text: '锅中烧开约 500ml 水，加盐和白胡椒粉调味。' },
      { text: '转小火让水面微沸，画圈缓缓淋入蛋液，蛋花成形后立刻关火。' },
      { text: '把热汤直接冲入放紫菜的碗中，滴几滴香油、撒上葱花即成。' }
    ],
    tips: '蛋液要在水微沸时淋入，大滚的水会把蛋花冲老；紫菜不必下锅煮，冲泡的口感更嫩。'
  }
];

async function ensureSeeds() {
  const flag = await dbGet('meta', 'seeded');
  if (flag) return;
  for (const s of SEEDS) await dbPut('recipes', normalizeRecipe(s));
  await dbPut('meta', { key: 'seeded', value: 1 });
}

/* ---------- 全局状态 ---------- */
const state = {
  recipes: [],
  query: '',
  tag: null,
  favOnly: false,
  checked: {},   // recipeId -> Set(配料下标)
  stepDone: {},  // recipeId -> Set(步骤下标)
  homeScroll: 0,
  prevHash: ''
};
async function loadRecipes() {
  const all = await dbGetAll('recipes');
  state.recipes = all.map(normalizeRecipe).sort((a, b) => b.updatedAt - a.updatedAt);
}
function filteredRecipes() {
  const q = state.query.trim().toLowerCase();
  return state.recipes.filter((r) => {
    if (state.favOnly && !r.favorite) return false;
    if (state.tag && !r.tags.includes(state.tag)) return false;
    if (q) {
      const hay = [r.title, ...r.tags, ...r.ingredients.map((i) => i.name)].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
function collectTags() {
  const count = new Map();
  state.recipes.forEach((r) => r.tags.forEach((t) => count.set(t, (count.get(t) || 0) + 1)));
  return [...count.entries()].sort((a, b) => b[1] - a[1]);
}
const PRESET_TAGS = ['家常菜', '快手', '下饭', '汤羹', '甜点', '早餐', '烘焙', '素食', '肉类', '海鲜', '面食', '凉菜', '夜宵', '待尝试'];

/* ---------- 展示辅助 ---------- */
const HUES = [18, 34, 48, 88, 148, 178, 205, 262, 318, 348];
function phHue(r) {
  let h = 0;
  const s = r.id + r.title;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}
function fmtTime(t) {
  if (!t) return '';
  if (t < 60) return `${t}分钟`;
  const m = t % 60;
  return `${Math.floor(t / 60)}小时${m ? m + '分' : ''}`;
}
const DIFF_LABEL = { 1: '简单', 2: '适中', 3: '费工夫' };

/* ---------- 轻提示 / 弹层 ---------- */
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  $('#toast-root').append(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 320); }, 2300);
}
function closeDialog() {
  const root = $('#dialog-root');
  root.innerHTML = '';
}
function confirmDialog({ title, body, okText = '确定', danger = false }) {
  return new Promise((resolve) => {
    const root = $('#dialog-root');
    root.innerHTML = `
      <div class="dlg-backdrop">
        <div class="dlg">
          <h3>${esc(title)}</h3>
          <div class="body">${esc(body)}</div>
          <div class="btns">
            <button class="btn" data-act="no">取消</button>
            <button class="btn ${danger ? 'danger-solid' : 'primary'}" data-act="ok">${esc(okText)}</button>
          </div>
        </div>
      </div>`;
    root.querySelector('.dlg-backdrop').addEventListener('click', (e) => {
      if (e.target.closest('[data-act="ok"]')) { closeDialog(); resolve(true); }
      else if (e.target.closest('[data-act="no"]') || e.target === e.currentTarget) { closeDialog(); resolve(false); }
    });
  });
}
function actionSheet(items) {
  // items: [{key, label, icon, danger}]
  return new Promise((resolve) => {
    const root = $('#dialog-root');
    root.innerHTML = `
      <div class="dlg-backdrop">
        <div class="dlg">
          ${items.map((it) => `<button class="sheet-item ${it.danger ? 'danger' : ''}" data-key="${esc(it.key)}">${it.icon || ''}<span>${esc(it.label)}</span></button>`).join('')}
          <div class="btns" style="margin-top:14px"><button class="btn" data-key="__cancel">取消</button></div>
        </div>
      </div>`;
    root.querySelector('.dlg-backdrop').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-key]');
      if (btn) { closeDialog(); resolve(btn.dataset.key === '__cancel' ? null : btn.dataset.key); }
      else if (e.target === e.currentTarget) { closeDialog(); resolve(null); }
    });
  });
}
function autogrow(el) {
  const fit = () => { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; };
  el.addEventListener('input', fit);
  requestAnimationFrame(fit);
}

/* ---------- 屏幕常亮 ---------- */
let wakeLock = null;
async function toggleWakeLock() {
  if (wakeLock) {
    try { await wakeLock.release(); } catch { /* 忽略 */ }
    wakeLock = null;
  } else {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; updateWakeChip(); });
      toast('做菜期间屏幕将保持常亮');
    } catch { toast('当前无法开启防熄屏'); }
  }
  updateWakeChip();
}
function updateWakeChip() {
  const chip = $('#wake-chip');
  if (chip) chip.textContent = wakeLock ? '防熄屏 · 开' : '防熄屏';
  if (chip) chip.style.color = wakeLock ? 'var(--accent)' : '';
}
async function releaseWakeLock() {
  if (wakeLock) { try { await wakeLock.release(); } catch { /* 忽略 */ } wakeLock = null; }
}

/* ==========================================================================
   视图：首页
   ========================================================================== */
function isStandalone() {
  return navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
}
function isIOS() {
  return /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function installTipHTML() {
  if (!isIOS() || isStandalone() || safeLS.get('installTipDismissed')) return '';
  return `
    <div class="install-tip" id="install-tip">
      <div>📲 <b>把拾味装进主屏幕：</b>用 Safari 打开本页，点底部分享按钮 ${ICONS.share.replace('<svg', '<svg class="share-ic"')}，选择<b>「添加到主屏幕」</b>，即可像 App 一样使用并离线打开。</div>
      <button class="close" data-close-tip aria-label="关闭">✕</button>
    </div>`;
}
function cardHTML(r) {
  const bits = [];
  if (r.timeMinutes) bits.push(fmtTime(r.timeMinutes));
  bits.push(DIFF_LABEL[r.difficulty]);
  if (r.tags.length) bits.push(r.tags.slice(0, 2).join(' · '));
  const fav = r.favorite ? `<span class="card-fav">★</span>` : '';
  const cover = r.cover
    ? `<div class="card-cover" style="--ph:${phHue(r)}"><img data-img-id="${esc(r.cover)}" alt="">${fav}</div>`
    : `<div class="card-cover ph" style="--ph:${phHue(r)}"><span>${esc(r.title.slice(0, 1))}</span>${fav}</div>`;
  return `<a class="card" href="#/r/${esc(r.id)}">${cover}<div class="card-body"><h3>${esc(r.title)}</h3><p class="card-meta">${esc(bits.join(' · '))}</p></div></a>`;
}
function emptyHTML() {
  const hasAny = state.recipes.length > 0;
  return `
    <div class="empty">
      ${ICONS.emptyBowl}
      <h2>${hasAny ? '没有找到菜谱' : '记下第一道菜'}</h2>
      <p>${hasAny ? '换个关键词或者筛选条件试试' : '点下方按钮，把你的拿手菜<br>一道一道收进这本手册'}</p>
    </div>`;
}
function gridHTML() {
  const list = filteredRecipes();
  return list.length ? `<div class="grid">${list.map(cardHTML).join('')}</div>` : emptyHTML();
}
function chipsHTML() {
  const tags = collectTags();
  const chip = (label, on, data, extra = '') =>
    `<button class="chip ${on ? 'on' : ''}" ${data}>${label}${extra}</button>`;
  return [
    chip('全部', !state.tag && !state.favOnly, 'data-all'),
    chip('★ 收藏', state.favOnly, 'data-fav'),
    ...tags.map(([t, n]) => chip(esc(t), state.tag === t, `data-tag="${esc(t)}"`, ` <span class="n">${n}</span>`))
  ].join('');
}
function renderHome() {
  document.title = '拾味';
  const n = state.recipes.length;
  appEl.innerHTML = `
    <header class="top">
      <div class="brand">
        <span class="brand-mark">拾</span>
        <div><h1>拾味</h1><p class="sub">${n ? `已收录 ${n} 道菜` : '私人菜谱手册'}</p></div>
      </div>
      <a class="icon-btn" href="#/settings" aria-label="设置">${ICONS.settings}</a>
    </header>
    ${installTipHTML()}
    <div class="search-wrap">
      ${ICONS.search}
      <input id="search" type="search" autocomplete="off" placeholder="搜菜名、食材、标签" value="${esc(state.query)}">
      <button class="search-clear ${state.query ? '' : 'hidden'}" id="search-clear" aria-label="清空">✕</button>
    </div>
    <div class="chips" id="chips">${chipsHTML()}</div>
    <div id="grid-area">${gridHTML()}</div>
    <a class="fab" href="#/new">＋ 记一道菜</a>`;
  hydrateImages();

  const refreshGrid = () => { $('#grid-area').innerHTML = gridHTML(); hydrateImages($('#grid-area')); };
  const search = $('#search');
  let deb;
  search.addEventListener('input', () => {
    clearTimeout(deb);
    deb = setTimeout(() => {
      state.query = search.value;
      $('#search-clear').classList.toggle('hidden', !state.query);
      refreshGrid();
    }, 160);
  });
  $('#search-clear').addEventListener('click', () => {
    state.query = ''; search.value = ''; $('#search-clear').classList.add('hidden'); refreshGrid();
  });
  $('#chips').addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    if (btn.hasAttribute('data-all')) { state.tag = null; state.favOnly = false; }
    else if (btn.hasAttribute('data-fav')) { state.favOnly = !state.favOnly; state.tag = null; }
    else { const t = btn.dataset.tag; state.tag = state.tag === t ? null : t; state.favOnly = false; }
    $('#chips').innerHTML = chipsHTML();
    refreshGrid();
  });
  const tip = $('#install-tip');
  if (tip) tip.querySelector('[data-close-tip]').addEventListener('click', () => {
    safeLS.set('installTipDismissed', '1');
    tip.remove();
  });
  requestAnimationFrame(() => window.scrollTo(0, state.homeScroll || 0));
}

/* ==========================================================================
   视图：菜谱详情
   ========================================================================== */
async function renderDetail(id) {
  const r = state.recipes.find((x) => x.id === id);
  if (!r) { location.hash = '#/'; return; }
  document.title = `${r.title} · 拾味`;
  const checked = state.checked[id] || (state.checked[id] = new Set());
  const stepDone = state.stepDone[id] || (state.stepDone[id] = new Set());

  const hero = r.cover
    ? `<div class="hero" style="--ph:${phHue(r)}"><img data-img-id="${esc(r.cover)}" alt=""><a class="float-btn back" href="#/" aria-label="返回">${ICONS.back}</a></div>`
    : `<div class="hero ph" style="--ph:${phHue(r)}"><a class="float-btn back" href="#/" aria-label="返回">${ICONS.back}</a></div>`;

  const meta = [];
  if (r.timeMinutes) meta.push(`<span class="meta-chip">${ICONS.clock}${fmtTime(r.timeMinutes)}</span>`);
  if (r.servings) meta.push(`<span class="meta-chip">${ICONS.bowl}${esc(r.servings)}</span>`);
  meta.push(`<span class="meta-chip">${ICONS.flame}${DIFF_LABEL[r.difficulty]}</span>`);
  r.tags.forEach((t) => meta.push(`<span class="meta-chip tag">${esc(t)}</span>`));

  const ings = r.ingredients.filter((i) => i.name);
  const steps = r.steps.filter((s) => s.text || s.photo);

  appEl.innerHTML = `
    ${hero}
    <div class="detail-head">
      <h1>${esc(r.title)}</h1>
      <div class="meta-row">${meta.join('')}</div>
      ${r.intro ? `<p class="intro">${esc(r.intro)}</p>` : ''}
    </div>
    ${ings.length ? `
    <section class="section">
      <div class="section-head">
        <h2>配料</h2>
        <button class="aux ${checked.size ? '' : 'hidden'}" id="reset-check">重置勾选</button>
      </div>
      <ul class="ing-list">
        ${ings.map((i, idx) => `
          <li class="ing ${checked.has(idx) ? 'done' : ''}" data-idx="${idx}">
            <span class="ing-check"></span>
            <span class="ing-name">${esc(i.name)}</span>
            <span class="ing-amt">${esc(i.amount)}</span>
          </li>`).join('')}
      </ul>
    </section>` : ''}
    ${steps.length ? `
    <section class="section">
      <div class="section-head">
        <h2>步骤</h2>
        ${'wakeLock' in navigator ? `<button class="aux" id="wake-chip">防熄屏</button>` : ''}
      </div>
      <ol class="steps">
        ${steps.map((s, idx) => `
          <li class="step ${stepDone.has(idx) ? 'done' : ''}" data-idx="${idx}">
            <span class="step-num">${idx + 1}</span>
            <div class="step-body">
              ${s.text ? `<p>${esc(s.text)}</p>` : ''}
              ${s.photo ? `<img data-img-id="${esc(s.photo)}" alt="步骤图">` : ''}
            </div>
          </li>`).join('')}
      </ol>
    </section>` : ''}
    ${r.tips ? `
    <section class="section">
      <div class="tips-card"><b>小贴士 · </b>${esc(r.tips)}</div>
    </section>` : ''}
    <p class="cook-note">${r.cookCount ? `一共做过 ${r.cookCount} 次${r.lastCookedAt ? ` · 上次是 ${new Date(r.lastCookedAt).toLocaleDateString('zh-CN')}` : ''}` : '还没做过这道菜，今天试试？'}</p>
    <div class="action-bar">
      <button class="act ${r.favorite ? 'faved' : ''}" id="act-fav">${r.favorite ? ICONS.starFill : ICONS.star}<span>${r.favorite ? '已收藏' : '收藏'}</span></button>
      <button class="act primary" id="act-cook">${ICONS.pot}<span>做好了</span></button>
      <a class="act" href="#/edit/${esc(r.id)}">${ICONS.edit}<span>编辑</span></a>
      <button class="act" id="act-more">${ICONS.more}<span>更多</span></button>
    </div>`;
  hydrateImages();
  updateWakeChip();

  $$('.ing', appEl).forEach((li) => li.addEventListener('click', () => {
    const idx = +li.dataset.idx;
    if (checked.has(idx)) checked.delete(idx); else checked.add(idx);
    li.classList.toggle('done');
    $('#reset-check')?.classList.toggle('hidden', !checked.size);
  }));
  $('#reset-check')?.addEventListener('click', () => {
    checked.clear();
    $$('.ing', appEl).forEach((li) => li.classList.remove('done'));
    $('#reset-check').classList.add('hidden');
  });
  $$('.step', appEl).forEach((li) => li.addEventListener('click', () => {
    const idx = +li.dataset.idx;
    if (stepDone.has(idx)) stepDone.delete(idx); else stepDone.add(idx);
    li.classList.toggle('done');
  }));
  $('#wake-chip')?.addEventListener('click', (e) => { e.stopPropagation(); toggleWakeLock(); });

  $('#act-fav').addEventListener('click', async () => {
    r.favorite = !r.favorite;
    r.updatedAt = Date.now();
    await dbPut('recipes', r);
    await loadRecipes();
    renderDetail(id);
  });
  $('#act-cook').addEventListener('click', async () => {
    r.cookCount = (r.cookCount || 0) + 1;
    r.lastCookedAt = Date.now();
    await dbPut('recipes', r);
    toast(`已记录，这是你第 ${r.cookCount} 次做「${r.title}」`);
    $('.cook-note').textContent = `一共做过 ${r.cookCount} 次 · 上次是 ${new Date(r.lastCookedAt).toLocaleDateString('zh-CN')}`;
  });
  $('#act-more').addEventListener('click', async () => {
    const key = await actionSheet([
      { key: 'copy', label: '复制为文字', icon: ICONS.copy },
      { key: 'del', label: '删除菜谱', icon: ICONS.trash, danger: true }
    ]);
    if (key === 'copy') {
      const text = recipeToText(r);
      try { await navigator.clipboard.writeText(text); toast('已复制，可以粘贴给朋友了'); }
      catch { toast('复制失败，请截图分享'); }
    } else if (key === 'del') {
      const ok = await confirmDialog({ title: `删除「${r.title}」？`, body: '删除后无法恢复（除非你有备份文件）。', okText: '删除', danger: true });
      if (!ok) return;
      await deleteImage(r.cover);
      for (const s of r.steps) await deleteImage(s.photo);
      await dbDel('recipes', r.id);
      await loadRecipes();
      toast('已删除');
      location.hash = '#/';
    }
  });
}
function recipeToText(r) {
  const lines = [`【拾味菜谱】${r.title}`];
  const meta = [r.timeMinutes ? `⏱ ${fmtTime(r.timeMinutes)}` : '', r.servings ? `🍽 ${r.servings}` : '', `难度：${DIFF_LABEL[r.difficulty]}`].filter(Boolean);
  lines.push(meta.join(' · '), '');
  if (r.intro) lines.push(r.intro, '');
  const ings = r.ingredients.filter((i) => i.name);
  if (ings.length) {
    lines.push('▤ 配料');
    ings.forEach((i) => lines.push(`· ${i.name}${i.amount ? '　' + i.amount : ''}`));
    lines.push('');
  }
  const steps = r.steps.filter((s) => s.text);
  if (steps.length) {
    lines.push('▤ 步骤');
    steps.forEach((s, i) => lines.push(`${i + 1}. ${s.text}`));
    lines.push('');
  }
  if (r.tips) lines.push(`▤ 小贴士`, r.tips);
  return lines.join('\n').trim();
}

/* ==========================================================================
   视图：新建 / 编辑
   ========================================================================== */
function renderEdit(id) {
  const src = id ? state.recipes.find((x) => x.id === id) : null;
  if (id && !src) { location.hash = '#/'; return; }
  document.title = (src ? '编辑菜谱' : '记一道菜') + ' · 拾味';
  const draft = src ? structuredClone(src) : normalizeRecipe({ ingredients: [{ name: '', amount: '' }], steps: [{ text: '', photo: null }] });
  if (!draft.ingredients.length) draft.ingredients.push({ name: '', amount: '' });
  if (!draft.steps.length) draft.steps.push({ text: '', photo: null });
  const newImages = new Set();
  const removedImages = new Set();
  const backHref = src ? `#/r/${src.id}` : '#/';

  appEl.innerHTML = `
    <div class="form-top">
      <h1>${src ? '编辑菜谱' : '记一道菜'}</h1>
      <button class="cancel" id="btn-cancel">取消</button>
    </div>
    <div class="field">
      <div class="cover-pick ${draft.cover ? 'has' : ''}" id="cover-pick">
        ${draft.cover ? `<img data-img-id="${esc(draft.cover)}" alt="">` : ''}
        <div class="ph-inner ${draft.cover ? 'hidden' : ''}">${ICONS.camera}<div>添加成品照</div></div>
        <div class="cover-actions ${draft.cover ? '' : 'hidden'}">
          <button class="mini-btn" id="cover-replace">更换</button>
          <button class="mini-btn" id="cover-remove">移除</button>
        </div>
      </div>
    </div>
    <div class="field">
      <label>菜名 *</label>
      <input class="input title-input" id="f-title" maxlength="60" placeholder="比如：外婆的红烧肉" value="${esc(draft.title)}">
    </div>
    <div class="field">
      <label>简介 / 来源</label>
      <textarea class="input" id="f-intro" rows="2" placeholder="这道菜的故事、出处或口味特点（可不填）">${esc(draft.intro)}</textarea>
    </div>
    <div class="field-row">
      <div class="field">
        <label>耗时（分钟）</label>
        <input class="input" id="f-time" type="number" inputmode="numeric" min="1" max="5999" placeholder="30" value="${draft.timeMinutes || ''}">
      </div>
      <div class="field">
        <label>份量</label>
        <input class="input" id="f-servings" maxlength="20" placeholder="如：2人份" value="${esc(draft.servings)}">
      </div>
    </div>
    <div class="field">
      <label>难度</label>
      <div class="segmented" id="f-diff">
        ${[1, 2, 3].map((d) => `<button type="button" data-d="${d}" class="${draft.difficulty === d ? 'on' : ''}">${DIFF_LABEL[d]}</button>`).join('')}
      </div>
    </div>
    <div class="field">
      <label>标签</label>
      <div class="tag-editor" id="tag-editor"></div>
      <div class="tag-suggest" id="tag-suggest"></div>
    </div>
    <div class="field">
      <label>配料</label>
      <div class="row-list" id="ing-rows"></div>
      <button type="button" class="add-row-btn" id="add-ing">＋ 添加配料</button>
    </div>
    <div class="field">
      <label>步骤</label>
      <div class="row-list" id="step-rows"></div>
      <button type="button" class="add-row-btn" id="add-step">＋ 添加步骤</button>
    </div>
    <div class="field">
      <label>小贴士</label>
      <textarea class="input" id="f-tips" rows="2" placeholder="失败教训、火候要点、替换食材……（可不填）">${esc(draft.tips)}</textarea>
    </div>
    <div class="save-bar">
      <button class="btn" id="btn-cancel2">取消</button>
      <button class="btn primary" id="btn-save">保存菜谱</button>
    </div>`;
  hydrateImages();
  autogrow($('#f-intro'));
  autogrow($('#f-tips'));

  /* --- 封面 --- */
  const coverPick = $('#cover-pick');
  async function setCover(file) {
    const newId = await saveImageFile(file, 1440);
    if (draft.cover) {
      if (newImages.has(draft.cover)) { await deleteImage(draft.cover); newImages.delete(draft.cover); }
      else removedImages.add(draft.cover);
    }
    draft.cover = newId;
    newImages.add(newId);
    coverPick.classList.add('has');
    let img = coverPick.querySelector('img');
    if (!img) { img = document.createElement('img'); coverPick.prepend(img); }
    img.src = await imageURL(newId);
    coverPick.querySelector('.ph-inner').classList.add('hidden');
    coverPick.querySelector('.cover-actions').classList.remove('hidden');
  }
  coverPick.addEventListener('click', async (e) => {
    if (e.target.id === 'cover-remove') {
      if (draft.cover) {
        if (newImages.has(draft.cover)) { await deleteImage(draft.cover); newImages.delete(draft.cover); }
        else removedImages.add(draft.cover);
      }
      draft.cover = null;
      coverPick.classList.remove('has');
      coverPick.querySelector('img')?.remove();
      coverPick.querySelector('.ph-inner').classList.remove('hidden');
      coverPick.querySelector('.cover-actions').classList.add('hidden');
      return;
    }
    if (e.target.id === 'cover-replace' || !draft.cover) pickImageFile((f) => setCover(f).catch(() => toast('图片处理失败')));
  });

  /* --- 难度 --- */
  $('#f-diff').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-d]');
    if (!btn) return;
    draft.difficulty = +btn.dataset.d;
    $$('#f-diff button').forEach((b) => b.classList.toggle('on', b === btn));
  });

  /* --- 标签 --- */
  function rebuildTags() {
    const editor = $('#tag-editor');
    editor.innerHTML = draft.tags.map((t, i) =>
      `<span class="tag-pill">${esc(t)}<button type="button" data-i="${i}" aria-label="移除">✕</button></span>`
    ).join('') + `<input id="tag-input" maxlength="12" placeholder="${draft.tags.length ? '' : '输入标签后回车'}" autocomplete="off">`;
    const input = $('#tag-input');
    const addTag = (t) => {
      t = t.trim().replace(/[,，]/g, '');
      if (!t || draft.tags.includes(t) || draft.tags.length >= 10) return;
      draft.tags.push(t);
      rebuildTags();
      $('#tag-input').focus();
    };
    input.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input.value); }
      else if (e.key === 'Backspace' && !input.value && draft.tags.length) { draft.tags.pop(); rebuildTags(); $('#tag-input').focus(); }
    });
    input.addEventListener('blur', () => { if (input.value.trim()) addTag(input.value); });
    editor.querySelectorAll('.tag-pill button').forEach((b) =>
      b.addEventListener('click', () => { draft.tags.splice(+b.dataset.i, 1); rebuildTags(); }));
    const pool = [...new Set([...PRESET_TAGS, ...collectTags().map(([t]) => t)])].filter((t) => !draft.tags.includes(t)).slice(0, 12);
    $('#tag-suggest').innerHTML = pool.map((t) => `<button type="button" data-t="${esc(t)}">＋ ${esc(t)}</button>`).join('');
    $('#tag-suggest').querySelectorAll('button').forEach((b) =>
      b.addEventListener('click', () => { if (!draft.tags.includes(b.dataset.t) && draft.tags.length < 10) { draft.tags.push(b.dataset.t); rebuildTags(); } }));
  }
  rebuildTags();

  /* --- 配料行 --- */
  function rebuildIngs() {
    const box = $('#ing-rows');
    box.innerHTML = '';
    draft.ingredients.forEach((row) => {
      const el = document.createElement('div');
      el.className = 'ing-row';
      el.innerHTML = `
        <input class="input name" maxlength="30" placeholder="食材" value="${esc(row.name)}">
        <input class="input amt" maxlength="20" placeholder="用量" value="${esc(row.amount)}">
        <button type="button" class="row-x" aria-label="删除">✕</button>`;
      el.querySelector('.name').addEventListener('input', (e) => { row.name = e.target.value; });
      el.querySelector('.amt').addEventListener('input', (e) => { row.amount = e.target.value; });
      el.querySelector('.row-x').addEventListener('click', () => {
        draft.ingredients.splice(draft.ingredients.indexOf(row), 1);
        if (!draft.ingredients.length) draft.ingredients.push({ name: '', amount: '' });
        rebuildIngs();
      });
      box.append(el);
    });
  }
  rebuildIngs();
  $('#add-ing').addEventListener('click', () => {
    draft.ingredients.push({ name: '', amount: '' });
    rebuildIngs();
    const names = $$('#ing-rows .name');
    names[names.length - 1]?.focus();
  });

  /* --- 步骤行 --- */
  function rebuildSteps() {
    const box = $('#step-rows');
    box.innerHTML = '';
    draft.steps.forEach((row, idx) => {
      const el = document.createElement('div');
      el.className = 'step-row';
      el.innerHTML = `
        <span class="step-num">${idx + 1}</span>
        <div class="grow">
          <textarea class="input" rows="2" placeholder="这一步做什么">${esc(row.text)}</textarea>
          <div class="step-photo-strip">
            ${row.photo ? `<img data-img-id="${esc(row.photo)}" alt=""><button type="button" class="add-ph" data-del-photo>移除图片</button>` : `<button type="button" class="add-ph" data-add-photo>＋ 配一张步骤图</button>`}
          </div>
        </div>
        <div class="step-row-tools">
          <button type="button" data-up ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" data-down ${idx === draft.steps.length - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" data-del>✕</button>
        </div>`;
      const ta = el.querySelector('textarea');
      ta.addEventListener('input', (e) => { row.text = e.target.value; });
      autogrow(ta);
      el.querySelector('[data-up]')?.addEventListener('click', () => {
        const i = draft.steps.indexOf(row);
        if (i > 0) { [draft.steps[i - 1], draft.steps[i]] = [draft.steps[i], draft.steps[i - 1]]; rebuildSteps(); }
      });
      el.querySelector('[data-down]')?.addEventListener('click', () => {
        const i = draft.steps.indexOf(row);
        if (i < draft.steps.length - 1) { [draft.steps[i + 1], draft.steps[i]] = [draft.steps[i], draft.steps[i + 1]]; rebuildSteps(); }
      });
      el.querySelector('[data-del]').addEventListener('click', async () => {
        if (row.photo) {
          if (newImages.has(row.photo)) { await deleteImage(row.photo); newImages.delete(row.photo); }
          else removedImages.add(row.photo);
        }
        draft.steps.splice(draft.steps.indexOf(row), 1);
        if (!draft.steps.length) draft.steps.push({ text: '', photo: null });
        rebuildSteps();
      });
      el.querySelector('[data-add-photo]')?.addEventListener('click', () => {
        pickImageFile(async (f) => {
          try {
            const pid = await saveImageFile(f, 1080);
            row.photo = pid;
            newImages.add(pid);
            rebuildSteps();
          } catch { toast('图片处理失败'); }
        });
      });
      el.querySelector('[data-del-photo]')?.addEventListener('click', async () => {
        if (newImages.has(row.photo)) { await deleteImage(row.photo); newImages.delete(row.photo); }
        else removedImages.add(row.photo);
        row.photo = null;
        rebuildSteps();
      });
      box.append(el);
    });
    hydrateImages(box);
  }
  rebuildSteps();
  $('#add-step').addEventListener('click', () => {
    draft.steps.push({ text: '', photo: null });
    rebuildSteps();
    const tas = $$('#step-rows textarea');
    tas[tas.length - 1]?.focus();
  });

  /* --- 取消 / 保存 --- */
  async function cancelEdit() {
    for (const iid of newImages) await deleteImage(iid);
    location.hash = backHref;
  }
  $('#btn-cancel').addEventListener('click', cancelEdit);
  $('#btn-cancel2').addEventListener('click', cancelEdit);

  $('#btn-save').addEventListener('click', async () => {
    const title = $('#f-title').value.trim();
    if (!title) { toast('先给这道菜起个名字吧'); $('#f-title').focus(); return; }
    draft.title = title;
    draft.intro = $('#f-intro').value.trim();
    draft.tips = $('#f-tips').value.trim();
    draft.servings = $('#f-servings').value.trim();
    const t = parseInt($('#f-time').value, 10);
    draft.timeMinutes = Number.isFinite(t) && t > 0 ? t : null;
    const tagInput = $('#tag-input');
    if (tagInput && tagInput.value.trim()) {
      const extra = tagInput.value.trim().replace(/[,，]/g, '');
      if (extra && !draft.tags.includes(extra) && draft.tags.length < 10) draft.tags.push(extra);
    }
    draft.ingredients = draft.ingredients.filter((i) => i.name.trim());
    for (const s of draft.steps) {
      if (!s.text.trim() && s.photo && newImages.has(s.photo)) { await deleteImage(s.photo); newImages.delete(s.photo); s.photo = null; }
    }
    draft.steps = draft.steps.filter((s) => s.text.trim() || s.photo);
    draft.updatedAt = Date.now();
    await dbPut('recipes', normalizeRecipe(draft));
    for (const iid of removedImages) await deleteImage(iid);
    await loadRecipes();
    if (!memMode && navigator.storage && navigator.storage.persist && !safeLS.get('persistAsked')) {
      safeLS.set('persistAsked', '1');
      navigator.storage.persist().catch(() => {});
    }
    toast(src ? '已保存修改' : '菜谱已收录');
    location.hash = `#/r/${draft.id}`;
  });
}

/* ==========================================================================
   视图：设置
   ========================================================================== */
async function renderSettings() {
  document.title = '设置 · 拾味';
  const hasSeeds = state.recipes.some((r) => r.id.startsWith('seed-'));
  appEl.innerHTML = `
    <div class="page-top">
      <a class="icon-btn" href="#/" aria-label="返回">${ICONS.back}</a>
      <h1>设置</h1>
    </div>
    ${memMode ? `<div class="install-tip"><div>⚠️ <b>演示模式：</b>当前环境无法长期保存数据，刷新后会丢失。请安装正式版使用。</div></div>` : ''}
    <div class="group">
      <p class="group-title">数据备份</p>
      <div class="group-card">
        <button class="set-row" id="s-export">
          <span class="ic">${ICONS.download}</span>
          <span class="grow">导出全部菜谱<span class="desc">生成一个包含图片的备份文件，建议存到「文件」或发给自己</span></span>
          <span class="chev">${ICONS.chevR}</span>
        </button>
        <button class="set-row" id="s-import">
          <span class="ic">${ICONS.upload}</span>
          <span class="grow">从备份恢复<span class="desc">导入备份文件，同名菜谱保留较新版本</span></span>
          <span class="chev">${ICONS.chevR}</span>
        </button>
      </div>
    </div>
    <div class="group">
      <p class="group-title">存储</p>
      <div class="group-card">
        <div class="set-row">
          <span class="ic">${ICONS.info}</span>
          <span class="grow">占用空间<span class="desc" id="s-usage">计算中…</span></span>
        </div>
        <button class="set-row" id="s-persist">
          <span class="ic">${ICONS.shield}</span>
          <span class="grow">长期保存保护<span class="desc" id="s-persist-desc">检查中…</span></span>
        </button>
      </div>
    </div>
    <div class="group">
      <p class="group-title">整理</p>
      <div class="group-card">
        ${hasSeeds ? `
        <button class="set-row" id="s-seeds">
          <span class="ic">${ICONS.trash}</span>
          <span class="grow">移除示例菜谱<span class="desc">删除自带的 ${state.recipes.filter((r) => r.id.startsWith('seed-')).length} 道示例</span></span>
        </button>` : ''}
        <button class="set-row danger" id="s-wipe">
          <span class="ic">${ICONS.trash}</span>
          <span class="grow">清空全部数据<span class="desc">删除所有菜谱与图片，无法撤销</span></span>
        </button>
      </div>
    </div>
    <div class="about">
      <p class="brand-mini">拾 味</p>
      <p>v1.0 · 所有数据只保存在这台设备上<br>不联网、无账号、不上传任何内容</p>
    </div>`;

  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then(({ usage, quota }) => {
      const mb = (n) => (n / 1048576).toFixed(1);
      const el = $('#s-usage');
      if (el) el.textContent = `已用 ${mb(usage || 0)} MB / 可用约 ${(quota / 1073741824).toFixed(1)} GB`;
    }).catch(() => { const el = $('#s-usage'); if (el) el.textContent = '无法获取'; });
  } else { $('#s-usage').textContent = '当前环境不支持查询'; }

  async function refreshPersist() {
    const el = $('#s-persist-desc');
    if (!el) return;
    if (!(navigator.storage && navigator.storage.persisted)) { el.textContent = '当前环境不支持'; return; }
    const on = await navigator.storage.persisted().catch(() => false);
    el.textContent = on ? '已开启 —— 系统不会自动清理你的菜谱' : '未开启，点击申请（可降低系统自动清理数据的风险）';
  }
  refreshPersist();
  $('#s-persist').addEventListener('click', async () => {
    if (!(navigator.storage && navigator.storage.persist)) return;
    const ok = await navigator.storage.persist().catch(() => false);
    toast(ok ? '已开启长期保存保护' : '系统暂未批准，多使用几次后再试');
    refreshPersist();
  });

  $('#s-export').addEventListener('click', exportAll);
  $('#s-import').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.hidden = true;
    document.body.append(input);
    input.addEventListener('change', () => { const f = input.files && input.files[0]; input.remove(); if (f) importBackup(f); });
    input.click();
  });

  $('#s-seeds')?.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: '移除示例菜谱？', body: '自带的示例菜谱将被删除，你自己记录的菜谱不受影响。', okText: '移除' });
    if (!ok) return;
    for (const r of state.recipes.filter((x) => x.id.startsWith('seed-'))) {
      await deleteImage(r.cover);
      for (const s of r.steps) await deleteImage(s.photo);
      await dbDel('recipes', r.id);
    }
    await loadRecipes();
    toast('示例已移除');
    renderSettings();
  });

  $('#s-wipe').addEventListener('click', async () => {
    const ok1 = await confirmDialog({ title: '清空全部数据？', body: '所有菜谱和照片都会被删除，且无法恢复。', okText: '继续', danger: true });
    if (!ok1) return;
    const ok2 = await confirmDialog({ title: '真的确定吗？', body: '这是最后一次确认。如果还没导出备份，现在取消还来得及。', okText: '清空', danger: true });
    if (!ok2) return;
    imgURLCache.forEach((url) => URL.revokeObjectURL(url));
    imgURLCache.clear();
    await dbClear('recipes');
    await dbClear('images');
    await dbClear('meta');
    await dbPut('meta', { key: 'seeded', value: 1 }); // 清空后不再自动写入示例
    state.checked = {}; state.stepDone = {};
    await loadRecipes();
    toast('已清空');
    location.hash = '#/';
  });
}

/* ---------- 备份：导出 / 导入 ---------- */
const blobToDataURL = (blob) => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(fr.result);
  fr.onerror = () => rej(fr.error);
  fr.readAsDataURL(blob);
});
async function exportAll() {
  try {
    toast('正在打包，图片多时需要几秒…');
    const recipes = await dbGetAll('recipes');
    const images = {};
    for (const r of recipes) {
      const ids = [r.cover, ...(r.steps || []).map((s) => s.photo)].filter(Boolean);
      for (const iid of ids) {
        if (images[iid]) continue;
        const rec = await dbGet('images', iid);
        if (rec && rec.blob) images[iid] = await blobToDataURL(rec.blob);
      }
    }
    const payload = JSON.stringify({ app: 'shiwei', version: 1, exportedAt: Date.now(), recipes, images });
    const date = new Date().toISOString().slice(0, 10);
    const fileName = `拾味备份-${date}.json`;
    const file = new File([payload], fileName, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: '拾味菜谱备份' }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('备份文件已生成');
  } catch (e) {
    toast('导出失败：' + (e && e.message ? e.message : e));
  }
}
async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'shiwei' || !Array.isArray(data.recipes)) { toast('这不是拾味的备份文件'); return; }
    let added = 0, updated = 0;
    for (const [iid, dataURL] of Object.entries(data.images || {})) {
      if (typeof dataURL !== 'string' || !dataURL.startsWith('data:')) continue;
      const blob = await (await fetch(dataURL)).blob();
      await dbPut('images', { id: iid, blob });
      if (imgURLCache.has(iid)) { URL.revokeObjectURL(imgURLCache.get(iid)); imgURLCache.delete(iid); }
    }
    for (const raw of data.recipes) {
      const r = normalizeRecipe(raw);
      const exist = state.recipes.find((x) => x.id === r.id);
      if (!exist) { await dbPut('recipes', r); added++; }
      else if (r.updatedAt > exist.updatedAt) { await dbPut('recipes', r); updated++; }
    }
    await dbPut('meta', { key: 'seeded', value: 1 });
    await loadRecipes();
    toast(`导入完成：新增 ${added} 道，更新 ${updated} 道`);
    renderSettings();
  } catch (e) {
    toast('导入失败，文件可能已损坏');
  }
}

/* ==========================================================================
   路由与启动
   ========================================================================== */
function route() {
  const h = location.hash || '#/';
  if (state.prevHash === '#/' || state.prevHash === '') state.homeScroll = window.scrollY;
  if (state.prevHash.startsWith('#/r/')) releaseWakeLock();
  state.prevHash = h;
  closeDialog();

  let m;
  if (h === '#/' || h === '#') renderHome();
  else if ((m = h.match(/^#\/r\/(.+)$/))) renderDetail(decodeURIComponent(m[1]));
  else if (h === '#/new') renderEdit(null);
  else if ((m = h.match(/^#\/edit\/(.+)$/))) renderEdit(decodeURIComponent(m[1]));
  else if (h === '#/settings') renderSettings();
  else renderHome();
  if (h !== '#/') window.scrollTo(0, 0);
}

window.addEventListener('error', (e) => {
  document.documentElement.setAttribute('data-app-error', (e && e.message) || 'unknown');
});
window.addEventListener('hashchange', route);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && location.hash.startsWith('#/r/') && wakeLock === null) updateWakeChip();
});

(async function boot() {
  try {
    await ensureSeeds();
    await loadRecipes();
    route();
    document.documentElement.setAttribute('data-app-ready', '1');
    if (memMode) console.warn('拾味：IndexedDB 不可用，已进入内存演示模式');
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  } catch (err) {
    document.documentElement.setAttribute('data-app-error', String(err));
    appEl.innerHTML = `<div class="empty"><h2>启动失败</h2><p>${esc(String(err))}</p></div>`;
  }
})();
