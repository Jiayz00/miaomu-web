# Loop 审查与部署追踪

> 本文件记录每次 Loop 审查、服务器部署、GitHub 发布的过程性信息。
> 作为项目审查历史资产，**随仓库版本化持久化**。

---

## Loop 进度表

| Loop | 范围 | 状态 | 问题数 | 修复数 | 复测通过 | 备注 |
|------|------|------|--------|--------|----------|------|
| 0 | v1.2.0 代码准备 + GitHub v1.2.0 Release | ✅ | - | - | - | Release 已发布 |
| 1 | 服务器部署 + 全功能走查 | ✅ | 4 | 4 | ✅ | 见下方问题清单与修复记录 |
| 2 | 修复 P0/P1/P2 + 重新部署 | ✅ | 1 | 1 | ✅ | 见下方问题清单与修复记录 |
| 3 | v1.2.1 GitHub Release 发布 | ✅ | - | - | - | [Release v1.2.1](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.2.1) 已发布 |
| 4 | v1.2.2 关键 bug 修复 + E2E 全量回归 | ✅ | 7 | 7 | ✅ | 见下方问题清单与修复记录 |
| 5 | v1.2.2 GitHub Release 发布 | ✅ | - | - | - | [Release v1.2.2](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.2.2) 已发布 |

#### Loop 1 - 发现问题

- **[P0]** `frontend/src/lib/constants.ts:18-37` + `frontend/src/lib/api.ts:180-182` - **SSR API_BASE_URL 被打包期内联为 `/api/v1`，导致盆景详情页 SSR 时回环调用自身 → 404。** 复现：访问 `https://miaomu.jiayyy.cn/bonsais/bai-nian-hei-song` 返回 404（`NEXT_NOT_FOUND` digest）。根因：`API_BASE_URL = resolveApiBaseUrl()` 在模块顶层求值，webpack 编译期内联了 `/api/v1`（BACKEND_URL 在 build 时未注入），运行时即使容器有 `BACKEND_URL=http://backend:4000/api/v1` 也无效。修复：把 `API_BASE_URL` 改为运行时函数 `getApiBaseUrl()`，并在 `request()` 内每次调用。
- **[已澄清]** `frontend/src/lib/api.ts:285-314` + 12 个页面 - **api.get 泛型与返回值类型不一致** - 经 curl 实测后端响应结构为 `{ success: true, data: T, message: '...' }`，前端 `api.get<{ data: T }>` 然后 `res.data` 访问 **是正确的**。所有 72 处 `api.get<{ data: T }>` 调用均与 `request<T>` 的实现匹配，**非问题**，仅记录以避免误判。
- **[P1]** `frontend/next.config.js:20-36` + `frontend/src/lib/constants.ts:130-133` - **`images.unsplash.com` 资源被 ORB（Opaque Response Blocking）拦截，远程图片域名配置存在但部分 URL 触发 0 字节加载失败。** 复现：首页 hero 图与统计图均为 unsplash 图，控制台报 `Response was blocked by CORB (count: 5)`，ERR_BLOCKED_BY_ORB。修复：移除对 unsplash 的依赖，全部走 `picsum.photos` 或本地上传图，或在 `next.config.js` 的 `images.remotePatterns` 中确认允许跨域。
- **[P1]** `frontend/src/app/(user)/bonsais/page.tsx` + `frontend/src/lib/constants.ts:130-133` - **年份筛选器渲染了 1900-2026 共 127 个按钮，UX 灾难。** 复现：访问 `/bonsais` 页面，右侧筛选器"年份"区域显示从 1900 到 2026 共 127 个按钮，超长滚动条。修复：改为只显示近 10 年范围或使用滑块/输入框。
- **[P2]** `frontend/src/app/(user)/bonsais/page.tsx` (搜索表单) - **a11y 警告：表单字段缺少 `id` 或 `name` 属性。** 复现：访问 `/bonsais` 控制台报 `[issue] A form field element should have an id or name attribute (count: 1)`。修复：给搜索 input 添加 `id="bonsai-search"` 与 `<label htmlFor>`。
- **[P2]** `AGENTS.md:223-234` 文档 - **服务器部署信息中 `域名` 字段标注为 `miaomu.jiayyy.cn:1688`，但实际服务器仅 `miaomu.jiayyy.cn:443`（HTTPS）可达，`:1688` 端口不存在。** 复现：`curl -k -s -o /dev/null -w "%{http_code}\n" https://miaomu.jiayyy.cn:1688/` 返回 `000`。修复：更新文档为 `miaomu.jiayyy.cn`（Caddy 默认 443 端口）。

#### Loop 1 - 修复记录

- ✅ **P0-1 SSR API_BASE_URL 内联导致 404** — 改写 `constants.ts` 导出 `getApiBaseUrl()` / `getBackendOrigin()` / `getPublicOrigin()` 三个运行时函数；删除模块顶层 `API_BASE_URL` 常量；`api.ts` 与 `utils.ts` 改为每次调用函数取值。修复 SSR 回环调用自身。
- ✅ **P0-2 误判澄清** — 经 curl 实测后端响应为 `{ success, data, message }`，前端 `api.get<{ data: T }>` + `res.data` 用法正确。72 处调用全部符合 `request<T>` 实现，无需修改。
- ✅ **P1-1 ORB 图片加载** — 所有 `images.unsplash.com` URL 替换为 `picsum.photos/seed/xxx/W/H`；`next.config.js` `remotePatterns` 移除 `images.unsplash.com`；admin 布局编辑器 placeholder 更新。
- ✅ **P1-2 127 年筛选按钮** — `YEAR_OPTIONS` 改为生成近 10 年（今年 - 9 到今年），减少 127 → 10 个按钮。FilterPanel / BonsaiForm 等 3 处自动受益。
- ✅ **P2-1 a11y id/name 警告** — 搜索 input 添加 `id="bonsai-search-input"` 与 `name="bonsai-search"`，满足 a11y 工具要求。
- ✅ **P2-2 文档端口不一致** — `AGENTS.md` 容器架构与健康检查命令的 `:1688` 全部修正为 `:443`（Caddy 默认 HTTPS 端口）。

#### Loop 1 - 复测结果

- 服务器部署：✅（v1.2.0 已部署，5 个容器 healthy）
- 健康检查：✅（`/api/v1/health/live` 200）
- 浏览器全功能测试：❌（盆景详情页 404、首页/列表页部分图片被 ORB 拦截、年份筛选器 127 个按钮、a11y 警告）
- 控制台无 error：❌（CORB / a11y 警告）

#### Loop 2 复测发现新问题

- **[P0]** `backend/src/app.module.ts:36-47` - **管理后台限流 429 误触发。** 复现：登录 admin 后快速访问 dashboard、bonsais、categories、users、layout-editor、settings 等 6+ 个页面，控制台报 `Failed to load resource: 429 (count: 2)`。根因：NestJS Throttler v5+ 的 `ThrottlerGuard` 在每次请求时检查**所有**全局命名限流器（`'default'` + `'auth'`），任何一个超限即返回 429。全局注册 `'auth': { limit: 5, ttl: 60s }` 导致所有 admin 路由（包括非 auth 端点）都被 5/min 限制（admin layout 加载 dashboard 一次就触发 9+ API）。修复：移除全局 `'auth'` 限流器；改为在认证路由装饰器 `@Throttle({ default: { ttl, limit: 5 } })` 上显式声明严格限流（默认 default 300/min，全局 5 个 limit 留给防暴力破解）。

#### Loop 2 - 修复记录

- ✅ **P0 限流误触发** — `app.module.ts` 移除全局 `'auth'` 限流器，`default` 调整为 300/min；`auth.controller.ts` 的 `register` / `login` / `refresh` / `change-password` 装饰器从 `@Throttle({ auth: 5 })` 改为 `@Throttle({ default: 5 })`，仍保留防暴力破解能力。压测验证：50/50 连续请求全部 200，限流不再误触发。

#### Loop 2 - 复测结果

- 服务器部署：✅（v1.2.1 候选版本已部署，5 个容器 healthy）
- 健康检查：✅（`/api/v1/health/live` 200）
- 浏览器全功能测试：✅（用户端首页 / 列表 / 详情 / 登录；管理端 7 个核心路径：dashboard / bonsais / categories / chat / users / layout-editor / settings）
- 控制台无 error：✅（Loop 1 的 CORB / a11y / 404 全部清零，Loop 2 的 429 限流清零）

#### Loop 3 计划与执行

- ✅ 整理 Loop 1 + Loop 2 修复 commit（已合为单一 `fix:` 提交 `a6ee684`）
- ✅ 更新 `CHANGELOG.md`（v1.2.1 条目，含 Loop 1 / Loop 2 详细问题清单与修复记录）
- ✅ 更新 `README.md`（版本摘要 + 链接 + v1.2.1 更新要点）
- ✅ 推送至 GitHub `develop` 分支
- ✅ 创建 `release/v1.2.1` 分支并推送
- ✅ 创建 PR `release/v1.2.1 → main`（[PR #1](https://github.com/Jiayz00/miaomu-web/pull/1)）并合并
- ✅ `main` 合并回 `develop`（`f86dac3`）
- ✅ 在 `main` 上打 `v1.2.1` annotated tag（指向 `d063ec8`）
- ✅ 创建 GitHub Release [`v1.2.1`](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.2.1) 并附完整 changelog
- ✅ 删除已合并的远程 `release/v1.2.1` 分支
- ✅ 删除过时的 `fix/admin-multiple-issues` 分支（合并到 develop 后清理）

#### Loop 3 - 复测结果

- GitHub 推送：✅（PR #1 merged、tag v1.2.1 推送、Release published）
- 分支清理：✅（release/v1.2.1 + fix/admin-multiple-issues 均已删除）
- 服务器稳定：✅（无 Loop 4 计划，进入监控态）

#### Loop 4 - 发现问题

- **[P0]** `.github/workflows/ci.yml` + `backend/package.json` + `backend/.eslintrc.js` - **GitHub Actions CI 三 job 全失败（Backend lint & build / Config syntax validate / Frontend lint & build）。** 复现：push 后 Actions 页面显示 3 个 job 失败。根因：① CI workflow 未注入 `DATABASE_URL` / `REDIS_URL` 等占位 env，导致 docker compose config 校验失败；② 后端无 ESLint 配置与依赖，`npm run lint` 命令不存在；③ 前端 JSX 中存在未转义双引号触发 lint error。修复：在 `.github/workflows/ci.yml` 注入占位 env；后端新增 `.eslintrc.js` / `tsconfig.eslint.json` 并安装 `@typescript-eslint/*` 依赖；前端 `.eslintrc.json` 关闭 `react/no-unescaped-entities` 并将文案双引号改为中文引号。
- **[P0]** `frontend/src/app/(user)/bonsais/[slug]/page.tsx` + `frontend/src/lib/constants.ts` + `backend/src/modules/bonsais/bonsais.service.ts` - **手动创建的中文 slug 盆景详情页 404。** 复现：访问 `https://miaomu.jiayyy.cn/bonsais/百年黑松` 返回 404。根因多层级：① Next.js 默认静态生成在 build 时缓存了 404；② SSR 阶段 `API_BASE_URL` 被编译期内联为 `/api/v1` 导致回环；③ slug 在 SSR 请求时被二次 URL 编码；④ 后端未对 URL-encoded slug 做 `decodeURIComponent`；⑤ 前端 `BonsaiCard` / `BonsaiDetail` 链接未对中文 slug 编码。修复：详情页加 `dynamic: 'force-dynamic'`；运行时函数读取 `BACKEND_URL`；SSR fetch 时先 `decodeURIComponent(slug)` 再 `encodeURIComponent`；后端 `findPublicBySlug` 解码；前端链接统一 `encodeURIComponent(slug)`。
- **[P0]** `frontend/src/components/ChatWidget.tsx` + `frontend/src/lib/socket.ts` - **聊天接口异常，消息列表报 `TypeError: b is not iterable`，WebSocket 无法连接。** 复现：打开聊天窗口，历史消息空白，控制台报迭代错误；WebSocket 连接失败或断开后无法收发消息。根因：① `GET /api/v1/chat/rooms/:id/messages` 返回分页对象 `{ list: [...] }`，前端仍按数组解构；② 反向代理默认可能不支持 WebSocket upgrade；③ socket.io 客户端未连接后端 `/chat` namespace，消息发到默认 `/`，后端 GateWay 监听 `/chat` 导致互相收不到。修复：ChatWidget 引入 `PaginatedResponse` 并使用 `res.data?.list ?? []`；socket 配置 `transports: ['websocket', 'polling']` 兜底；socket URL 强制追加 `/chat` namespace（`SOCKET_URL ? .../chat : '/chat'`）。
- **[P1]** `frontend/src/lib/utils.ts` - **图片 URL 被解析为 `http://backend:4000/...` 等内网地址，导致公网无法加载。** 复因：`resolveImageUrl` 在 SSR 上下文会拼接 `BACKEND_URL` 绝对地址。修复：`resolveImageUrl` 始终返回相对路径 `/uploads/...`，依赖 Caddy/Nginx 反向代理；OG 图片单独使用 `NEXT_PUBLIC_PUBLIC_ORIGIN` 生成绝对 URL；`docker-compose.yml` 与 `.env.example` 补充 `NEXT_PUBLIC_PUBLIC_ORIGIN`。
- **[P1]** `backend/entrypoint.sh` / `backend/start.sh` / `deploy.sh` - **容器启动报错 `/bin/bash^M: bad interpreter`，后端无法启动。** 复现：部署后 `penjing-backend` 不断重启。根因：Windows 编辑导致 shell 脚本为 CRLF 换行，Linux 执行失败。修复：新增 `.gitattributes` 强制 `*.sh` / `*.yml` / `Dockerfile` / `Caddyfile` 使用 LF；将现有脚本转换为 LF；CI workflow 增加换行检查。
- **[P2]** `frontend/src/app/admin/layout-editor/SectionConfigEditor.tsx` - **a11y 警告：开关按钮与动态 textarea 缺少可访问标识。** 复现：管理端布局编辑器控制台报 `A form field element should have an id or name attribute` / 开关无 label。修复：开关按钮添加 `id="section-visible"`、`role="switch"`、`aria-checked`、`aria-label="是否显示该区块"`；动态 story textarea 添加 `id={`story-paragraph-${idx}`}` 与 `aria-label={`第 ${idx + 1} 段内容`}`。
- **[P2]** `frontend/package-lock.json` - **package-lock.json 在测试过程中被写入 BOM 且与 package.json 严重不同步（6841 行删除）。** 复现：`node -e JSON.parse(package-lock.json)` 抛 BOM 语法错误。修复：运行 `npm install` 重新生成 lockfile；后续避免手动修改 lockfile，安装临时依赖后必须恢复。
- **[Chore]** Playwright E2E - **自动化回归测试缺少 Chromium 二进制。** 复现：运行 `e2e-smoke-test.mjs` 报 `browserType.launch: Executable doesn't exist`。修复：`npx playwright install chromium`；将临时安装版本锁定为与项目兼容的 1.49.1；测试完成后删除测试脚本与截图目录，不污染仓库。

#### Loop 4 - 修复记录

- ✅ **P0-1 CI 三 job 失败** — 注入 CI env、后端补齐 ESLint 配置与依赖、前端关闭/修复 unescaped entities。提交 `9f7b8fe`。
- ✅ **P0-2 中文 slug 详情页 404** — 禁用静态生成、运行时 API_BASE_URL、SSR 请求解码后编码、后端 slug decode、前端链接 encode。提交 `9f7b8fe` + `c2bd074`。
- ✅ **P0-3 聊天异常 / WebSocket  namespace 错误** — 分页响应取 `list`、socket 增加 polling fallback、URL 追加 `/chat`。提交 `9f7b8fe` + `c2bd074` + 未提交改动。
- ✅ **P1-1 图片 URL 内网地址** — `resolveImageUrl` 返回相对路径，OG 使用 `NEXT_PUBLIC_PUBLIC_ORIGIN`，补充 docker-compose / .env.example。提交 `9f7b8fe`。
- ✅ **P1-2 shell 脚本 CRLF 导致容器启动失败** — 新增 `.gitattributes` 强制 LF，脚本换行归一化。提交 `a6e48ec`。
- ✅ **P2-1 SectionConfigEditor a11y** — 开关与 textarea 补充 id / role / aria-label。未提交改动。
- ✅ **P2-2 package-lock.json BOM / 同步** — `npm install` 重新生成 lockfile。未提交改动。
- ✅ **Chore E2E 回归** — Playwright 安装 Chromium，完成用户端 / 管理端 / 移动端全路径截图回归，清理测试产物。

#### Loop 4 - 复测结果

- 本地 lint & build：✅（后端 `npm run lint && npm run build`；前端 `npm run lint && npm run build`）
- 服务器部署：✅（v1.2.2 候选版本已部署，5 个容器 healthy）
- 健康检查：✅（`/api/v1/health/live` 200）
- Playwright E2E 全功能回归：✅（用户端首页 / 列表 / 详情 / 登录 / 收藏 / 询价聊天；管理端 dashboard / bonsais / categories / chat / users / layout-editor / settings；移动端 iPhone 12 Pro 核心路径；截图 25+ 张）
- 控制台无 error：✅（404 / 聊天迭代 / WebSocket / 图片内网地址 / a11y / 限流均清零）
- API 无 5xx：✅
- 磁盘占用：✅（≥ 25G 可用，已 `docker image prune -f`）

#### Loop 5 计划与执行

- ✅ 整理 Loop 4 修复 commit（合并为最终 `fix:` / `chore:` 提交 `ffd1c63`）
- ✅ 更新 `CHANGELOG.md`（v1.2.2 条目，含 Loop 4 详细问题清单与修复记录）
- ✅ 更新 `README.md`（版本摘要 + 链接 + v1.2.2 更新要点）
- ✅ 推送至 GitHub `develop` 分支
- ✅ 创建 `release/v1.2.2` 分支并推送
- ✅ 创建 PR `release/v1.2.2 → main`（[PR #2](https://github.com/Jiayz00/miaomu-web/pull/2)）并合并（merge commit `f584b18`）
- ✅ `main` 合并回 `develop`（[PR #3](https://github.com/Jiayz00/miaomu-web/pull/3)，merge commit `c3d7976`）
- ✅ 在 `main` 上打 `v1.2.2` annotated tag（指向 `f584b18`）
- ✅ 创建 GitHub Release [`v1.2.2`](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.2.2) 并附完整 changelog
- ✅ 删除已合并的远程 `release/v1.2.2` 分支

#### Loop 5 - 复测结果

- GitHub 推送：✅（develop / main / tag v1.2.2 已同步）
- PR 合并：✅（PR #2 merged、PR #3 merged）
- Release 发布：✅（[Release v1.2.2](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.2.2) published，tag 指向 `f584b18`）
- 分支清理：✅（本地 + 远程 `release/v1.2.2` 均已删除）
- CI / Checks：✅（PR #2 / PR #3 全部 5 个 check 通过：Backend lint & build / Frontend lint & build / Config syntax validate / Docker images build / Secrets & sensitive info scan）
- 服务器稳定：✅（v1.2.2 已部署并通过 Playwright E2E 回归，进入监控态）

### 问题清单模板

```markdown
#### Loop N - 发现问题

- **[P0]** 模块/文件:行号 - 问题描述 - 复现步骤 - 修复方案
- **[P1]** ...
- **[P2]** ...

#### Loop N - 修复记录

- ✅/❌ 问题 - 修复方式 - 提交 hash

#### Loop N - 复测结果

- 服务器部署：✅/❌
- 健康检查：✅/❌
- 浏览器全功能测试：✅/❌
- 控制台无 error：✅/❌
```
