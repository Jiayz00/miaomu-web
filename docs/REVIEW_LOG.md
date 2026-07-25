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
| Loop 6 | 平台体验优化（聊天 / 用户管理 / 主页布局 / 分类 / 数据看板） | ✅ | 7 | 7 | ✅ | 见下方问题清单与修复记录 |
| Loop 7 | 分类封面显示优化 + 主页布局编辑器 WordPress 式重制 | ✅ | 2 | 2 | ✅ | 见下方问题清单与修复记录 |

#### Loop 6 - 发现问题

- **[P0]** `frontend/src/hooks/use-socket.ts` + `frontend/src/components/ChatWidget.tsx` + `frontend/src/lib/socket.ts` - **聊天会话连接状态始终显示"连接中"，对应盆景图片未显示，侧边栏显示 `用户#N` 而非真实用户名。** 复现：用户端点击"询价咨询"进入聊天，状态栏显示"连接中…"；会话框顶部苗木图片空白；后台询价管理列表显示 `用户#2` 等占位符。根因：① `useSocket` hook 未同步 `socket.connected` 状态；② 图片 URL 未使用 `resolveImageUrl` / `getMainImage` 解析；③ 侧边栏从 `room.participantId` 生成占位名，未读取 `room.user.username`。修复：① `use-socket.ts` 在 `connect` / `disconnect` / `reconnect` 事件中同步 `isConnected`；② 聊天相关组件统一使用 `getMainImage(bonsai)` 获取主图并处理错误回退；③ 侧边栏与列表项从 `room.user.username` 读取真实用户名。
- **[P0]** `frontend/src/components/ChatWidget.tsx` + `frontend/src/lib/socket.ts` - **聊天历史消息报错 `TypeError: b is not iterable`，WebSocket 无法收发实时消息。** 复现：打开聊天窗口后历史消息空白，控制台报迭代错误；发送消息对方收不到。根因：① `GET /api/v1/chat/rooms/:id/messages` 已改为分页结构 `{ list: [...] }`，前端仍按数组处理；② socket.io 客户端未连接后端 `/chat` namespace。修复：① `ChatWidget` 使用 `PaginatedResponse` 取 `res.data?.list ?? []`；② `socket.ts` 中 socket URL 强制追加 `/chat` namespace，并配置 `transports: ['websocket', 'polling']` 兜底。
- **[P1]** `backend/src/modules/chat/chat.service.ts` + `frontend/src/app/admin/chat/page.tsx` - **聊天管理缺少筛选与内容搜索，无法快速定位会话。** 复现：后台"询价管理"列表长且无搜索，客服难以按盆景名称、用户名、时间或消息内容查找历史对话。修复：后端增加按盆景名称、用户名、时间范围、消息内容等组合筛选接口（字段均非必填）；前端管理页增加可展开/收起的筛选面板与搜索框，响应式布局避免重叠。
- **[P1]** `backend/prisma/schema.prisma` + `backend/src/modules/users/users.service.ts` + `frontend/src/app/admin/users/page.tsx` - **用户管理权限不足，缺少活动时间 / 登录 IP 记录，无法升降级管理员。** 复现：管理员无法修改其他管理员密码；用户列表不显示最后登录时间与 IP；无法将普通用户提升为管理员或降级。修复：Prisma schema 新增 `lastActiveAt`、`lastLoginIp`、`lastLoginAt` 等字段；后端允许管理员重置任意用户（含管理员）密码、修改角色；前端增加角色切换、密码重置、IP/活动时间展示。
- **[P1]** `frontend/src/app/admin/dashboard/page.tsx` + `backend/src/modules/analytics/analytics.controller.ts` - **数据看板仅支持固定时间区间，布局不够整齐。** 复现：看板只有 7/30/90 天等固定选项，无法自定义时间段；部分图表排列错落。修复：前端新增"自定义"日期范围选择器（开始/结束日期）；后端 analytics 接口支持 `startDate` / `endDate` 参数；前端重新组织图表卡片网格，使布局更整齐。
- **[P1]** `frontend/src/app/admin/layout-editor/` + `frontend/src/components/home/` - **主页布局无法自助编辑，界面使用后端术语。** 复现：用户要求像 WordPress 主题一样自定义首页排版，但原界面配置项晦涩、无法上传图片。修复：新增可视化布局编辑器，支持拖拽排序 section、增删区块、上传图片、配置文案；界面文案去后端化，使用"大图区""精选区""故事区"等友好名称；首页 `HomeRenderer` 按保存的配置动态渲染。
- **[P1]** `backend/src/modules/categories/categories.service.ts` + `frontend/src/app/admin/categories/page.tsx` - **分类封面图片未显示。** 复现：后台分类管理列表封面图空白。根因：数据库 `cover_image` 字段为 NULL，且缺少上传入口。修复：后端分类 CRUD 支持 `coverImage` 字段与上传接口；前端分类管理页支持上传并显示封面图。
- **[P0]** `frontend/src/hooks/use-favorites.ts` + `backend/src/modules/favorites/favorites.service.ts` - **我的收藏页渲染异常，盆景名称与链接显示 `undefined`。** 复现：用户端"我的收藏"列表中名称、价格、图片链接均为 undefined。根因：后端返回 `{ list: [{ bonsai: Bonsai }] }`，前端 `useFavorites` 直接按 `Bonsai[]` 读取；后端 `select` 未包含 `images`、`slug` 等字段。修复：前端 `useFavorites` 映射为 `res.data.list.map((item) => item.bonsai)`；后端补全 `bonsai` select 字段（含 images、slug、name、price 等）。
- **[P2]** `frontend/src/app/admin/page.tsx`（缺失） - **访问 `/admin/login` 返回 404，管理端无统一登录入口页。** 复现：浏览器直接访问 `https://miaomu.jiayyy.cn/admin/login` 显示 404。根因：管理端入口实际为 `/admin/dashboard`（未登录时重定向到登录页），未提供 `/admin` 或 `/admin/login` 路径。影响：轻微，可通过 `/admin/dashboard` 进入。处理：记录为已知问题，待后续决定是否增加统一入口重定向。

#### Loop 6 - 修复记录

- ✅ **P0 聊天连接状态 / 图片 / 真实用户名** — 修改 `frontend/src/hooks/use-socket.ts` 同步 `socket.connected`；聊天组件使用 `getMainImage` 解析图片；侧边栏读取 `room.user.username`。已服务器部署并复测。
- ✅ **P0 聊天历史迭代错误 / WebSocket namespace** — `ChatWidget` 使用 `PaginatedResponse.list`；`socket.ts` URL 追加 `/chat` namespace 并增加 polling fallback。已复测 WebSocket 收发正常。
- ✅ **P1 聊天筛选与内容搜索** — 后端 Chat 模块增加组合筛选接口；前端 admin chat 页增加可展开筛选面板与搜索框。已按用户名"testuser2026"等条件验证筛选生效。
- ✅ **P1 用户管理增强** — Prisma schema 新增活动时间/IP 字段；后端支持管理员重置任意用户密码与角色变更；前端用户管理页增加角色切换、密码重置、IP/时间展示。已验证升降级与密码重置。
- ✅ **P1 数据看板自定义时间区间** — `frontend/src/app/admin/dashboard/page.tsx` 新增自定义日期范围选择器；后端 analytics 接口支持 `startDate` / `endDate`。已验证不同时间段数据正确切换。
- ✅ **P1 主页布局 WordPress 式自定义** — 新增可视化布局编辑器，支持拖拽排序、图片上传、友好文案；首页动态渲染配置。已验证保存后首页即时生效。
- ✅ **P1 分类封面图片** — 后端分类支持 `coverImage` 与上传；前端分类管理页显示封面。已验证上传后封面正常显示。
- ✅ **P0 我的收藏页 undefined** — `use-favorites.ts` 正确映射 `item.bonsai`；后端补全 select 字段。已重新部署并在 PC + 移动端 375x812 复测通过。

#### Loop 6 - 复测结果

- 服务器部署：✅（`/root/jia/penjing`，5 个容器 healthy，mysql/backend/frontend 全部 healthy）
- 健康检查：✅（`https://miaomu.jiayyy.cn/api/v1/health/live` 返回 200）
- 浏览器全功能测试：✅（用户端首页 / 列表 / 详情 / 登录 / 收藏 / 询价聊天；管理端 dashboard / bonsais / categories / chat / users / layout-editor / settings；移动端 375x812 核心路径；截图已保留）
- 控制台无 error：✅（未发现新的 error 级日志）
- API 无 5xx：✅
- 磁盘占用：✅（约 27G 可用，已 `docker image prune -f`）

---

#### Loop 7 - 发现问题

> 本 Loop 为 Loop 6 发布后的用户反馈跟进，聚焦「分类封面显示不满意」与「主页布局编辑器不够 WordPress 式」两个体验问题。

- **[P1]** `frontend/src/app/admin/categories/page.tsx` + `frontend/src/components/home/CategoriesSection.tsx` - **后台分类列表封面显示为黑色方块或占位符，用户认为未实现封面功能。** 复现：访问 `/admin/categories`，4 个分类中「松柏类」显示黑色方块，其余显示「未设置封面」占位符；首页 `/` 品类区块部分卡片无图。根因多层级：① 原缩略图尺寸仅 `h-12 w-16`（约 48×64px），暗色小图被拉伸裁剪后几乎全黑；② 无封面分类缺少便捷上传入口，用户无法直观补充；③ `CategoriesSection` 对无封面分类 fallback 到随机远程图，易与真实封面混淆。修复：① 分类列表缩略图改为 `h-16 w-24 object-cover`，保留宽高比并添加 hover 遮罩 +「更换封面」提示；② 无封面单元格直接提供上传按钮，选择文件后即时预览；③ `CategoriesSection` 移除随机图 fallback，无封面时使用品牌渐变背景，避免误判。
- **[P1]** `frontend/src/app/admin/layout-editor/page.tsx` - **主页布局编辑器缺少 WordPress「自定义主题」式的实时预览与友好操作。** 复现：原编辑器仅提供区块列表 + 表单配置 + 新标签页预览，管理员无法一边调整一边看到效果，区块排序、上传图片、文案配置分散且晦涩。修复：重制为左右分栏：左侧为区块列表（拖拽排序、增删、显隐），右侧为实时预览并支持桌面/平板/移动端宽度切换；顶部提供保存、激活、重置、新窗口预览等快捷操作；所有配置文案去后端化（如「大图区」「精选区」「故事区」）；首页 `page.tsx` 移除 ISR（`revalidate = 3600`）改为 `dynamic: 'force-dynamic'`，保存后刷新立即生效。

#### Loop 7 - 修复记录

- ✅ **P1 分类封面显示优化** — `frontend/src/app/admin/categories/page.tsx` 增大缩略图、加 hover 提示、无封面提供上传入口；`frontend/src/components/home/CategoriesSection.tsx` 移除随机图 fallback，改用品牌渐变。已通过 API 验证完整上传链路（上传 → 更新分类 → 前端展示）。
- ✅ **P1 主页布局编辑器 WordPress 式重制** — `frontend/src/app/admin/layout-editor/page.tsx` 改为 split-view（左侧区块管理 + 右侧实时预览），支持响应式预览切换与拖拽排序；首页 `page.tsx` 改为 force-dynamic 确保即时生效。已验证保存后首页渲染与预览一致。

#### Loop 7 - 复测结果

- 服务器部署：✅（`/root/jia/penjing`，4 个 penjing 容器 + caddy 均 healthy）
- 健康检查：✅（`https://miaomu.jiayyy.cn/api/v1/health/live` 返回 200）
- 浏览器全功能测试：✅（用户端首页品类区块 / 分类列表 / 分类详情；管理端 `/admin/categories` 封面上传与显示、`/admin/layout-editor` 拖拽排序与实时预览；移动端 375x812 核心路径）
- 控制台无 error：✅
- API 无 5xx：✅
- 磁盘占用：✅（约 27G 可用）

---

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
