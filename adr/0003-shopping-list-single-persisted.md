---
status: accepted
---

# 买菜清单持久化为 meta 库中的单份「当前清单」

## Context

买菜发生在「离开 app、到超市」之后，甚至 app 已被系统回收之后。勾选态必须能离线留存、重开可见。需决定：存哪里、存几份。

## Decision

在现有 **meta 库**存**单份**当前清单 `{ recipeIds, checked }`（随 IndexedDB 一同受 `navigator.storage.persist()` 保护），不新建 object store。全库同时只有一份活动清单，重新生成即替换。

## Consequences

- v1 不支持多份 / 命名清单与历史记录；如需，要改这份数据结构（届时可能才值得新建 object store）。
- ~~v1 不支持手动加非菜谱项~~ → 已由 [adr/0005](0005-shopping-list-manual-items.md) 补上：当前清单结构加 `manualItems`，仍是 meta 库单份清单。
