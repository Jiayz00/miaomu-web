# 变更日志（CHANGELOG）

> 本文件按版本倒序记录 Penjing 盆景艺术展示与销售平台的所有显著变更。
> 版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)，
> 内容格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。
>
> 每个版本提供 GitHub Release / Tag 跳转链接，便于追溯。

## 目录

- [v1.2.2](#v122---2026-07-25) — CI 修复 / 中文 slug 404 / 聊天 WebSocket / 图片 URL / shell CRLF
- [v1.2.1](#v121---2026-07-24) — 服务器实测复测修复（SSR / ORB / 限流 / a11y）
- [v1.2.0](#v120---2026-07-24) — 管理端布局编辑 / 视频上传 / 收藏筛选 / UI 全面优化
- [v1.1.0](#v110---2026-07-22) — 十轮严格审查修复（安全 / QA / 性能 / a11y / DevOps）
- [v1.0.0](#v100---2026-07-20) — 盆景艺术展示与销售平台全栈首版

---

## [v1.2.2] - 2026-07-25

> **Tag**: [`v1.2.2`](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.2.2)
> **Release**: [v1.2.2 — CI 修复 / 中文 slug 404 / 聊天 WebSocket / 图片 URL / shell CRLF](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.2.2)
> **范围**：PATCH 版本，修复 CI pipeline、中文 slug 详情页 404、聊天异常、图片 URL 与部署脚本换行等关键问题

### 修复（Fixed）

#### Loop 4 关键问题修复

- **[P0] GitHub Actions CI 三 job 全失败（Backend lint & build / Config syntax validate / Frontend lint & build）**
  - `.github/workflows/ci.yml`：注入 `DATABASE_URL` / `REDIS_URL` / `JWT_SECRET` / `JWT_REFRESH_SECRET` / `ADMIN_DEFAULT_PASSWORD` 占位 env，解决 docker compose config 校验失败
  - `backend/package.json` + `backend/.eslintrc.js` + `backend/tsconfig.eslint.json`：新增 TypeScript ESLint 配置与 `@typescript-eslint/*` 依赖，补齐 `npm run lint`
  - `frontend/.eslintrc.json`：关闭 `react/no-unescaped-entities` 规则；将文案中的英文双引号改为中文引号，消除 lint error
- **[P0] 中文 slug 盆景详情页 404**
  - `frontend/src/app/(user)/bonsais/[slug]/page.tsx`：添加 `dynamic: 'force-dynamic'` 禁用静态生成；SSR 阶段使用运行时 `getApiBaseUrl()` 读取 `BACKEND_URL`；请求 URL 构建时先 `decodeURIComponent(slug)` 再 `encodeURIComponent(slug)`，避免二次编码
  - `backend/src/modules/bonsais/bonsais.service.ts`：`findPublicBySlug` 对 URL-encoded slug 执行 `decodeURIComponent`
  - `frontend/src/components/BonsaiCard.tsx` + `frontend/src/app/(user)/bonsais/[slug]/BonsaiDetail.tsx`：链接统一使用 `encodeURIComponent(slug)` 处理中文 slug
- **[P0] 聊天接口异常 / WebSocket 无法收发消息**
  - `frontend/src/components/ChatWidget.tsx`：引入 `PaginatedResponse`，历史消息从分页对象取 `res.data?.list ?? []`
  - `frontend/src/lib/socket.ts`：配置 `transports: ['websocket', 'polling']` 作为反向代理不支持 WebSocket upgrade 时的兜底；socket URL 强制追加 `/chat` namespace（`SOCKET_URL ? .../chat : '/chat'`），与后端 `ChatGateway` 监听的 `/chat` 对齐
- **[P1] 图片 URL 解析为内网后端地址 `http://backend:4000/...`**
  - `frontend/src/lib/utils.ts`：`resolveImageUrl` 始终返回相对路径 `/uploads/...`，依赖 Caddy/Nginx 反向代理；OG 图片单独使用 `NEXT_PUBLIC_PUBLIC_ORIGIN` 生成公网绝对 URL
  - `docker-compose.yml` + `.env.example`：补充 `NEXT_PUBLIC_PUBLIC_ORIGIN` 环境变量
- **[P1] 部署后容器启动失败 `/bin/bash^M: bad interpreter`**
  - 新增 `.gitattributes`：强制 `*.sh` / `*.yml` / `Dockerfile` / `Caddyfile` 使用 LF 换行
  - 将 `backend/entrypoint.sh` / `backend/start.sh` / `deploy.sh` 等脚本转换为 LF 换行
  - `.github/workflows/ci.yml`：增加换行检查，防止 CRLF 提交
- **[P2] 管理端布局编辑器 a11y 警告**
  - `frontend/src/app/admin/layout-editor/SectionConfigEditor.tsx`：显隐开关添加 `id="section-visible"`、`role="switch"`、`aria-checked`、`aria-label="是否显示该区块"`；story 段落 textarea 添加 `id={`story-paragraph-${idx}`}` 与 `aria-label={`第 ${idx + 1} 段内容`}`
- **[P2] `frontend/package-lock.json` BOM / 同步异常**
  - 运行 `npm install` 重新生成 lockfile，移除 BOM，恢复与 `package.json` 的一致性

### 变更（Changed）

- **`AGENTS.md`**
  - 新增 Loop 4 / Loop 5 行与详细问题清单、修复记录、复测结果
  - 扩展"常见提交问题与解决办法"表格：新增 shell CRLF、图片内网地址、聊天分页、WebSocket namespace、lockfile BOM、Playwright 二进制、PowerShell 分隔符等条目
- **`.gitignore`**
  - 新增 `.test-browser/`、`ci-logs/` 等浏览器测试产物忽略规则

### 部署（Deployment）

- 服务器部署位置：`/root/jia/penjing`（5 容器 healthy）
- 数据卷保留：`penjing-mysql` / `penjing-redis` 数据未受影响
- 健康检查：`/api/v1/health/live` 返回 200
- Playwright E2E 全功能回归：用户端首页 / 列表 / 详情 / 登录 / 收藏 / 询价聊天；管理端 dashboard / bonsais / categories / chat / users / layout-editor / settings；移动端 iPhone 12 Pro 核心路径全部通过
- 控制台无 error，API 无 5xx

### 提交记录

| Hash | 类型 | 说明 |
|------|------|------|
| `9f7b8fe` | fix | 修复 Docker build 失败、商品 404、聊天异常与图片 URL |
| `c2bd074` | fix | 中文 slug 详情 404 与 WebSocket 连接兜底 |
| `a6e48ec` | fix | 强制 shell 脚本与配置文件使用 LF 换行，修复容器 start.sh 执行失败 |

---

## [v1.2.1] - 2026-07-24

> **Tag**: [`v1.2.1`](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.2.1)
> **Release**: [v1.2.1 — 服务器实测复测修复（SSR / ORB / 限流 / a11y）](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.2.1)
> **范围**：PATCH 版本，修复服务器实际部署后的若干关键 bug

### 修复（Fixed）

#### Loop 1 服务器实测发现的问题

- **[P0] SSR API_BASE_URL 编译期内联导致盆景详情页 404**
  - `frontend/src/lib/constants.ts`：移除模块顶层 `API_BASE_URL` 常量（webpack 会在 build 时把当时的值内联进 bundle，导致 SSR 阶段容器内 `BACKEND_URL` 环境变量失效，回环调用自身）
  - 改写为运行时函数 `getApiBaseUrl()` / `getBackendOrigin()` / `getPublicOrigin()`，每次调用实时读取环境变量
  - `api.ts` 与 `utils.ts` 在 `request()` / `getApiBaseUrl()` 内每次调用函数取值
- **[P1] ORB 拦截 `images.unsplash.com` 远程图片**
  - 所有 unsplash 图片 URL 替换为 `picsum.photos/seed/xxx/W/H`
  - `frontend/next.config.js` 的 `images.remotePatterns` 移除 `images.unsplash.com`，仅保留 `picsum.photos` + `localhost` + 环境变量扩展
  - admin 主页布局编辑器的占位图同步更新
- **[P1] 列表页"年份"筛选器渲染 127 个按钮（1900-2026）**
  - `frontend/src/lib/constants.ts` 的 `YEAR_OPTIONS` 改为生成近 10 年（今年 - 9 到今年），从 127 → 10 个按钮
  - FilterPanel / BonsaiForm 等 3 处自动受益
- **[P2] a11y 警告：搜索表单字段缺少 `id` / `name` 属性**
  - `frontend/src/app/(user)/bonsais/page.tsx` 给搜索 input 添加 `id="bonsai-search-input"` + `name="bonsai-search"`
  - `frontend/src/app/admin/bonsais/page.tsx` 添加 `id="admin-bonsai-search"` + `name="admin-bonsai-search"`
  - `frontend/src/app/admin/users/page.tsx` 添加 `id="admin-user-search"` + `name="admin-user-search"`
- **[P2] 文档端口不一致**
  - `AGENTS.md` 容器架构与健康检查命令的 `:1688` 全部修正为 `:443`（Caddy 默认 HTTPS 端口）

#### Loop 2 服务器实测发现的问题

- **[P0] 管理后台限流 429 误触发**
  - `backend/src/app.module.ts`：移除全局 `'auth'` 限流器注册（NestJS Throttler v5+ 的 `ThrottlerGuard` 会检查**所有**全局命名限流器，全局 `'auth': 5/min` 会导致所有 admin 路由被错误限制到 5/min，admin layout 加载 dashboard 一次就触发 9+ API 而被 429）
  - 全局 `'default'` 限流从 `100/min` 提升到 `300/min`（管理后台单次页面加载约 8-10 API + 轮询 + RSC 预取，需充足配额）
  - `backend/src/modules/auth/auth.controller.ts`：`register` / `login` / `refresh` / `change-password` 装饰器从 `@Throttle({ auth: 5 })` 改为 `@Throttle({ default: 5 })`，在认证路由上仍保留 5/min 防暴力破解

### 变更（Changed）

- **`AGENTS.md` Loop 进度表**
  - 新增 Loop 1 / Loop 2 行 + 详细问题清单 + 修复记录 + 复测结果
  - 新增 Loop 3 计划（GitHub v1.2.1 Release 发布）

### 部署（Deployment）

- 服务器部署位置：`/root/jia/penjing`（5 容器 healthy）
- 数据卷保留：`penjing-mysql` / `penjing-redis` 数据未受影响
- 健康检查：`/api/v1/health/live` 返回 200
- 浏览器全功能复测：用户端首页 / 列表 / 详情 / 登录；管理端 dashboard / bonsais / categories / chat / users / layout-editor / settings 全部通过
- 控制台无 error

### 已澄清（Clarified）

- `frontend/src/lib/api.ts` 72 处 `api.get<{ data: T }>` 调用**均正确**。后端实际响应结构为 `{ success, data, message }`，前端 `res.data` 访问与 `request<T>` 实现匹配，**非泛型错误**。

---

## [v1.2.0] - 2026-07-24

> **Tag**: [`v1.2.0`](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.2.0)
> **Release**: [v1.2.0 — 管理端布局编辑 / 视频上传 / 收藏筛选 / UI 全面优化](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.2.0)
> **范围**：MINOR 版本，向下兼容新增功能 + 数据库 schema 变更

### 新增（Added）

#### 后端

- **站点设置模块**（`backend/src/modules/settings/`）
  - 公开接口 `GET /api/v1/settings` 返回站点联系方式、分类页布局、首页布局配置
  - 管理员接口 `PUT /api/v1/admin/settings`、`PUT /api/v1/admin/settings/categories-layout`、`PUT /api/v1/admin/settings/site-layout`
  - 模块初始化时幂等写入默认配置，已存在的 key 不覆盖
  - 嵌套对象校验：`@ValidateNested()` + `@Type()` 保证 `categoriesLayout`、`siteLayout` 子字段类型正确
- **视频上传支持**
  - `upload` 模块支持图片与视频，单图上限 30MB、单视频上限 1GB，均不限数量
  - 文件类型/大小校验，文件名随机化，存储路径校验
- **Prisma schema 变更**
  - `Bonsai` 新增视频字段
  - 新增 `SiteSetting` / `SiteLayout` 模型
  - 新增两条 migrations：`20260725000000_add_video_and_site_settings`、`20260726000000_add_site_layout`

#### 前端

- **管理端布局编辑器**（`frontend/src/app/admin/layout-editor/`）
  - 首页可视化编辑：section 增删 / 排序 / 显隐 / 文案配置
  - 实时预览，保存后立即生效
- **分类页排版编辑器**（`frontend/src/app/admin/categories/CategoriesLayoutEditor.tsx`）
  - 三种布局：网格 / 瀑布流 / 列表
  - 卡片宽高比（4/5、1/1、3/4、16/9）、列数（2/3/4）、排序方式可配
  - 文案（标题、副标题、eyebrow）、显隐开关（描述、箭头、遮罩）
- **站点设置页**（`frontend/src/app/admin/settings/`）
  - 联系电话、地址、邮箱、微信等内容可配置，可选择是否展示
- **收藏筛选面板**（`frontend/src/components/FavoritesFilterPanel.tsx`）
  - 桌面端：常驻侧栏；移动端：抽屉式
  - 支持搜索、分类、价格区间、产地、年份筛选与多种排序
- **首页可配置渲染**（`frontend/src/components/home/`）
  - Hero / 分类 / 精选 / 展示 / 统计 / CTA / 故事 / 联系 / 盆景网格等 section 组件
  - `HomeRenderer` 按配置动态渲染
- **工具与 Hook**
  - `use-debounced.ts`：防抖 Hook
  - `default-layout.ts` / `default-categories-layout.ts`：默认配置与工具函数

### 修复（Fixed）

- **SSR 404 / 图片无法显示**：新增 `resolveApiBaseUrl`、`resolveImageUrl`、`resolvePublicImageUrl`，统一处理 SSR/CSR 绝对路径与相对路径
- **next.config.js 代理**：新增 `/uploads/*` 与 `/api/*` rewrite，修复开发环境图片与 SSR 接口 404
- **OG 图片渲染**：新增 `PUBLIC_ORIGIN` 环境变量，社交分享时使用外部可访问 URL
- **头像回退**：所有 `<img>` 头像添加 `onError` 回退与 `resolveImageUrl`
- **分类页错误状态误判 404**：区分 `isError` 与 `!category`，错误时显示错误 UI 而非 404
- **BonsaiCard 长文本溢出**：产地/年份添加 `truncate`
- **分页小屏横向溢出**：添加 `flex-wrap`
- **FilterPanel 移动端无动画**：引入 `AnimatePresence` + `motion.div` 滑入滑出
- **DTO 嵌套校验失效**：补充 `@ValidateNested()` + `@Type()` 装饰器
- **配置合并 null 覆盖默认值**：合并时过滤 `null` / `undefined`，`updateConfig` 重新读取数据库保证一致

### 优化（Changed）

- **UI 层次感与光影**：增加阴影、过渡、悬浮反馈，色彩搭配更柔和
- **点击反馈**：按钮/卡片/操作项添加 `hover` / `active` 状态
- **响应式适配**：PC 端与移动端布局、字号、间距全面调优
- **a11y**：WCAG 2.1.2 / 4.1.2 / 4.1.3 合规（Esc 关闭模态、`role=dialog`、`aria-modal`、`aria-live` 等）
- **触摸目标**：移动端按钮触控区域符合 WCAG 标准
- **统一响应包装**：`TransformInterceptor` 支持 `skipTransform` 元数据跳过包装

### 杂项（Chore）

- `.gitignore` 新增 `.test-browser/`、`Caddyfile.new` 忽略规则
- `docker-compose.yml` 调整端口与卷映射以适配 Caddy 反代部署
- `.env.example` 新增 `PUBLIC_ORIGIN`、上传上限、站点设置相关占位符

### 提交记录

| Hash | 类型 | 说明 |
|------|------|------|
| `62973b7` | chore(gitignore) | 忽略浏览器测试产物与临时 Caddy 配置 |
| `737c17f` | feat(backend) | 新增站点设置模块、视频上传支持与 schema 变更 |
| `bf34590` | feat(frontend) | 管理端布局编辑、收藏筛选与 UI 全面优化 |
| `5560045` | chore(deploy) | 更新 docker-compose 与环境变量模板 |

---

## [v1.1.0] - 2026-07-22

> **Tag**: [`v1.1.0`](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.1.0)
> **Release**: [v1.1.0 — 十轮严格审查修复](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.1.0)
> **范围**：MINOR 版本，十轮多视角审查后的安全 / QA / 性能 / a11y / DevOps 全面修复

### 新增（Added）

- 统一登录入口：管理员与普通用户共用 `/api/v1/auth/login`，由后端 role 区分
- 防水平/垂直越权：用户态接口通过 `user.sub` 隔离，管理员接口由 `AdminGuard` + `Roles(ADMIN)` 守卫
- JWT 安全增强：Access Token 携带 jti，登出加入黑名单；Refresh Token 一次性轮换
- 账号防枚举：登录失败统一返回"账号或密码错误"
- 限流防护：认证接口 5 次/分钟，全局 100 次/分钟
- CSP / 安全头（HSTS / X-Frame-Options 等）

### 修复（Fixed）

- 安全：SQL 注入（Prisma 参数化）、XSS（输出转义 + CSP）、CSRF、开放重定向
- 性能：请求超时控制、内存泄漏防护、debounce 搜索
- 错误处理：统一异常过滤器，标准化错误响应格式

### 优化（Changed）

- DevOps：Docker 健康检查、Nginx/Caddy 反代配置
- 数据库：索引与外键策略优化
- 测试：补充单元测试与集成测试

### 后续补丁（v1.1.x，合入 develop，未单独发版）

| Hash | 类型 | 说明 |
|------|------|------|
| `0eff348` | fix(auth) | 修复登录响应数据解构错误导致登录态不显示 |
| `798279e` | fix(chat) | 修复 CORS origin 字符串类型导致聊天网关启动崩溃 |
| `8a51ab3` | fix(deploy) | 修复后端健康检查 URL 缺少 /api/v1 前缀 |
| `a8592ba` | fix(deploy) | 移除 nginx 服务，暴露前后端端口供 Caddy 反代 |

---

## [v1.0.0] - 2026-07-20

> **Tag**: [`v1.0.0`](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.0.0)
> **Release**: [v1.0.0 — 盆景艺术展示与销售平台全栈首版](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.0.0)
> **范围**：MAJOR 版本，全栈首版发布

### 新增（Added）

- **用户端**
  - 盆景浏览（分页、筛选、搜索、分类）
  - 盆景详情（多图画廊、规格信息）
  - 用户注册/登录（支持用户名或邮箱）
  - 询价聊天（WebSocket 实时通信）
  - 收藏管理、个人中心
- **管理端**
  - 数据看板（浏览量、收藏量、用户数、盆景数统计）
  - 盆景管理（CRUD + 多图上传）
  - 分类管理、用户管理（启用/禁用）、询价会话处理
- **基础设施**
  - Next.js 14 + NestJS 10 + Prisma 5 + MySQL 8 + Redis 7 + Socket.io 4
  - Docker Compose 一键部署
  - Caddy 自动 HTTPS 反向代理

### 提交记录

| Hash | 类型 | 说明 |
|------|------|------|
| `bce41e7` | feat | 盆景艺术展示与销售平台 - 全栈实现 |
| `32d0ed0` | feat(auth) | 优化登录权限区分、个人中心、登录稳定性与安全防护 |

---

## 版本管理说明

- 版本号：`v<MAJOR>.<MINOR>.<PATCH>`，遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)
- 分支模型：Git Flow 精简版（`main` / `develop` / `feature/*` / `fix/*` / `release/*` / `hotfix/*`）
- 提交规范：[Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/)
- 详细规范参见 [AGENTS.md](AGENTS.md) 的"版本管理规范"章节
