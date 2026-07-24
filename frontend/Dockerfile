# 前端 Dockerfile - 多阶段构建
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# --- 生产阶段 ---
FROM node:18-alpine AS production

# 安装 dumb-init 用于正确的 PID 1 信号转发
# 避免 Node.js 直接作为 PID 1 时无法接收 SIGTERM 导致容器停止超时
RUN apk add --no-cache dumb-init wget

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 安全：以非 root 用户运行 Next.js 进程
# node:18-alpine 镜像内置 uid=1000(node) 用户，避免容器内提权攻击
RUN chown -R node:node /app
USER node

EXPOSE 3000

# 使用 dumb-init 作为 PID 1，确保 SIGTERM 被正确转发给 Node.js
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

# 健康检查：使用 wget 探测自身存活
# alpine 镜像默认含 wget，无需额外安装 busybox
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget --spider -q http://127.0.0.1:3000/ || exit 1
