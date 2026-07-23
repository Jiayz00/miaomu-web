# 技术架构设计

## 1. 系统架构

```
                    ┌─────────────┐
                    │   Nginx     │ :80/:443
                    │  反向代理    │
                    └──────┬──────┘
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Frontend │ │ Backend  │ │ Socket.io│
        │ Next.js  │ │ NestJS   │ │ (Backend)│
        │ :3000    │ │ :4000    │ │ :4000    │
        └──────────┘ └────┬─────┘ └──────────┘
                          │
              ┌───────────┼───────────┐
              ▼                       ▼
        ┌──────────┐            ┌──────────┐
        │  MySQL   │            │  Redis   │
        │  :3306   │            │  :6379   │
        └──────────┘            └──────────┘
```

## 2. 数据库模型

```prisma
// 用户
model User {
  id          Int      @id @default(autoincrement())
  username    String   @unique @db.VarChar(50)
  email       String   @unique @db.VarChar(100)
  password    String   @db.VarChar(255)
  role        Role     @default(USER)    // ADMIN | USER
  avatar      String?  @db.VarChar(500)
  phone       String?  @db.VarChar(20)
  status      Int      @default(1)       // 1启用 0禁用
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  favorites   Favorite[]
  chatRooms   ChatRoom[]      @relation("UserRooms")
  messages    ChatMessage[]
  viewLogs    ViewLog[]

  @@map("users")
}

// 分类
model Category {
  id          Int      @id @default(autoincrement())
  name        String   @unique @db.VarChar(50)
  slug        String   @unique @db.VarChar(50)
  description String?  @db.Text
  coverImage  String?  @db.VarChar(500) @map("cover_image")
  sort        Int      @default(0)
  status      Int      @default(1)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  bonsais     Bonsai[]

  @@map("categories")
}

// 盆景商品
model Bonsai {
  id          Int      @id @default(autoincrement())
  name        String   @db.VarChar(100)
  slug        String   @unique @db.VarChar(120)
  description String   @db.Text
  price       Decimal  @db.Decimal(10, 2)
  stock       Int      @default(0)
  origin      String   @db.VarChar(100)   // 产地
  year        Int                           // 年份
  treeAge     Int?     @map("tree_age")    // 树龄
  height      Int?                           // 高度(cm)
  width       Int?                           // 宽度(cm)
  categoryId  Int      @map("category_id")
  status      Int      @default(1)          // 1上架 0下架
  isFeatured  Boolean  @default(false) @map("is_featured")
  viewCount   Int      @default(0) @map("view_count")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")  // 软删除

  category    Category @relation(fields: [categoryId], references: [id])
  images      BonsaiImage[]
  favorites   Favorite[]
  chatRooms   ChatRoom[]
  viewLogs    ViewLog[]

  @@index([categoryId])
  @@index([status])
  @@map("bonsais")
}

// 盆景图片
model BonsaiImage {
  id        Int      @id @default(autoincrement())
  bonsaiId  Int      @map("bonsai_id")
  url       String   @db.VarChar(500)
  isMain    Boolean  @default(false) @map("is_main")
  sort      Int      @default(0)
  createdAt DateTime @default(now()) @map("created_at")

  bonsai    Bonsai   @relation(fields: [bonsaiId], references: [id], onDelete: Cascade)

  @@index([bonsaiId])
  @@map("bonsai_images")
}

// 收藏
model Favorite {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  bonsaiId  Int      @map("bonsai_id")
  createdAt DateTime @default(now()) @map("created_at")

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  bonsai    Bonsai   @relation(fields: [bonsaiId], references: [id], onDelete: Cascade)

  @@unique([userId, bonsaiId])
  @@index([userId])
  @@map("favorites")
}

// 聊天会话
model ChatRoom {
  id          Int      @id @default(autoincrement())
  userId      Int      @map("user_id")
  bonsaiId    Int?     @map("bonsai_id")    // 可选关联盆景
  status      Int      @default(0)          // 0未处理 1已处理
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user        User     @relation("UserRooms", fields: [userId], references: [id])
  bonsai      Bonsai?  @relation(fields: [bonsaiId], references: [id])
  messages    ChatMessage[]

  @@index([userId])
  @@map("chat_rooms")
}

// 聊天消息
model ChatMessage {
  id        Int      @id @default(autoincrement())
  roomId    Int      @map("room_id")
  senderId  Int      @map("sender_id")
  content   String   @db.Text
  isRead    Boolean  @default(false) @map("is_read")
  createdAt DateTime @default(now()) @map("created_at")

  room      ChatRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  sender    User     @relation(fields: [senderId], references: [id])

  @@index([roomId])
  @@map("chat_messages")
}

// 浏览日志（数据分析用）
model ViewLog {
  id        Int      @id @default(autoincrement())
  userId    Int?     @map("user_id")        // 未登录为 null
  bonsaiId  Int      @map("bonsai_id")
  ip        String?  @db.VarChar(45)
  userAgent String?  @db.VarChar(500) @map("user_agent")
  createdAt DateTime @default(now()) @map("created_at")

  user      User?    @relation(fields: [userId], references: [id])
  bonsai    Bonsai   @relation(fields: [bonsaiId], references: [id], onDelete: Cascade)

  @@index([bonsaiId])
  @@index([createdAt])
  @@map("view_logs")
}

enum Role {
  ADMIN
  USER
}
```

## 3. 安全设计

### 3.1 认证流程
```
登录 → 验证密码(bcrypt) → 签发 AccessToken(15min) + RefreshToken(7d)
请求 → JwtAuthGuard 验证 AccessToken → 过期则用 RefreshToken 刷新
管理端 → AdminGuard 额外校验 role === ADMIN
```

### 3.2 API 安全中间件链
1. **Helmet** - 安全 HTTP 头
2. **CORS** - 白名单域名
3. **Rate Limiter** - 全局 100req/min/IP，登录 5req/min
4. **ValidationPipe** - DTO class-validator 全局校验
5. **JWT Guard** - 认证
6. **Role Guard** - 授权
7. **CSRF** - cookie 认证场景

### 3.3 文件上传安全
- 类型白名单：jpg/jpeg/png/webp
- 大小限制：5MB
- 文件名 UUID 随机化
- Sharp 重新编码（防恶意图片）
- 存储路径不可遍历

## 4. 前端架构

### 4.1 路由设计
```
/                      → 首页
/bonsais               → 盆景列表
/bonsais/[slug]        → 盆景详情
/categories/[slug]     → 分类页
/chat                  → 询价聊天
/favorites             → 我的收藏
/login                 → 登录
/register              → 注册
/profile               → 个人中心

/admin                 → 管理后台布局
/admin/dashboard       → 数据看板
/admin/bonsais         → 盆景管理
/admin/bonsais/new     → 新增盆景
/admin/bonsais/[id]    → 编辑盆景
/admin/categories      → 分类管理
/admin/users           → 用户管理
/admin/chat            → 询价管理
```

### 4.2 状态管理
- **Zustand** - 全局状态（用户信息、购物车状态）
- **React Query (TanStack Query)** - 服务端状态（API 数据缓存）
- **URL State** - 筛选/分页（shareable）

### 4.3 设计系统
```css
/* 色彩 */
--color-primary: #1a3a2e;      /* 深墨绿 */
--color-primary-light: #2d5a3d;
--color-accent: #c9a961;       /* 金色 */
--color-bg: #faf8f5;           /* 米白 */
--color-text: #2c2c2c;
--color-text-light: #6b6b6b;

/* 字体 */
--font-serif: 'Cormorant Garamond', serif;   /* 标题 */
--font-sans: 'Noto Sans SC', sans-serif;     /* 正文 */
```
