# 前端安全代码审查报告

- **审查范围**：`d:\盆景网站开发\frontend` (Next.js 14 + TypeScript + Zustand + TanStack Query)
- **审查日期**：2026-07-23
- **审查方式**：静态代码扫描（未修改任何代码）

## 审查摘要

| 检查项 | 风险等级 | 结论 |
|---|---|---|
| 1. XSS 防护 | 🟢 低 | 未发现 `dangerouslySetInnerHTML`，React 默认转义生效 |
| 2. Token 存储 | 🔴 高 | Access/Refresh Token 明文存于 `localStorage`，存在 XSS 窃取风险 |
| 3. API 请求处理 | 🟡 中 | 401 处理完善，但 403 未做统一处理 |
| 4. 环境变量 | 🟢 低 | 仅暴露 URL 类公开变量，未发现敏感信息泄露 |
| 5. 输入校验 | 🟡 中 | 存在基础校验，但缺少长度上限、邮箱格式、数值范围校验 |
| 6. WebSocket 安全 | 🟢 低 | Socket.io 通过 `auth` 携带 token，认证机制正确 |

---

## 1. XSS 防护 — 🟢 低风险

### 已正确实施
- 全局搜索 `src/` 目录，**未发现任何 `dangerouslySetInnerHTML` 用法**。
- 未发现 `eval()`、`new Function()`、`innerHTML`、`document.write` 等危险 API。
- 用户输入渲染均依赖 React 默认转义：
  - 盆景描述：`BonsaiDetail.tsx:135` 使用 `{bonsai.description}` + `whitespace-pre-line`，纯文本渲染。
  - 聊天消息：`ChatWidget.tsx:163` 使用 `{msg.content}`，React 自动转义。
  - 分类描述：`admin/categories/page.tsx:202` 使用 `{cat.description}`。
- 后端返回数据均通过 JSX 文本节点渲染，无 HTML 注入点。

### 建议
- 维持现状，避免后续引入 `dangerouslySetInnerHTML`（如需富文本，应使用 DOMPurify 等库净化）。

---

## 2. Token 存储 — 🔴 高风险

### 问题发现
- `src/stores/auth-store.ts:41-43`、`src/lib/api.ts:32/37` 将 **accessToken 与 refreshToken 同时存储在 `localStorage`** 中。
- `src/lib/socket.ts:19` 也从 `localStorage` 读取 token 用于 WebSocket 认证。
- localStorage 键名：`penjing_access_token`、`penjing_refresh_token`、`penjing_user`（见 `constants.ts:76-80`）。

### 风险
- 任何 XSS 漏洞都可通过 `localStorage.getItem` 直接读取并外传 token，导致会话劫持。
- refresh token 长期有效，一旦泄露可在用户无感知下持续获取新 access token。
- 项目未使用 `httpOnly` cookie（搜索 `httpOnly`/`cookie` 无结果），错失了浏览器层防护。

### 建议（优先级高）
- 将 **refresh token 改为 HttpOnly + Secure + SameSite cookie** 由后端 Set-Cookie 下发，前端不可读。
- access token 可保留在内存（Zustand state）中，刷新页面时通过 refresh cookie 重新换取。
- 若保留 localStorage 方案，需配合严格的 CSP（Content-Security-Policy）策略降低 XSS 风险。

---

## 3. API 请求处理 — 🟡 中风险

### 已正确实施（`src/lib/api.ts`）
- **统一 Authorization 头**：`api.ts:101-106` 对非 `skipAuth` 请求自动注入 `Authorization: Bearer <token>`。
- **401 自动刷新**：`api.ts:114-129` 收到 401 后调用 `refreshAccessToken()`，使用单例 Promise 防并发刷新（`api.ts:45`），刷新成功后重试原请求。
- **刷新失败兜底**：清除 localStorage 中的 token 与 user，跳转 `/login?redirect=...`，并抛出 `ApiError(401)`。
- **公开接口支持**：通过 `skipAuth` 选项跳过认证头（登录/注册接口已使用，见 `use-auth.ts:37/49`）。
- **自定义错误类型**：`ApiError` 携带 `status` 与 `data`，便于上层针对性处理。

### 问题发现
- **403 未做统一处理**：`api.ts:138-143` 仅对非 2xx 统一抛错，没有针对 403（无权限）的统一拦截。当前依赖各页面 `catch` 单独处理，可能导致权限错误体验不一致（如普通用户访问 admin 资源时无统一提示/跳转）。
- **401 跳转仅限浏览器侧**：SSR 场景下 `typeof window === 'undefined'` 时不会跳转，但因 token 本就只存在于客户端，影响有限。
- **JSON 解析无防护**：`api.ts:136` `JSON.parse(text)` 在 text 非合法 JSON 时会抛出原始异常（非 ApiError），上游 catch 难以统一识别。建议 try/catch 包裹。

### 建议
- 在 `request` 中对 403 增加统一处理（如跳转 403 提示页或 toast）。
- 包裹 `JSON.parse` 并降级为 `ApiError`。

---

## 4. 环境变量 — 🟢 低风险

### 已正确实施
- 仅有 2 处 `NEXT_PUBLIC_` 变量，均为**非敏感的公开 URL**：
  - `next.config.js:13`：`NEXT_PUBLIC_API_URL`（后端 API 地址，默认 `http://localhost:4000/api/v1`）
  - `src/lib/constants.ts:10`：`NEXT_PUBLIC_SOCKET_URL`（Socket.io 地址，默认 `http://localhost:4000`）
- 项目根目录**未发现 `.env` / `.env.local` / `.env.production` 文件**（Glob 搜索无结果），无硬编码密钥。
- 未在前端代码中暴露数据库连接串、JWT secret、第三方 API key 等敏感信息。

### 建议
- 生产部署时确保 `.env` 文件不入库；如需在前端引入新的 `NEXT_PUBLIC_` 变量，先评估是否真的需要客户端可见。

---

## 5. 输入校验 — 🟡 中风险

### 已正确实施
- **注册页**（`register/page.tsx:35-49`）：非空校验 + 密码长度 ≥ 6 + 两次密码一致性校验。
- **登录页**（`login/page.tsx:37-40`）：用户名/密码非空校验。
- **盆景表单**（`BonsaiForm.tsx:135-146`）：名称 `trim()` 非空、分类必选、至少 1 张图片。
- **分类表单**（`admin/categories/page.tsx:116-119`）：名称与 slug 必填。
- **聊天输入**（`ChatWidget.tsx:87`）：发送前 `trim()` 去空格，空内容禁用发送按钮。

### 问题发现
- **邮箱格式未校验**：`register/page.tsx` 仅依赖 `<input type="email">`，未做正则校验，浏览器禁用校验时可绕过。
- **缺少长度上限**：
  - 用户名/密码无最大长度限制（可能导致超长字符串攻击）。
  - 盆景名称、描述（`BonsaiForm.tsx:212/222`）、分类描述均无 maxLength。
  - 聊天消息（`ChatWidget.tsx:177`）无最大长度，可发送超大消息。
- **数值范围未校验**：`BonsaiForm.tsx:148-161` 对 price/stock/treeAge/height/width 仅做 `Number()` 转换，未校验非负、上限；价格字段允许负数或异常大数。
- **slug 格式未校验**：`admin/categories/page.tsx` 未对 slug 做格式约束（应限定为 `[a-z0-9-]`），可能影响 URL 路由。
- 校验均为提交时触发，缺少实时反馈（失焦校验）。

### 建议
- 前端补齐邮箱正则、maxLength、数值范围（如 price ≥ 0）、slug 格式校验。
- 引入 zod / yup 等校验库统一表单 schema。
- 注意：前端校验仅为体验优化，**后端必须重复校验**。

---

## 6. WebSocket 安全 — 🟢 低风险

### 已正确实施（`src/lib/socket.ts`）
- **认证 token 携带**：`socket.ts:22-28` 通过 socket.io 的 `auth: { token }` 字段在握手阶段传递 JWT，符合官方推荐做法（而非放在 query string 中，避免日志泄露）。
- **无 token 不连接**：`socket.ts:19-20` 未取到 token 时直接返回 `null`，不发起连接。
- **仅 WebSocket 传输**：`transports: ['websocket']` 禁用了 polling 回退，减少 long-polling 的认证暴露面。
- **登出断开**：`use-auth.ts:64` 登出时调用 `resetSocket()` 主动断开连接。
- **生命周期管理**：`use-socket.ts:32-53` 在 `isAuthenticated` 变化时建立/清理连接，避免未认证时占用 socket。

### 问题发现
- **token 刷新后未重连**：`api.ts` 刷新 access token 后未触发 socket 重连，旧 token 失效后 socket 鉴权可能失效（依赖 socket.io 自动重连，但重连仍用旧 token，需手动 `resetSocket` 后重连）。
- `socket.ts:30-32` 将连接错误 `console.error` 输出，生产环境应考虑脱敏或移除。
- 未看到对 socket 服务器地址的 origin 白名单校验（依赖服务端配置）。

### 建议
- 在 `api.ts` 刷新 token 成功后，调用 `resetSocket()` 触发重连，使新 token 生效。
- 生产环境移除/降级 `console.error` 中的详细错误信息。

---

## 综合建议（按优先级）

1. 🔴 **重构 token 存储**：refresh token 迁移至 HttpOnly cookie，access token 仅存内存（见第 2 节）。
2. 🟡 **补齐 API 403 统一处理** 与 JSON 解析异常兜底（见第 3 节）。
3. 🟡 **强化表单校验**：邮箱格式、长度上限、数值范围、slug 格式（见第 5 节）。
4. 🟢 **token 刷新后重连 socket**（见第 6 节）。
5. 🟢 **配置 CSP 响应头**：在 `next.config.js` 补充 `headers()` 配置 Content-Security-Policy，进一步降低 XSS 风险。

## 已正确实施的安全实践汇总

- ✅ 全程使用 React JSX 文本节点渲染，无 `dangerouslySetInnerHTML`
- ✅ API 统一封装，自动注入 Bearer token
- ✅ 401 自动刷新 + 单例防并发 + 失败兜底跳转
- ✅ 路由守卫：`ProtectedRoute` + `AdminRoute` 双层鉴权
- ✅ Socket.io 通过 `auth` 字段认证，禁用 polling
- ✅ 环境变量未泄露敏感信息
- ✅ 登出主动断开 socket 并清除本地态
