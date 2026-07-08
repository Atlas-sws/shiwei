// 打包 Artifact 单文件预览版：内联 CSS/JS、禁用 SW、补 data-theme 主题覆盖
// 用法：node scripts/build-artifact.mjs <输出文件>
import { readFile, writeFile } from 'node:fs/promises';

const css = await readFile(new URL('../docs/styles.css', import.meta.url), 'utf8');
let js = await readFile(new URL('../docs/app.js', import.meta.url), 'utf8');
js = js.replace("if ('serviceWorker' in navigator", "if (false && 'serviceWorker' in navigator");

const lightMatch = css.match(/:root \{([\s\S]*?)\n\}/);
const darkMatch = css.match(/@media \(prefers-color-scheme: dark\) \{\s*:root \{([\s\S]*?)\n  \}/);
if (!lightMatch || !darkMatch) throw new Error('token blocks not found');
const overrides = `\n/* Artifact 主题切换（data-theme 覆盖媒体查询） */\n:root[data-theme="light"] {${lightMatch[1]}\n}\n:root[data-theme="dark"] {${darkMatch[1]}\n}\n`;

const out = `<title>拾味 · 私人菜谱手册</title>
<style>
${css}${overrides}</style>
<div id="app"></div>
<div id="toast-root"></div>
<div id="dialog-root"></div>
<noscript>拾味需要启用 JavaScript 才能运行。</noscript>
<script>
${js}
</script>
`;
const dest = process.argv[2] || 'shiwei-artifact.html';
await writeFile(dest, out);
console.log('built', dest, out.length, 'bytes');
