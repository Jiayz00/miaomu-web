# 盆景艺术展示平台 后端安全审查报告

**审查目标**：`d:\盆景网站开发\backend`（NestJS + Prisma + MySQL + Socket.IO）
**审查日期**：2026-07-23
**审查范围**：`src/` 目录下全部 controllers / services / guards / modules / common 目录，以及 `main.ts`、`app.module.ts`、`prisma/schema.prisma`、`prisma/seed.ts`、`config/configuration.ts`、`Dockerfile`、根目录 `docker-compose.yml`、`nginx/nginx.conf`、`.gitignore`、`.env.example`
**问题统计**：高危 7 项 / 中危 11 项 / 低危 9 项

---

## 一、认证与授权

| 等级 | 问题 | 文件位置 | 修复建议 |
| --- | --- | --- | --- |
| **高** | JWT 密钥存在弱默认值。`JWT_SECRET` 默认 `'penjing-jwt-secret-dev'`，`JWT_REFRESH_SECRET` 默认 `'penjing-refresh-secret-dev'`；`docker-compose.yml` 又以 `${JWT_SECRET:-your_jwt_secret_change_me_2024}` 兜底，一旦部署忘记设置环境变量，攻击者可直接用公开默认值伪造任意身份令牌（包括 ADMIN）。 | `src/config/configuration.ts:27-28`<br>`src/modules/auth/strategies/jwt.strategy.ts:21`<br>`docker-compose.yml:59-60` | 移除所有代码中的硬编码默认值，启动时若 `JWT_SECRET` / `JWT_REFRESH_SECRET` 缺失或长度 < 32 字节，直接 `throw` 终止启动；docker-compose 不再提供兜底默认值，强制显式注入。 |
| **高** | JWT 令牌无法主动失效。`/auth/logout` 仅返回成功消息，未将 access/refresh token 加入黑名单；`refresh` 接口签发新 access token 时也未轮换 refresh token，导致 refresh token 可在 7 天有效期内被反复使用，泄露后无法吊销。 | `src/modules/auth/auth.controller.ts:55-60`<br>`src/modules/auth/auth.service.ts:146-183` | 引入 Redis 维护：1）refresh token 白名单（每次刷新轮换并失效旧 token）；2）登出时将 access token 加入黑名单直至 exp；3）用户禁用/改密时一次性撤销其所有 refresh token。 |
| **高** | 每次认证请求未校验账号当前状态。`JwtStrategy.validate` 只通过 `findById` 查用户存在性并返回，不检查 `user.status`；账号被管理员禁用后，已签发的 token 在 15 分钟内仍可正常访问所有受保护接口。 | `src/modules/auth/strategies/jwt.strategy.ts:28-38`<br>`src/modules/users/users.service.ts:18-26`（`findById` 返回含 status 字段） | 在 `JwtStrategy.validate` 中检查 `user.status === 0` 时抛出 `UnauthorizedException`；或在 Prisma 查询中加 `where: { id, status: 1 }`。 |
| **中** | bcrypt 强度偏低。`BCRYPT_ROUNDS = 10`（约 60ms/次），现代 GPU 离线爆破速度仍较快；种子脚本同样使用 10 轮。 | `src/modules/auth/auth.service.ts:24`<br>`prisma/seed.ts:19` | 生产环境提升至 12 轮（约 250ms/次），并通过 `BCRYPT_ROUNDS` 环境变量可配置。 |
| **中** | AdminGuard 未注册为全局守卫，依赖每个 controller 显式 `@UseGuards(JwtAuthGuard, AdminGuard)`。一旦新增管理接口忘记添加装饰器，普通用户即可访问。 | `src/app.module.ts:53-63`（仅注册 `ThrottlerGuard` + `JwtAuthGuard`）<br>`src/common/guards/admin.guard.ts` | 引入基于 `@Roles()` 元数据的全局 `RolesGuard`，与全局 `JwtAuthGuard` 配合，使权限校验自动生效；或编写 lint 规则/单元测试覆盖 admin 命名空间下的控制器。 |
| **中** | `JwtPayload.role` 类型为 `string` 而非 `Role` 枚举，`AdminGuard` 中又通过 `user.role as Role` 强制断言，若未来 token 签发逻辑被修改引入非法值，类型系统无法拦截。 | `src/common/decorators/current-user.decorator.ts:8-15`<br>`src/common/guards/admin.guard.ts:37` | 将 `JwtPayload.role` 改为 `Role` 类型；在 `JwtStrategy.validate` 中显式校验 `Object.values(Role).includes(user.role)`。 |
| **低** | 登录失败未记录失败次数/IP，无法触发账号锁定。 | `src/modules/auth/auth.service.ts:100-118` | 引入失败计数（Redis：`login:fail:{ip}` / `login:fail:{email}`），达阈值后临时锁定账号或 IP。 |

---

## 二、输入验证

| 等级 | 问题 | 文件位置 | 修复建议 |
| --- | --- | --- | --- |
| **中** | `RefreshTokenDto.refreshToken` 仅 `@IsString()`，无长度上限，攻击者可发送超长字符串触发 JWT 解析开销（潜在 DoS）。 | `src/modules/auth/dto/refresh-token.dto.ts:7-10` | 增加 `@MaxLength(2048)` 约束。 |
| **中** | `UpdateUserDto.avatar`、`CreateBonsaiDto.images[].url`、`CreateCategoryDto.coverImage` 等仅 `@IsString()`，未校验 URL 格式与长度，可写入任意字符串（含 `javascript:` 伪协议、超长字符串、外部内网 URL 导致 SSRF 展示）。 | `src/modules/users/dto/update-user.dto.ts:24-31`<br>`src/modules/bonsais/dto/create-bonsai.dto.ts:22-24`<br>`src/modules/categories/dto/create-category.dto.ts:24-26` | 增加 `@IsUrl({ protocols: ['http','https'], require_protocol: true })` + `@MaxLength(500)`；如仅允许站内 `/uploads/...` 路径，改用正则白名单。 |
| **中** | 部分管理接口直接用 `@Body('status') status: number` 接收状态值，未通过 DTO 校验枚举范围，可写入任意整数（如 -1、999）。 | `src/modules/bonsais/bonsais.controller.ts:124-130`（`updateStatus`）<br>`src/modules/chat/chat.controller.ts:78-85`（`updateRoomStatus`） | 定义 `UpdateStatusDto { @IsIn([0,1]) status: number }` 并以 `@Body() dto` 接收。 |
| **低** | `QueryBonsaiDto.featured` 用 `@IsString()` 接收 `'true'/'1'`，但服务端用 `query.featured === 'true' || query.featured === '1'` 判断，其他任意字符串会被静默忽略，API 行为不直观。 | `src/modules/bonsais/dto/query-bonsai.dto.ts:76-79`<br>`src/modules/bonsais/bonsais.service.ts:57-59, 202-204` | 改用 `@IsBoolean()` + `@Type(() => Boolean)`，或用 `@IsIn(['true','false','1','0'])` 显式约束。 |
| **低** | `PaginationDto.keyword` 仅 `@IsString()`，无最大长度限制，可触发长字符串数据库 `LIKE` 全表扫描。 | `src/common/dto/pagination.dto.ts:24-27` | 增加 `@MaxLength(100)`。 |

**已正确实施的部分**：全局 `ValidationPipe` 已开启 `whitelist`、`forbidNonWhitelisted`、`transform`（`main.ts:47-56`）；所有数据库查询均通过 Prisma 参数化，未发现 `$queryRaw`/`$executeRaw` 拼接；`BonsaisService` 中 `sortBy` 通过 `sortFieldMap` 白名单映射（`bonsais.service.ts:62-68, 206-213`），无 SQL 注入风险。

---

## 三、XSS 与 CSRF

| 等级 | 问题 | 文件位置 | 修复建议 |
| --- | --- | --- | --- |
| **中** | 多处用户可控富文本/字符串未做 HTML 转义即入库与返回：盆景 `name`/`description`、分类 `name`/`description`、用户 `username`、会话消息（HTTP 路径未触发，仅 WebSocket 路径转义）。仅靠前端框架转义，一旦存在第三方消费方或前端渲染缺陷即形成存储型 XSS。 | `src/modules/bonsais/bonsais.service.ts:284-294`（create）<br>`src/modules/categories/categories.service.ts:88`<br>`src/modules/users/users.service.ts:137-158`<br>对比 `src/modules/chat/chat.gateway.ts:153,184-191`（已正确转义） | 1）对 `description` 等富文本字段引入 `sanitize-html` 白名单过滤；2）对 `name`/`username`/`slug` 等纯文本字段在入库前调用与 `ChatGateway.escapeHtml` 一致的转义；3）响应头 `Content-Type` 强制 `application/json; charset=utf-8`。 |
| **低** | CORS 配置 `credentials: true`，但应用本身使用 Bearer Token（非 Cookie）认证，`credentials: true` 允许浏览器自动携带跨域 Cookie，若未来引入 Cookie 机制会扩大 CSRF 攻击面。 | `src/main.ts:37-41` | 若不依赖 Cookie，将 `credentials` 设为 `false`；如需保留，确保 `origin` 为白名单数组而非 `true`。 |
| **低** | 项目未显式启用 CSRF 防护。鉴于当前使用 Bearer Token，CSRF 风险较低，但 `cookieParser` 已加载，若后续将 token 改为 Cookie 存储，需同步引入 `csurf` 或双重提交 Cookie 方案。 | `src/main.ts:44` | 文档中明确"认证基于 Authorization 头"约束；若改用 Cookie，需补 `SameSite=Strict; Secure; HttpOnly` 与 CSRF Token。 |

**已正确实施**：聊天消息内容在 WebSocket 入口做 HTML 实体转义（`chat.gateway.ts:184-191`），覆盖 `& < > " '` 五个字符。

---

## 四、API 限流

| 等级 | 问题 | 文件位置 | 修复建议 |
| --- | --- | --- | --- |
| **高** | `/auth/refresh` 接口未应用 `auth` 限流策略，仅受默认 100 次/分钟约束。攻击者可用泄露的 refresh token 高频试探，或用任意字符串暴力枚举有效 refresh token（虽会失败，但消耗服务器资源）。 | `src/modules/auth/auth.controller.ts:37-42` | 添加 `@Throttle({ auth: { ttl: 60_000, limit: 5 } })`，与登录/注册保持一致。 |
| **中** | 文件上传接口 `/admin/upload`、`/admin/upload/multiple` 未配置独立限流，受默认 100/min 约束。结合 5MB 单文件 + `memoryStorage()`，攻击者可在 1 分钟内上传 500MB 数据驻留内存，构成 OOM 风险。 | `src/modules/upload/upload.controller.ts:30-79` | 为上传接口单独设置 `@Throttle({ default: { ttl: 60_000, limit: 10 } })`；并将 `multer` 改为 `diskStorage` 减少内存压力。 |
| **中** | 限流维度仅基于默认 `ThrottlerGuard`（按 IP）。NestJS 默认通过 `req.ip` 取 IP，未配置 `app.set('trust proxy', ...)`，在 Nginx 反向代理后所有请求 IP 都会是 `127.0.0.1`/容器内网 IP，导致全局限流对单一真实用户失效，并易误伤。 | `src/app.module.ts:31-42`<br>`src/main.ts`（未设置 trust proxy）<br>`nginx/nginx.conf:56-58`（已透传 `X-Forwarded-For`） | 在 `main.ts` 中 `app.set('trust proxy', 1)`（或指定代理网段）；自定义 `ThrottlerGuard` 覆写 `getTracker()` 从 `x-forwarded-for` 取真实 IP。 |
| **低** | WebSocket 事件（`sendMessage`/`joinRoom`）未应用限流，连接后可高频发送消息刷屏。 | `src/modules/chat/chat.gateway.ts:107-179` | 在网关内对每个 socket 维护滑动窗口计数，或引入 `@nestjs/throttler` 的 WebSocket 适配。 |

**已正确实施**：默认 100/min + auth 命名空间 5/min 双策略（`app.module.ts:31-42`）；登录/注册已应用 `@Throttle({ auth: { ttl: 60_000, limit: 5 } })`（`auth.controller.ts:23,31`）。

---

## 五、HTTP 安全头

| 等级 | 问题 | 文件位置 | 修复建议 |
| --- | --- | --- | --- |
| **高** | Swagger UI 在生产环境暴露于 `/api/docs`，泄露完整 API 结构、字段、示例、ADMIN 接口路径，便于攻击者侦察。 | `src/main.ts:76-97` | 在 `main.ts` 中根据 `NODE_ENV === 'production'` 跳过 `SwaggerModule.setup`，或加 Basic Auth 中间件保护 `/api/docs`。 |
| **中** | Helmet `crossOriginResourcePolicy: { policy: 'cross-origin' }` 放宽了 CORP，允许任意站点通过 `<img>`/`fetch` 读取 `/uploads/` 资源。虽然便于图片展示，但削弱了默认的 `same-origin` 防护。 | `src/main.ts:30-34` | 仅对 `/uploads/` 路径覆盖 `Cross-Origin-Resource-Policy: cross-origin`，其余路径保持 Helmet 默认 `same-origin`；可通过自定义中间件按路径设置头部实现。 |
| **中** | Helmet 默认 CSP 对 API 服务（返回 JSON）意义有限，但 Swagger UI 页面需要宽松 CSP 才能加载 JS/CSS。生产保留 Swagger 时若强行收紧 CSP 会导致 UI 异常，反之则暴露攻击面。 | `src/main.ts:30-34` | 配合"生产关闭 Swagger"方案：生产环境收紧 CSP（`default-src 'self'`），开发环境再放宽。 |
| **低** | 未显式设置 `Referrer-Policy`、`Permissions-Policy`，依赖 Helmet 默认值。 | `src/main.ts:30-34` | 显式配置 `referrerPolicy: { policy: 'strict-origin-when-cross-origin' }` 与 `permissionsPolicy` 白名单。 |

**已正确实施**：Helmet 已启用；CORS `origin` 通过环境变量配置为白名单数组（`main.ts:37-41`）；CORS `methods` 限定为实际使用的 HTTP 方法。

---

## 六、文件上传

| 等级 | 问题 | 文件位置 | 修复建议 |
| --- | --- | --- | --- |
| **高** | 文件类型校验仅基于 `file.mimetype`，可被客户端任意伪造（`Content-Type: image/jpeg` 即可）。Sharp 虽会重新编码失败抛错，但若攻击者上传"真 JPEG 头 + 恶意载荷"的多相格文件（polyglot），Sharp 可能仍能处理并产出含载荷的 JPEG。 | `src/modules/upload/upload.service.ts:78-92` | 1）使用 `file-type` 库读取 magic bytes 二次校验；2）校验 `file.originalname` 扩展名与 mimetype 一致；3）禁止 `Content-Disposition: inline` 渲染可执行内容。 |
| **中** | `/uploads/` 通过 `app.useStaticAssets` 直接对外提供静态服务（`main.ts:69`），未设置 `Content-Disposition: attachment`、未禁用 SVG（SVG 可内嵌 `<script>` 形成 XSS）、未设置 `X-Content-Type-Options: nosniff`（Helmet 全局已设，但静态资源中间件可能覆盖）。 | `src/main.ts:69`<br>`nginx/nginx.conf:82-87` | 1）将 `allowedMimeTypes` 移除 `image/svg+xml`（当前未列入，确认未来不引入）；2）对 `/uploads/` 强制 `Content-Type: image/jpeg`；3）Nginx 增加 `add_header X-Content-Type-Options nosniff always;`。 |
| **中** | `processImage` 中扩展名替换存在缺陷：`filename.replace(ext, '.jpg')` 会替换字符串中第一个匹配，若 UUID 中碰巧包含 `ext` 子串（如 `.p`）会产生异常文件名；且 `path.extname` 对 `.jpg.exe` 类多扩展名处理不当。 | `src/modules/upload/upload.service.ts:100-131` | 直接使用 `${uuidv4()}.jpg` 作为最终文件名，完全忽略原始扩展名；或使用 `path.basename` + 严格正则校验。 |
| **中** | `multer` 使用 `memoryStorage()`，5MB × 10 张 = 50MB 完全驻留内存，并发上传易触发 OOM；且 `limits` 在拦截器层硬编码 5MB，与 `configuration.ts` 中 `maxFileSize` 配置不一致。 | `src/modules/upload/upload.controller.ts:46-48, 72-75`<br>`src/config/configuration.ts:41` | 1）改用 `diskStorage` + 自定义 `destination`/`filename`；2）从 `ConfigService` 注入 `limits`，避免硬编码。 |
| **低** | 上传目录通过 `fs.mkdirSync` 创建，未限制目录权限（默认 0o755）；Dockerfile 也未显式 `chmod`。在共享主机上其他用户可读取上传内容。 | `src/modules/upload/upload.service.ts:133-139`<br>`backend/Dockerfile:33` | 创建目录时传入 `0o750` 模式；Dockerfile 增加 `RUN chown -R node:node /app/uploads && chmod 750 /app/uploads`。 |
| **低** | 未校验上传文件是否为合法图片维度/比例，攻击者可上传 1×1 像素图片或超大尺寸触发 Sharp 处理 OOM。 | `src/modules/upload/upload.service.ts:100-114` | 在 `validateFile` 中通过 `sharp(file.buffer).metadata()` 读取尺寸，限制最小/最大像素。 |

**已正确实施**：UUID v4 随机化文件名（`upload.service.ts:102`）；Sharp 重采样至 1200px 并统一输出 JPEG（`upload.service.ts:106-114`）；管理员鉴权（`upload.controller.ts:24-26`）；多图数量上限 10 张（`upload.controller.ts:72`、`upload.service.ts:59`）。

---

## 七、WebSocket 安全

| 等级 | 问题 | 文件位置 | 修复建议 |
| --- | --- | --- | --- |
| **中** | 管理员无法通过 WebSocket 加入具体会话房间 `room:X`。`handleJoinRoom` 调用 `chatService.ensureUserRoomAccess(roomId, user.sub)`，而该方法只校验 `room.userId === userId`（`chat.service.ts:76-85`），管理员 ID 与 `room.userId` 不相等时直接抛 `ForbiddenException`，导致管理员实时收听具体会话失败。当前管理员仅靠 `admin` 房间被动接收 `newMessage` 通知。 | `src/modules/chat/chat.gateway.ts:107-126`<br>`src/modules/chat/chat.service.ts:76-85` | 在 `ensureUserRoomAccess` 中先判断 `user.role === 'ADMIN'` 则直接放行；或将 `user` 整体传入而非仅 `userId`。 |
| **中** | `socketUserMap` 为进程内 `Map`，多实例部署时 socket 仅在当前实例可见，跨实例的 `server.to('admin').emit` 无法触达其他实例的客户端，消息广播会丢失。 | `src/modules/chat/chat.gateway.ts:45` | 引入 Socket.IO Redis Adapter（`@socket.io/redis-adapter`），配合已有的 `redis` 依赖实现跨实例广播。 |
| **低** | WebSocket 连接握手时未校验用户 `status`。用户被禁用后，已建立的 WS 连接仍可收发消息直到主动断开。 | `src/modules/chat/chat.gateway.ts:60-94` | 在 `handleConnection` 中通过 `usersService.findById` 加载用户并校验 `status === 1`，禁用则 `client.disconnect(true)`。 |
| **低** | `handleMessage` 中 `validateOrReject` 抛错时 `error.message` 直接返回客户端，可能泄露内部校验细节。 | `src/modules/chat/chat.gateway.ts:142-150` | 统一返回"参数校验失败"，仅在服务端日志中记录详细错误。 |
| **低** | `sendMessage` 事件未做频率限制，单连接可高速发送消息刷屏。 | `src/modules/chat/chat.gateway.ts:131-179` | 在网关内对 `sendMessage` 事件维护每 socket 滑动窗口（如 5 条/5 秒）。 |

**已正确实施**：连接握手强制 JWT 验证（`chat.gateway.ts:60-94`）；未通过则 `client.disconnect(true)`；消息内容 HTML 转义（`chat.gateway.ts:184-191`）；`SendMessageDto` 长度上限 2000（`send-message.dto.ts:17`）；CORS origin 来自环境变量白名单（`chat.gateway.ts:28-33`）。

---

## 八、数据库与配置

| 等级 | 问题 | 文件位置 | 修复建议 |
| --- | --- | --- | --- |
| **高** | `Dockerfile` 生产 CMD 为 `npx prisma db push --accept-data-loss && npx prisma db seed && node dist/main.js`。`db push --accept-data-loss` 在每次容器启动时执行，**会根据 schema 差异直接丢弃/重建表**，是严重的数据丢失风险；`db seed` 每次启动重置管理员密码为默认值并 upsert 种子数据。 | `backend/Dockerfile:38` | 1）将迁移与启动解耦，CI/CD 中通过 `prisma migrate deploy` 单独执行；2）移除 `--accept-data-loss`；3）`seed` 仅在首次初始化时运行（通过标记表/文件判断），生产 CMD 仅保留 `node dist/main.js`。 |
| **高** | 管理员默认密码 `admin123456`（configuration.ts）/ `ChangeMe@2024`（.env.example）/ `Admin@Penjing2024`（docker-compose.yml）三处默认值不一致且均为弱密码，种子脚本 `prisma/seed.ts:18` 直接使用。若部署未设置 `ADMIN_DEFAULT_PASSWORD`，管理员账号可被默认密码登录。 | `src/config/configuration.ts:46`<br>`.env.example:26`<br>`docker-compose.yml:70`<br>`prisma/seed.ts:18` | 1）移除所有硬编码默认密码，启动时强制要求 `ADMIN_DEFAULT_PASSWORD` 已设置且满足复杂度；2）seed 脚本生成随机强密码并输出到日志（首次启动后人工修改）。 |
| **高** | `docker-compose.yml` 将 MySQL 3306 与 Redis 6379 端口直接映射到宿主机（`ports: "3306:3306"`、`"6379:6379"`），生产环境暴露数据库端口极大增加攻击面。同时 MySQL root 密码默认 `penjing_root_2024`、应用密码默认 `penjing_password_2024`、Redis 无密码。 | `docker-compose.yml:17-18, 33-35`<br>`docker-compose.yml:11, 14` | 1）移除 MySQL/Redis 的 `ports` 映射，仅通过 `penjing-network` 内部网络访问；2）Redis 启用 `requirepass`；3）强制显式注入 `MYSQL_ROOT_PASSWORD` / `MYSQL_PASSWORD`，不提供默认值。 |
| **中** | 数据库连接未启用 SSL/TLS。`DATABASE_URL` 形如 `mysql://user:pass@host:3306/db`，未带 `?ssl=true` 或 `sslmode`，内网嗅探可窃取查询内容与凭据。 | `prisma/schema.prisma:7-10`<br>`.env.example:3` | 生产 `DATABASE_URL` 追加 `?ssl=true&sslmode=require`，并配置 CA 证书；Prisma 5.x 支持 `?sslcert=`/`?sslidentity=`。 |
| **中** | `ViewLog` 表持久化存储用户 `ip` 与 `userAgent` 明文（PII），无脱敏/哈希，违反最小化原则；浏览日志无 TTL/清理策略，长期累积。 | `prisma/schema.prisma:151-164`<br>`src/modules/bonsais/bonsais.service.ts:120-127` | 1）对 IP 做末段截断或哈希后存储；2）添加定时任务清理 90 天以上 ViewLog；3）在隐私政策中声明采集用途。 |
| **中** | `LoggingInterceptor` 将每个请求的 `ip` 与 `user-agent` 写入日志并输出到 stdout，包含 PII，且无日志保留/脱敏策略。 | `src/common/interceptors/logging.interceptor.ts:21-32` | 1）对 `ip` 做掩码处理（如保留前 3 段）；2）引入结构化日志（pino）并配置脱敏字段；3）制定日志保留期策略。 |
| **低** | `HttpExceptionFilter` 在 `exception instanceof Error` 分支将 `exception.message` 直接返回客户端（`http-exception.filter.ts:61-63`），可能泄露内部错误细节（如 Prisma 原始错误、堆栈信息）。 | `src/common/filters/http-exception.filter.ts:61-66, 75-81` | 对非 `HttpException`/非 `PrismaClientKnownRequestError` 的异常，统一返回"服务器内部错误"，仅在服务端日志记录真实 message 与 stack。 |
| **低** | `.env.example` 中 `JWT_SECRET` / `JWT_REFRESH_SECRET` 示例值为可被猜测的字符串，开发者可能直接复制使用。 | `.env.example:9-10` | 示例值改为 `REPLACE_WITH_RANDOM_64_CHAR_STRING`，并附 `openssl rand -hex 32` 生成说明。 |
| **低** | `configuration.ts` 在模块加载阶段额外调用 `dotenv.config()`（`configuration.ts:1-4`），与 `ConfigModule.forRoot({ isGlobal: true })` 重复加载，可能导致环境变量加载顺序歧义。 | `src/config/configuration.ts:1-4` | 移除手动 `dotenv.config()`，统一由 `ConfigModule` 管理；若需提前读取，使用 `ConfigModule.forRoot({ envFilePath: ... })`。 |

**已正确实施**：`.gitignore` 已正确排除 `.env`、`.env.local`、`.env.*.local`（`.gitignore:16-19`）并保留 `.env.example`；所有敏感配置均通过 `process.env` 读取；`schema.prisma` 通过 `env("DATABASE_URL")` 引用环境变量而非硬编码；密码使用 bcrypt 单向哈希存储，无明文落库。

---

## 综合优先级修复建议

### 必须立即修复（高危，7 项）

1. 移除 JWT 密钥与管理员密码的所有硬编码默认值，启动时强制校验环境变量。（§1, §8）
2. 引入 Refresh Token 轮换 + Redis 黑名单，实现登出/禁用后令牌即时失效。（§1）
3. `JwtStrategy.validate` 增加用户 `status` 校验。（§1）
4. `/auth/refresh` 应用 `auth` 限流策略（5/min）。（§4）
5. 生产环境关闭 Swagger UI 或加访问鉴权。（§5）
6. 文件类型校验增加 magic bytes 二次验证。（§6）
7. 重构 Dockerfile CMD，移除 `prisma db push --accept-data-loss` 与每次启动 seed；docker-compose 移除数据库/Redis 端口映射与默认密码。（§8）

### 计划修复（中危，11 项）

- bcrypt 提升至 12 轮；AdminGuard 改为全局 RolesGuard；`JwtPayload.role` 使用枚举类型。（§1）
- 所有 URL/字符串字段补 `@IsUrl`/`@MaxLength`；状态字段统一 DTO + `@IsIn`。（§2）
- 富文本字段引入 `sanitize-html`；纯文本字段统一转义。（§3）
- 上传接口独立限流；配置 `trust proxy` 与自定义 IP tracker；multer 改 diskStorage。（§4, §6）
- Helmet CORP 按路径精细化配置；CSP 与 Swagger 联动开关。（§5）
- 修复上传文件名扩展替换缺陷；上传目录权限收紧。（§6）
- WebSocket 管理员加入房间逻辑修复；引入 Redis Adapter。（§7）
- 数据库连接启用 SSL；ViewLog/日志 PII 脱敏与保留策略。（§8）

### 优化建议（低危，9 项）

- 登录失败计数与账号锁定；`featured` 字段类型规范化；`keyword` 长度限制；CORS credentials 评估；`Referrer-Policy` 显式配置；WebSocket 频率限制；WS 错误信息收敛；异常过滤器消息收敛；`.env.example` 示例值脱敏。

---

## 审查方法说明

- 静态代码审查，未进行运行时渗透测试。
- 未修改任何源代码，仅生成审查报告。
- 审查覆盖 `src/` 全部 .ts 文件、`prisma/schema.prisma`、`prisma/seed.ts`、`main.ts`、`app.module.ts`、`config/configuration.ts`、`Dockerfile`、`nest-cli.json`、`package.json`，以及项目根的 `docker-compose.yml`、`nginx/nginx.conf`、`.gitignore`、`.env.example`。
- 等级评定标准：
  - **高**：可直接导致身份伪造、数据丢失、远程代码执行、生产环境敏感信息泄露或服务不可用。
  - **中**：在特定条件下可被利用，或削弱纵深防御、扩大攻击面。
  - **低**：加固性建议，单独利用难度高，主要影响可维护性与合规性。
