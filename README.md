# 拾味 ShiWei

私人菜谱手册 PWA。所有数据（菜谱、照片）只保存在你的手机本地，不联网、无账号、零成本。

## 安装到 iPhone

1. 用 **Safari** 打开应用网址（GitHub Pages 部署后填入）
2. 点底部**分享按钮**（方框带向上箭头）
3. 选择**「添加到主屏幕」**
4. 主屏幕出现「拾」字图标，点开即用，之后完全离线可用

> 安装后建议进「设置 → 长期保存保护」点一下申请，降低系统清理数据的风险；
> 重要菜谱定期「设置 → 导出全部菜谱」备份一份到「文件」App。

## 功能

- 菜谱录入：成品照、简介、耗时/份量/难度、标签、配料清单、图文步骤、小贴士
- 浏览：搜索（菜名/食材/标签）、标签筛选、收藏
- 烹饪模式：配料打勾、步骤划掉、屏幕防熄屏（Wake Lock）
- 记录：「做好了」计数 + 上次烹饪日期
- 备份：一键导出/导入 JSON（含全部图片），换手机不丢数据
- 深浅色自动跟随系统

## 开发

零构建、零依赖。应用本体在 `docs/`（同时是 GitHub Pages 的发布目录）：

```
docs/
  index.html          入口
  styles.css          设计系统（暖米纸 + 赭陶 + 宋体标题，自动深浅色）
  app.js              全部逻辑（IndexedDB 数据层 / hash 路由 / 视图 / 备份）
  sw.js               Service Worker（应用壳离线缓存）
  manifest.webmanifest
  icons/              应用图标（scripts/make-icons.ps1 生成）
```

常用命令（需要 Node）：

```bash
node scripts/serve.mjs           # 本地预览 http://localhost:8173/
node scripts/e2e.mjs             # 端到端测试（无头 Edge，覆盖增删改查全流程）
node scripts/snap.mjs <url> <png> [light|dark] [scrollY]   # 截图工具
node scripts/build-artifact.mjs <out.html>                 # 打包单文件预览版
```

改完代码请更新 `docs/sw.js` 里的 `VERSION`，否则已安装用户拿不到新版本。

## 部署（GitHub Pages）

仓库 Settings → Pages → Source 选 `main` 分支 `/docs` 目录即可；
或命令行：`gh api -X POST repos/{owner}/shiwei/pages -f "source[branch]=main" -f "source[path]=/docs"`
