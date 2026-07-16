---
status: accepted
---

# 买菜清单支持手动添加项

## Context

菜谱聚合覆盖不了全部采购：垃圾袋、酱油见底、临时想买的东西。[adr/0003](0003-shopping-list-single-persisted.md) 当初把「手动加项」列为 v1 OUT，现按用户需求补上。

## Decision

买菜清单加「＋ 手动添加」：填食材名 + 数量（数量可空），加进主清单，可勾选、可删除。手动项**不参与用量聚合，也不进常备分栏**——就是一条独立采购项，各自带 `done`，按 `id` 删除。当前清单结构从 `{ recipeIds, checked }` 扩为 `{ recipeIds, checked, manualItems:[{ id, name, amount, done }] }`——仍是 meta 库单份清单，不新建 object store，不影响既有勾选 / 持久化。

## Consequences

- 复制导出的「主清单」段包含手动项。
- 手动项按 `id` 独立管理，与菜谱食材的 `checked`（按名记录）互不干扰。
