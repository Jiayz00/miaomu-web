# Penjing 盆景艺术展示与销售平台

> 一个具有呼吸感、高级感的盆景展示网站，含完整前后端、管理员数据分析、用户询价聊天等功能，支持一键服务器部署。

## 项目特色

- **呼吸感设计**：参考 herons.co.uk 风格，衬线体 + 留白 + 缓动动画，不眼花缭乱
- **全栈 TypeScript**：Next.js 14 + NestJS 10 + Prisma 5，端到端类型安全
- **安全可靠**：JWT + bcrypt + RBAC + 限流 + 输入校验 + XSS/SQL 注入防护
- **一键部署**：Docker Compose 编排，Caddy 自动 HTTPS
- **实时聊天**：Socket.io 询价会话，管理员后台处理

## 版本更新

> 完整变更日志请参见 [CHANGELOG.md](CHANGELOG.md)。每个版本按倒序列出，并提供 GitHub Release / Tag 跳转链接。

| 版本 | 发布日期 | 类型 | 摘要 | 详情 |
|------|----------|------|------|------|
| [v1.2.2](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.2.2) | 2026-07-25 | PATCH | CI 修复 / 中文 slug 404 / 聊天 WebSocket / 图片 URL / shell CRLF | [查看变更](CHANGELOG.md#v122---2026-07-25) |
| [v1.2.1](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.2.1) | 2026-07-24 | PATCH | 服务器实测复测修复（SSR / ORB / 限流 / a11y） | [查看变更](CHANGELOG.md#v121---2026-07-24) |
| [v1.2.0](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.2.0) | 2026-07-24 | MINOR | 管理端布局编辑 / 视频上传 / 收藏筛选 / UI 全面优化 | [查看变更](CHANGELOG.md#v120---2026-07-24) |
| [v1.1.0](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.1.0) | 2026-07-22 | MINOR | 十轮严格审查修复（安全 / QA / 性能 / a11y / DevOps） | [查看变更](CHANGELOG.md#v110---2026-07-22) |
| [v1.0.0](https://github.com/Jiayz00/miaomu-web/releases/tag/v1.0.0) | 2026-07-20 | MAJOR | 盆景艺术展示与销售平台全栈首版 | [查看变更](CHANGELOG.md#v100---2026-07-20) |

### v1.2.2 更新要点

- **修复** GitHub Actions CI 三 job 全失败（Backend lint & build / Config syntax validate / Frontend lint & build）
- **修复** 手动创建的中文 slug 盆景详情页 404（禁用静态生成 + 运行时 API_BASE_URL + 前后端 slug 编解码对齐）
- **修复** 聊天接口异常与 WebSocket 无法收发消息（分页响应取 `list`、polling fallback、`/chat` namespace 对齐）
- **修复** 图片 URL 被解析为内网后端地址（改为相对路径 + `NEXT_PUBLIC_PUBLIC_ORIGIN`）
- **修复** 部署后容器启动失败 `/bin/bash^M: bad interpreter`（`.gitattributes` 强制 LF）
- **修复** 管理端布局编辑器 a11y 警告（开关与 textarea 添加 id / role / aria-label）
- **修复** `frontend/package-lock.json` BOM / 同步异常
- **新增** Playwright E2E 全功能回归（用户端 / 管理端 / 移动端，25+ 截图）

完整变更请跳转：[CHANGELOG.md#v122---2026-07-25](CHANGELOG.md#v122---2026-07-25)

### v1.2.1 更新要点

- **修复** SSR 阶段 `API_BASE_URL` 编译期内联导致的盆景详情页 404（改为运行时函数）
- **修复** `images.unsplash.com` 被 ORB 拦截的图片加载失败（替换为 `picsum.photos`）
- **修复** 列表页"年份"筛选器渲染 1900-2026 共 127 个按钮的 UX 灾难（改为近 10 年）
- **修复** 多个搜索表单缺失 `id` / `name` 属性的 a11y 警告
- **修复** NestJS Throttler v5 全局 `'auth'` 限流误应用到所有路由导致的管理后台 429（移除全局 auth 限流，认证路由显式 `@Throttle`）
- **修复** 文档服务器端口不一致（`:1688` → `:443`）

完整变更请跳转：[CHANGELOG.md#v121---2026-07-24](CHANGELOG.md#v121---2026-07-24)

### v1.2.0 更新要点

- **新增** 管理端首页可视化布局编辑器（section 增删 / 排序 / 显隐 / 文案配置 + 实时预览）
- **新增** 分类页排版编辑器（网格 / 瀑布流 / 列表三种布局 + 卡片宽高比 / 列数 / 排序 / 文案可配）
- **新增** 站点设置页（联系电话 / 地址 / 邮箱 / 微信等内容可配置，可选择是否展示）
- **新增** 收藏筛选面板（搜索 / 分类 / 价格 / 产地 / 年份 + 桌面常驻 / 移动端抽屉）
- **新增** 视频上传支持（单图 30MB、单视频 1GB，不限数量）
- **修复** SSR 404、图片无法显示、OG 图片渲染、头像回退、分类页错误状态误判 404 等
- **优化** UI 层次感 / 光影 / 点击反馈 / 响应式适配 / a11y（WCAG 2.1.2 / 4.1.2 / 4.1.3）

完整变更请跳转：[CHANGELOG.md#v120---2026-07-24](CHANGELOG.md#v120---2026-07-24)

### v1.1.0 更新要点

- **新增** 统一登录入口、防水平/垂直越权、JWT 安全增强、账号防枚举、限流防护、CSP / 安全头
- **修复** SQL 注入、XSS、CSRF、开放重定向、请求超时、内存泄漏等问题
- **优化** DevOps 健康检查、数据库索引与外键策略、测试覆盖
- **后续补丁** 修复登录态显示、聊天网关 CORS、健康检查 URL、Caddy 反代部署

完整变更请跳转：[CHANGELOG.md#v110---2026-07-22](CHANGELOG.md#v110---2026-07-22)

### v1.0.0 更新要点

- **新增** 用户端：盆景浏览 / 详情 / 注册登录 / 询价聊天 / 收藏 / 个人中心
- **新增** 管理端：数据看板 / 盆景 CRUD + 多图上传 / 分类管理 / 用户管理 / 询价会话处理
- **新增** 基础设施：Next.js 14 + NestJS 10 + Prisma 5 + MySQL 8 + Redis 7 + Socket.io 4 + Docker Compose + Caddy 自动 HTTPS

完整变更请跳转：[CHANGELOG.md#v100---2026-07-20](CHANGELOG.md#v100---2026-07-20)

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Next.js 14 (App Router) + TypeScript + TailwindCSS + Framer Motion | SSR + 静态生成，SEO 友好 |
| 后端 | NestJS 10 + TypeScript + Prisma 5 | 模块化、依赖注入、装饰器 |
| 数据库 | MySQL 8.0 | 关系型数据库 |
| 缓存 | Redis 7 | 会话、限流、令牌黑名单 |
| 实时通信 | Socket.io 4 | 询价聊天 WebSocket |
| 认证 | JWT + bcrypt | Access + Refresh Token 轮换 |
| 容器化 | Docker + Compose | 一键部署 |
| 反向代理 | Caddy 2 | 自动 HTTPS、SNI 多域名 |

## 功能模块

### 用户端
- 盆景浏览（分页、筛选、搜索、分类）
- 盆景详情（多图画廊、规格信息）
- 用户注册/登录（支持用户名或邮箱）
- 询价聊天（WebSocket 实时通信）
- 收藏管理
- 个人中心

### 管理端
- 数据看板（浏览量、收藏量、用户数、盆景数统计）
- 盆景管理（CRUD + 多图上传）
- 分类管理
- 用户管理（启用/禁用）
- 询价会话处理

### 安全特性
- **统一登录入口**：管理员与普通用户共用 `/api/v1/auth/login`，由后端 role 区分权限
- **防水平越权**：所有用户态接口通过 `user.sub` 隔离数据
- **防垂直越权**：管理员接口由 `AdminGuard` + `Roles(ADMIN)` 守卫
- **JWT 安全**：Access Token 携带 jti，登出加入黑名单；Refresh Token 一次性轮换
- **账号防枚举**：登录失败统一返回"账号或密码错误"
- **限流防护**：认证接口 5 次/分钟，全局 100 次/分钟
- **密码安全**：bcrypt 12 轮哈希（生产环境）
- **输入校验**：class-validator DTO 校验所有 API 输入
- **SQL 注入防护**：Prisma 参数化查询
- **XSS 防护**：CSP + 安全头（HSTS / X-Frame-Options 等）

## 目录结构

```
盆景网站开发/
├── AGENTS.md                    # Agent 协作规范（含脱敏规范，不入库）
├── README.md                    # 本文件
├── CHANGELOG.md                 # 变更日志（按版本记录所有显著变更）
├── Caddyfile                    # Caddy 反向代理配置（示例域名）
├── docker-compose.yml           # 生产部署编排
├── deploy.sh                    # 一键部署脚本
├── .env.example                 # 环境变量模板（仅占位符）
├── docs/                        # 项目文档
│   ├── PRD.md                   # 产品需求文档
│   ├── ARCHITECTURE.md          # 技术架构设计
│   ├── SECURITY_AUDIT.md        # 安全审查清单
│   └── FRONTEND_REVIEW.md       # 前端审查
├── backend/                     # NestJS 后端
│   ├── src/
│   │   ├── modules/             # 业务模块（auth/users/bonsais/...）
│   │   ├── common/              # 公共模块（guards/filters/interceptors）
│   │   ├── config/              # 配置管理
│   │   ├── prisma/              # Prisma 服务
│   │   └── redis/               # Redis 服务
│   ├── prisma/
│   │   ├── schema.prisma        # 数据库模型
│   │   └── seed.ts              # 种子数据
│   └── Dockerfile
├── frontend/                    # Next.js 前端
│   ├── src/
│   │   ├── app/                 # App Router（用户端 + 管理端）
│   │   ├── components/          # 通用组件
│   │   ├── hooks/               # 自定义 Hooks
│   │   ├── lib/                 # 工具库、API 客户端
│   │   └── stores/              # Zustand 状态管理
│   └── Dockerfile
└── nginx/                       # Nginx 备用配置
```

## 快速开始

### 环境要求
- Node.js 18+
- Docker 24+
- Docker Compose 2+
- MySQL 8.0+（Docker 内置）
- Redis 7+（Docker 内置）

### 本地开发

```bash
# 1. 安装后端依赖
cd backend && npm install

# 2. 安装前端依赖
cd ../frontend && npm install

# 3. 配置环境变量
cp ../.env.example ../.env
# 编辑 .env 填入真实配置

# 4. 启动数据库
cd .. && docker compose up -d mysql redis

# 5. 初始化数据库
cd backend && npx prisma db push && npx prisma generate && npm run seed

# 6. 启动后端
npm run start:dev

# 7. 启动前端（新终端）
cd ../frontend && npm run dev
```

### 生产部署

```bash
# 1. 克隆仓库
git clone https://github.com/Jiayz00/miaomu-web.git
cd miaomu-web

# 2. 生成环境变量（自动生成强随机密钥）
cp .env.example .env
# 编辑 .env，替换所有 REPLACE_WITH_* 占位符
# 必须设置：MYSQL_ROOT_PASSWORD, MYSQL_PASSWORD, REDIS_PASSWORD,
#           JWT_SECRET, JWT_REFRESH_SECRET, ADMIN_DEFAULT_PASSWORD

# 3. 一键部署
bash deploy.sh

# 或手动启动
docker compose up -d --build
```

### 域名与 HTTPS

项目使用 Caddy 作为反向代理，自动申请 Let's Encrypt 证书。

1. 将域名 DNS 解析到服务器 IP
2. 编辑 `Caddyfile`，将 `penjing.example.com` 替换为真实域名
3. 将 Caddyfile 复制到服务器 Caddy 配置目录
4. 重载 Caddy：`caddy reload --config /etc/caddy/Caddyfile`

## API 概览

### 用户端（无需认证 / 用户认证）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/register` | 注册 |
| POST | `/api/v1/auth/login` | 登录（支持用户名/邮箱） |
| POST | `/api/v1/auth/refresh` | 刷新 Token |
| GET | `/api/v1/auth/profile` | 获取当前用户信息 |
| POST | `/api/v1/auth/logout` | 登出 |
| GET | `/api/v1/bonsais` | 盆景列表 |
| GET | `/api/v1/bonsais/:slug` | 盆景详情 |
| GET | `/api/v1/categories` | 分类列表 |
| POST | `/api/v1/favorites/:bonsaiId` | 收藏 |
| DELETE | `/api/v1/favorites/:bonsaiId` | 取消收藏 |
| GET | `/api/v1/favorites` | 我的收藏 |
| POST | `/api/v1/chat/rooms` | 创建询价会话 |
| GET | `/api/v1/chat/rooms` | 我的会话 |
| GET | `/api/v1/chat/rooms/:id/messages` | 会话消息 |

### 管理员端（需管理员认证）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/dashboard` | 数据看板 |
| POST | `/api/v1/admin/bonsais` | 创建盆景 |
| PUT | `/api/v1/admin/bonsais/:id` | 更新盆景 |
| DELETE | `/api/v1/admin/bonsais/:id` | 删除盆景 |
| POST | `/api/v1/admin/categories` | 创建分类 |
| PUT | `/api/v1/admin/categories/:id` | 更新分类 |
| DELETE | `/api/v1/admin/categories/:id` | 删除分类 |
| POST | `/api/v1/admin/upload` | 图片上传 |
| GET | `/api/v1/admin/users` | 用户列表 |
| PATCH | `/api/v1/admin/users/:id/status` | 启用/禁用用户 |
| GET | `/api/v1/admin/analytics/views` | 浏览量分析 |
| GET | `/api/v1/admin/analytics/favorites` | 收藏量分析 |
| GET | `/api/v1/admin/chat/rooms` | 所有询价会话 |

## 数据模型

核心模型：`User`、`Bonsai`、`Category`、`BonsaiImage`、`Favorite`、`ChatRoom`、`ChatMessage`、`ViewLog`

详见 [backend/prisma/schema.prisma](backend/prisma/schema.prisma) 和 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 部署架构

```
Internet → Caddy (443 HTTPS)
              ├── penjing.example.com → Next.js Frontend (3000)
              │                       → NestJS Backend (4000)
              │                       → Socket.io (4000)
              │                       → Uploads (4000)
              └── (其他站点)
                       ↓
              Backend → MySQL (3306)
                     → Redis (6379)
```

- 前端：Next.js standalone 模式
- 后端：NestJS + dumb-init 信号转发
- 数据库：MySQL 8.0 容器，数据卷持久化
- 缓存：Redis 7 容器，密码保护
- SSL：Caddy 自动申请 Let's Encrypt 证书

## 安全规范

本项目严格执行脱敏规范，详见 [AGENTS.md](AGENTS.md) 的"脱敏规范"章节。

关键原则：
- 所有敏感信息（服务器 IP、域名、账号、密码）通过环境变量注入
- `.env` 文件不入库（已在 `.gitignore` 中）
- `.env.example` 仅包含占位符
- 部署脚本不硬编码服务器地址或凭据

## 开发流程

本项目遵循 Vibecoding 框架，开发流程详见 [AGENTS.md](AGENTS.md)：

1. **需求分析** → 明确功能目标、输入输出、边界条件
2. **任务拆解** → 分解为可独立验证的子任务
3. **任务计划** → 制定执行顺序，识别依赖关系
4. **代码开发** → 遵循编码规范，编写可维护代码
5. **Review 验证** → 自测 + 代码审查 + 修复

## 许可证

私有项目，版权所有。
