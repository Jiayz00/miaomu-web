# AGENTS.md - 盆景网站开发 Vibecoding 框架

> 本文件是 AI Agent 协作开发的统一规范，所有 Agent 必须严格遵守。

## 项目概述

**项目名称**：Penjing（盆景艺术展示与销售平台）
**目标**：构建一个具有呼吸感、高级感的盆景展示网站，含完整的前后端、管理员数据分析、用户询价聊天等功能，支持一键服务器部署。
**GitHub 仓库**：https://github.com/Jiayz00/miaomu-web
**部署服务器**：敏感信息，不写入仓库（详见"脱敏规范"章节）

## 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端框架 | Next.js (App Router) | 14.x | SSR + 静态生成，SEO 友好 |
| 前端语言 | TypeScript | 5.x | 类型安全 |
| 样式 | TailwindCSS | 3.x | 原子化 CSS，快速开发 |
| 动画 | Framer Motion | 11.x | 呼吸感、高级感动效 |
| 后端框架 | NestJS | 10.x | 模块化、依赖注入、装饰器 |
| ORM | Prisma | 5.x | 类型安全数据库操作 |
| 数据库 | MySQL | 8.0 | 关系型数据库 |
| 缓存 | Redis | 7.x | 会话、限流、缓存 |
| 实时通信 | Socket.io | 4.x | 询价聊天 |
| 认证 | JWT + bcrypt | - | Access + Refresh Token |
| 容器化 | Docker + Compose | - | 一键部署 |
| 反向代理 | Nginx | - | SSL、负载均衡、静态资源 |

## 目录结构

```
盆景网站开发/
├── AGENTS.md                    # 本文件 - Agent 协作规范
├── README.md                    # 项目说明
├── .gitignore
├── .env.example                 # 环境变量模板（不含敏感值）
├── docker-compose.yml           # 生产部署编排
├── docker-compose.dev.yml       # 开发环境编排
├── Makefile                     # 常用命令快捷方式
├── docs/                        # 项目文档
│   ├── PRD.md                   # 产品需求文档
│   ├── ARCHITECTURE.md          # 技术架构设计
│   ├── TASKS.md                 # 任务拆解清单
│   ├── SECURITY.md              # 安全审查清单
│   └── DEPLOYMENT.md            # 部署手册
├── backend/                     # NestJS 后端
│   ├── src/
│   │   ├── modules/             # 业务模块
│   │   │   ├── auth/            # 认证授权
│   │   │   ├── users/           # 用户管理
│   │   │   ├── bonsais/         # 盆景商品
│   │   │   ├── categories/      # 分类管理
│   │   │   ├── favorites/       # 收藏功能
│   │   │   ├── chat/            # 询价聊天
│   │   │   ├── upload/          # 图片上传
│   │   │   ├── analytics/       # 数据分析
│   │   │   └── admin/           # 管理员专属
│   │   ├── common/              # 公共模块（guards, decorators, filters, interceptors）
│   │   ├── config/              # 配置管理
│   │   ├── prisma/              # Prisma 服务
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma        # 数据库模型
│   │   ├── seed.ts              # 种子数据
│   │   └── migrations/          # 数据库迁移
│   ├── test/                    # 测试
│   ├── Dockerfile
│   └── package.json
├── frontend/                    # Next.js 前端（用户端 + 管理端）
│   ├── src/
│   │   ├── app/                 # App Router
│   │   │   ├── (user)/          # 用户端路由组
│   │   │   │   ├── page.tsx     # 首页
│   │   │   │   ├── bonsais/     # 盆景列表/详情
│   │   │   │   ├── chat/        # 询价聊天
│   │   │   │   └── favorites/   # 收藏
│   │   │   ├── admin/           # 管理端路由
│   │   │   │   ├── dashboard/   # 数据看板
│   │   │   │   ├── bonsais/     # 商品管理
│   │   │   │   ├── categories/  # 分类管理
│   │   │   │   └── users/       # 用户管理
│   │   │   └── layout.tsx
│   │   ├── components/          # 通用组件
│   │   ├── lib/                 # 工具库、API 客户端
│   │   ├── hooks/               # 自定义 Hooks
│   │   ├── stores/              # 状态管理（Zustand）
│   │   └── styles/              # 全局样式
│   ├── public/                  # 静态资源
│   ├── Dockerfile
│   └── package.json
└── nginx/                       # Nginx 配置
    ├── nginx.conf
    └── ssl/                     # SSL 证书（部署时生成）
```

## 开发流程规范

### 必须遵守的流程阶段

每个功能开发必须按以下阶段进行，**不得跳过**：

1. **需求分析** → 明确功能目标、输入输出、边界条件
2. **任务拆解** → 分解为可独立验证的子任务
3. **任务计划** → 制定执行顺序，识别依赖关系
4. **代码开发** → 遵循编码规范，编写可维护代码
5. **Review 验证** → 自测 + CodeRabbit 审查 + 修复

### 阶段产出物要求

| 阶段 | 产出物 | 位置 |
|------|--------|------|
| 需求分析 | PRD 更新、Task 标记 | docs/PRD.md, docs/TASKS.md |
| 代码开发 | 可运行代码 + 提交记录 | backend/, frontend/ |
| Review 验证 | 审查报告 + 修复提交 | CodeRabbit 评论 |

## Agent 行为准则

### 效率原则（Token 节约）

1. **禁止重复操作**：已完成的流程/审批/部署，不得重复执行
2. **禁止重复审批**：已获批准的项目指令，不再二次请求确认
3. **增量开发**：优先编辑现有文件，非必要不创建新文件
4. **批量执行**：无依赖的操作并行执行，减少往返
5. **上下文感知**：执行前检查当前状态，避免无效操作

### 编码规范

1. **TypeScript 优先**：前后端均使用 TypeScript，禁止 `any`（特殊情况加注释）
2. **命名约定**：
   - 文件：`kebab-case`（`bonsai.service.ts`）
   - 类名：`PascalCase`（`BonsaiService`）
   - 变量/函数：`camelCase`（`getBonsaiList`）
   - 常量：`UPPER_SNAKE_CASE`（`MAX_FILE_SIZE`）
   - 数据库表：`snake_case`（`bonsai_images`）
3. **API 设计**：RESTful 风格，资源名复数，版本前缀 `/api/v1`
4. **错误处理**：统一异常过滤器，标准化错误响应格式
5. **日志记录**：关键操作记录日志，不记录敏感信息

### 安全规范

1. **输入验证**：所有 API 输入使用 `class-validator` DTO 校验
2. **SQL 注入防护**：使用 Prisma 参数化查询，禁止拼接 SQL
3. **XSS 防护**：前端输出转义，CSP 头部配置
4. **认证授权**：JWT + RBAC，管理员/用户权限严格隔离
5. **速率限制**：API 限流，防止暴力破解
6. **敏感数据**：密码 bcrypt 哈希，密钥环境变量管理，`.env` 不入库
7. **文件上传**：类型/大小校验，文件名随机化，存储路径校验

### Git 提交规范

```
<type>(<scope>): <subject>

<body>
```

**type**: `feat`（新功能）/ `fix`（修复）/ `refactor`（重构）/ `docs`（文档）/ `style`（样式）/ `test`（测试）/ `chore`（构建/工具）/ `security`（安全）

**示例**：
```
feat(bonsais): 实现盆景商品CRUD与图片上传

- 新增盆景模块：创建/读取/更新/删除
- 图片上传：多图上传，Sharp 压缩优化
- 分类关联：盆景与分类多对一关系
```

## 数据库设计概要

核心模型：`User`、`Bonsai`、`Category`、`BonsaiImage`、`Favorite`、`ChatRoom`、`ChatMessage`、`ViewLog`

详见 `docs/ARCHITECTURE.md` 和 `backend/prisma/schema.prisma`。

## API 路由规划

### 用户端（无需认证 / 用户认证）
- `POST /api/v1/auth/register` - 注册
- `POST /api/v1/auth/login` - 登录
- `POST /api/v1/auth/refresh` - 刷新 Token
- `GET /api/v1/bonsais` - 盆景列表（分页/筛选/搜索）
- `GET /api/v1/bonsais/:id` - 盆景详情
- `GET /api/v1/categories` - 分类列表
- `POST /api/v1/favorites` - 收藏/取消收藏
- `GET /api/v1/favorites` - 我的收藏
- `POST /api/v1/chat/rooms` - 创建询价会话
- `GET /api/v1/chat/rooms` - 我的会话列表
- `GET /api/v1/chat/rooms/:id/messages` - 会话消息

### 管理员端（需管理员认证）
- `GET /api/v1/admin/dashboard` - 数据看板
- `POST /api/v1/admin/bonsais` - 创建盆景
- `PUT /api/v1/admin/bonsais/:id` - 更新盆景
- `DELETE /api/v1/admin/bonsais/:id` - 删除盆景
- `POST /api/v1/admin/categories` - 创建分类
- `PUT /api/v1/admin/categories/:id` - 更新分类
- `DELETE /api/v1/admin/categories/:id` - 删除分类
- `POST /api/v1/admin/upload` - 图片上传
- `GET /api/v1/admin/users` - 用户列表
- `GET /api/v1/admin/analytics/views` - 浏览量分析
- `GET /api/v1/admin/analytics/favorites` - 收藏量分析

## 环境变量

所有敏感配置通过 `.env` 文件注入，`.env.example` 提供模板：

- `DATABASE_URL` - MySQL 连接字符串
- `REDIS_URL` - Redis 连接字符串
- `JWT_SECRET` - JWT 签名密钥
- `JWT_REFRESH_SECRET` - Refresh Token 密钥
- `UPLOAD_DIR` - 上传文件目录
- `ADMIN_DEFAULT_PASSWORD` - 管理员初始密码（仅首次启动）

## 部署架构

```
Internet → Nginx (443/80) → Next.js Frontend (3000)
                          → NestJS Backend (4000) → MySQL (3306)
                                                   → Redis (6379)
Socket.io ← Nginx ← Backend
```

- 前端：Next.js standalone 模式，Nginx 反向代理
- 后端：NestJS Node 进程，PM2 管理（Docker 内）
- 数据库：MySQL 8.0 容器，数据卷持久化
- 缓存：Redis 7 容器
- SSL：Let's Encrypt 自动证书

## 注意事项

1. **服务器资源**：部署目录为敏感信息（不写入仓库），迭代时清理旧版本，不保留冗余文件
2. **一键部署**：`docker compose up -d` 即可启动全部服务
3. **数据迁移**：Prisma migrate 自动执行
4. **种子数据**：首次部署自动创建管理员账号 + 示例盆景数据
5. **健康检查**：各容器配置 healthcheck，Nginx 健康检查后端

## 版本管理规范（强制执行）

> 本规范参考 GitLab EE、Next.js、Vue、NestJS 等高星项目的版本管理实践，
> 结合盆景项目大小版本区分需求制定。**所有 Agent 必须严格遵守**，
> 确保版本可回溯、小改可追溯、大改有节点、线上始终是最新稳定版的组合。

### 分支模型（Git Flow 精简版）

| 分支 | 用途 | 生命周期 | 保护规则 |
|------|------|----------|----------|
| `main` | 生产稳定版，始终可部署 | 永久 | 禁止直推，仅通过 PR 合入；合并即触发部署 |
| `develop` | 开发集成分支，最新功能组合 | 永久 | 允许 Agent 合入，但必须通过自测 |
| `feature/<scope>-<short-desc>` | 新功能开发 | 临时，合并后删除 | 从 `develop` 切出，PR 合回 `develop` |
| `fix/<scope>-<short-desc>` | Bug 修复 | 临时，合并后删除 | 从 `develop` 切出，PR 合回 `develop` |
| `hotfix/<scope>-<short-desc>` | 生产紧急修复 | 临时，合并后删除 | 从 `main` 切出，同时合回 `main` 和 `develop` |
| `release/v<x.y.z>` | 版本预发布与验收 | 临时，发布后删除 | 从 `develop` 切出，仅允许元数据/bug 修改 |

### 语义化版本（Semantic Versioning）

版本号格式：`v<MAJOR>.<MINOR>.<PATCH>`，例如 `v1.2.3`

| 位 | 何时递增 | 示例 |
|----|----------|------|
| MAJOR | 不兼容的 API/数据库变更、架构重构 | `v1.0.0` → `v2.0.0` |
| MINOR | 向下兼容的新功能、新模块、UI 大改 | `v1.0.0` → `v1.1.0` |
| PATCH | 向下兼容的 Bug 修复、文案、样式微调 | `v1.0.0` → `v1.0.1` |

**预发布版本**（可选）：`v1.0.0-rc.1`、`v1.0.0-beta.2`，用于发布前验收。

### 大版本 vs 小改动判定

| 类型 | 判定标准 | 流程 |
|------|----------|------|
| **大版本**（新建分支 + tag） | 新增模块 / 数据库 schema 变更 / API 破坏性变更 / 前端整体重构 / 安全机制改造 | `develop` → `release/vX.Y.0` → 验收 → 合 `main` → 打 tag `vX.Y.0` |
| **小改动**（小分支迭代溯源） | Bug 修复 / 单个组件优化 / 文案调整 / 样式微调 / 性能优化 | `develop` → `fix/feature-xxx` → PR 合 `develop`；积累若干小改后通过 release 分支打包发版 |
| **紧急修复**（hotfix） | 生产环境线上 Bug，必须立即修复 | `main` → `hotfix/xxx` → PR 合 `main` + `develop` → 打 tag `vX.Y.Z+1` |

### Tag 与 Release 规范

1. **每个大版本必须打 tag**：`git tag -a vX.Y.0 -m "release: vX.Y.0 简要说明"`
2. **每个 patch 修复也打 tag**：`git tag -a vX.Y.Z -m "fix: vX.Y.Z 修复说明"`
3. **GitHub Release**：大版本（MINOR/MAJOR）必须在 GitHub 创建 Release，附 changelog
4. **Changelog 来源**：使用 Conventional Commits 自动生成（见下）

### Conventional Commits（强制）

所有提交信息必须遵循 Conventional Commits 规范，便于自动生成 changelog 与版本判定：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**type 取值**：
- `feat`：新功能（对应 MINOR 版本）
- `fix`：Bug 修复（对应 PATCH 版本）
- `perf`：性能优化（对应 PATCH）
- `refactor`：重构（不改变外部行为，PATCH）
- `BREAKING CHANGE`：破坏性变更（对应 MAJOR），在 footer 标注
- `docs` / `style` / `test` / `chore` / `security` / `ci`：不影响版本号

**scope 示例**：`auth`、`bonsais`、`chat`、`dashboard`、`frontend`、`backend`、`deploy`

**示例**：
```
feat(dashboard): 新增库存预警与询价转化漏斗

- 库存预警：低库存/售罄/库存总值
- 询价漏斗：会话→回复→处理 三级转化
- 用户增长趋势图
```

```
fix(auth): 修复 token 刷新竞态导致登录态抖动
```

```
feat(api): 重构收藏接口为批量检查

BREAKING CHANGE: GET /favorites/check/:id 改为 GET /favorites/batch-check?ids=
```

### 版本发布流程（大版本）

```bash
# 1. 从 develop 切出 release 分支
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# 2. 在 release 分支上仅做版本号、changelog、bug 修复
#    更新 package.json version、docs/CHANGELOG.md

# 3. 验收通过后合入 main
git checkout main
git merge --no-ff release/v1.2.0 -m "release: 合并 v1.2.0"

# 4. 打 tag
git tag -a v1.2.0 -m "release: v1.2.0 - 库存预警与询价漏斗"

# 5. 同步回 develop
git checkout develop
git merge --no-ff release/v1.2.0 -m "chore: 同步 v1.2.0 到 develop"

# 6. 推送
git push origin main develop v1.2.0

# 7. 删除临时 release 分支
git branch -d release/v1.2.0
git push origin --delete release/v1.2.0

# 8. 在 GitHub 创建 Release，附 changelog
```

### 小改动迭代溯源流程

```bash
# 1. 从 develop 切出小分支
git checkout develop
git pull origin develop
git checkout -b fix/dashboard-response-shape

# 2. 提交修复（多个小提交可追溯每一步）
git commit -m "fix(dashboard): 修正趋势图响应结构解构"
git commit -m "fix(dashboard): 补充空数据兜底"

# 3. PR 合回 develop（保留小提交历史，不 squash）
#    便于后续溯源每个小改的上下文

# 4. 删除本地小分支
git branch -d fix/dashboard-response-shape
```

### "最新版组合"原则

- **生产环境（main）**：始终是最新稳定 tag 的状态，可随时部署
- **开发环境（develop）**：最新功能的组合，可能未经验收
- **小改累积发版**：develop 上积累若干 `fix/*` / `feature/*` 后，通过 release 分支打包发 PATCH 或 MINOR 版本
- **禁止直推 main**：所有变更必须经 PR，便于 CodeRabbit 审查与回溯
- **回溯能力**：任何线上问题可通过 `git log` + tag 快速定位引入版本，`git revert` 或回滚到上一个 tag

### Agent 操作清单

每个 Agent 在开始任务前必须确认：

1. ✅ 当前在正确的分支（小改 → `fix/*` 或 `feature/*`；大改 → `release/*`）
2. ✅ 分支从最新的 `develop`（或 `main` 用于 hotfix）切出
3. ✅ 提交信息遵循 Conventional Commits
4. ✅ 不直接推送 `main` / `develop`，通过 PR
5. ✅ 大版本完成时打 tag 并创建 GitHub Release
6. ✅ 临时分支合并后立即删除（本地 + 远程）

### 参考实现

本项目版本管理参考以下高星项目实践：
- **Next.js**：Conventional Commits + 语义化版本 + Release 分支
- **Vue 3**：主分支保护 + feature 分支 + PR 审查
- **NestJS**：monorepo 分支模型 + tag 规范
- **GitLab EE**：Git Flow 精简版 + hotfix 双向合并

## 脱敏规范（强制执行）

> **此规范为最高优先级安全要求，所有 Agent 在提交代码到 GitHub 前必须严格执行。**
> 违反此规范会导致服务器、域名、账号等敏感信息泄露，属于严重安全事故。

### 必须脱敏的内容

以下信息**严禁**以明文形式出现在任何提交到远程仓库的文件中（包括代码、注释、文档、配置示例）：

| 类别 | 示例 | 脱敏方式 |
|------|------|----------|
| 服务器 IP | 真实服务器 IP 地址 | 替换为 `<SERVER_IP>` 或 `your-server-ip` |
| SSH 凭据 | `root@...` / 私钥路径 | 完全移除，不写入任何文件 |
| 部署路径 | 真实部署目录 | 替换为 `<DEPLOY_DIR>` 或 `/opt/penjing` |
| 真实域名 | 真实业务域名 | 替换为 `example.com` / `penjing.example.com` |
| 管理员用户名 | 真实管理员用户名 | 替换为 `<ADMIN_USERNAME>` |
| 管理员密码 | 任何明文密码 | 完全移除，仅通过环境变量注入 |
| 管理员邮箱 | 真实管理员邮箱 | 替换为 `admin@example.com` |
| 数据库密码 | 任何明文密码 | 完全移除，仅通过 `.env`（不入库）注入 |
| JWT 密钥 | 任何明文密钥 | 完全移除，仅通过 `.env`（不入库）注入 |
| 其他用户个人信息 | 手机号、真实姓名等 | 完全移除或占位符替换 |

### 允许入库的内容

- 使用占位符的配置模板（如 `.env.example` 中 `REPLACE_WITH_STRONG_PASSWORD`）
- 使用 `openssl rand` 动态生成密码的脚本逻辑（不包含固定密码值）
- 通用示例邮箱（如 `admin@example.com`、`user@example.com`）
- 通用示例域名（如 `example.com`、`penjing.example.com`）

### 提交前检查清单

每次提交到 GitHub 前，Agent 必须执行以下检查：

1. **全局搜索敏感关键词**：在待提交文件中搜索服务器 IP、域名、用户名、密码等关键词
2. **审查配置文件**：确保 `.env` 在 `.gitignore` 中，`.env.example` 仅含占位符
3. **审查部署脚本**：`deploy.sh` 等脚本中不得硬编码服务器地址或凭据
4. **审查文档**：`README.md`、`AGENTS.md`、`docs/*` 中不得包含真实部署信息
5. **审查代码注释**：代码注释中不得包含真实域名、IP、账号信息
6. **审查种子数据**：`seed.ts` 中不得硬编码真实管理员密码，应通过环境变量注入

### 历史脱敏处理

若发现历史提交中包含未脱敏的敏感信息：

1. **立即停止推送**：发现后不得继续 push 新提交
2. **重写历史**：使用 `git filter-branch` 或 `git filter-repo` 清理所有历史提交中的敏感信息
3. **强制推送**：`git push --force` 覆盖远程历史（需用户明确授权）
4. **轮换凭据**：已泄露的服务器密码、密钥必须立即轮换
5. **记录事故**：在 `docs/SECURITY_AUDIT.md` 中记录脱敏事件

### 脱敏验证命令

提交前可执行以下 grep 命令验证（无输出表示脱敏完成）：

```bash
# 检查真实服务器 IP、域名、账号等敏感信息
# 将 <真实IP>、<真实域名>、<真实用户名> 等替换为实际要检查的敏感值
grep -rE "<真实IP>|<真实域名>|<真实部署路径>|<真实管理员用户名>|<真实管理员密码>|<真实管理员邮箱>" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" \
  --include="*.yml" --include="*.yaml" --include="*.sh" \
  --include="*.md" --include="*.example" --include="Caddyfile" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next --exclude-dir=dist \
  .
```
