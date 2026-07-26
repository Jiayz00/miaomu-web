# 后端 Dockerfile - 多阶段构建
# 使用 Debian slim 避免 Alpine OpenSSL 3.x 与 Prisma 二进制不兼容问题
FROM node:18-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --production=false

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
# 构建主应用（nest build）并编译 seed.ts 到 dist/prisma/seed.js
RUN npm run build && \
    npx tsc prisma/seed.ts --outDir dist/prisma \
      --module commonjs --target ES2021 --esModuleInterop \
      --skipLibCheck --resolveJsonModule --moduleResolution node

# --- 生产阶段 ---
FROM node:18-slim AS production

# 安装 openssl（Prisma 运行时依赖）+ wget（健康检查）+ dumb-init（信号转发）
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    wget \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production && npm install prisma @prisma/client

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/start.sh ./start.sh

# 生成 Prisma Client（生产阶段 node_modules 是独立安装的，需要重新生成）
RUN npx prisma generate

# 创建上传目录、sentinel 目录并收紧权限
# /app/data 用于存放首次启动标记（sentinel），需要 node 用户可写
RUN mkdir -p /app/uploads /app/data && \
    chown -R node:node /app && \
    chmod 750 /app/uploads /app/data && \
    chmod +x /app/start.sh

EXPOSE 4000

# 启动脚本：
# - 仅首次启动时执行 prisma db push + seed（通过 sentinel 文件标记）
# - 后续重启仅启动应用，避免每次启动丢数据 / 重置密码
USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "/app/start.sh"]
