# 优化 AGENTS.md 文档结构

## 目标

将 `AGENTS.md` 从"规范 + 审查记录"混合文档重构为纯粹的**协作规范与基本要求文档**；Loop 审查记录迁移到独立文件；建立 `docs/plans/{task-id}/todo.md` 任务计划与待办清单存放规范，并在 `AGENTS.md` 中维护"当前未完成任务"链接列表。

## 子任务

- [x] 创建 `docs/REVIEW_LOG.md` 并迁移 AGENTS.md 中的 Loop 记录
- [x] 重构 `AGENTS.md`：删除 Loop 记录，新增计划规范与当前未完成任务区域
- [x] 创建本任务的 `docs/plans/optimize-agents-md/todo.md`
- [x] 本地校验：检查文档结构、链接、格式
- [x] 提交变更到 develop

## 依赖关系

- 无外部依赖，仅涉及文档整理。
- 执行前需确认 `AGENTS.md` 已完整读取，避免误删规范内容。

## 当前状态

- 已完成 `docs/REVIEW_LOG.md` 创建与 Loop 记录迁移。
- 已完成 `AGENTS.md` 重构，新增"任务计划与待办清单规范"和"当前未完成任务"章节。
- 待完成本地校验与提交。

## 验收标准

- `AGENTS.md` 不再包含 Loop 1~5 的详细问题清单 / 修复记录 / 复测结果。
- `docs/REVIEW_LOG.md` 完整保留历史 Loop 记录，且声明为版本化资产。
- `docs/plans/optimize-agents-md/todo.md` 存在且结构符合 AGENTS.md 中定义的规范。
- `AGENTS.md` 中"当前未完成任务"仅保留本任务链接。
- 提交后 `git status --short` 仅包含预期文档文件，无敏感文件。
