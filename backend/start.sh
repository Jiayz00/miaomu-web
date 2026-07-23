#!/bin/sh
# 后端容器启动脚本
#
# 安全与稳定性设计：
# 1. 数据库 schema 同步使用 `prisma db push`（不带 --accept-data-loss）
#    - 仅在 schema 与数据库结构不一致时才生效，不会主动删除已有数据
# 2. 种子数据仅在"首次启动"时执行（通过 sentinel 文件标记）
#    - 避免每次重启都重置管理员密码与示例数据
# 3. 通过依赖 healthcheck 已保证 mysql/redis 就绪后再启动
# 4. 以 node 用户运行，sentinel 目录在 Dockerfile 中已预创建并授权

set -e

echo "🚀 启动盆景后端..."

# 推送 schema（不带 --accept-data-loss，避免无差别丢数据）
echo "📦 同步数据库 schema..."
npx prisma db push || {
  echo "❌ 数据库 schema 同步失败"
  exit 1
}

# 仅首次启动时执行 seed（sentinel 文件存在则跳过）
# sentinel 存放在持久化卷 /app/data 中，容器重启不会丢失
SENTINEL="/app/data/.seed-completed"
if [ ! -f "$SENTINEL" ]; then
  echo "🌱 首次启动，执行种子数据初始化..."
  # 直接调用编译后的 seed.js（位于 dist/prisma/seed.js）
  if [ -f "/app/dist/prisma/seed.js" ]; then
    node /app/dist/prisma/seed.js || {
      echo "⚠️ 种子数据初始化失败，但继续启动应用（可能已存在数据）"
    }
  else
    echo "⚠️ 未找到编译后的 seed.js，跳过种子数据初始化"
  fi
  echo "completed at $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$SENTINEL" 2>/dev/null || true
  echo "✅ 种子数据初始化完成"
else
  echo "☑️ 已检测到初始化标记，跳过种子数据"
fi

# 启动应用
echo "🎯 启动 NestJS 应用..."
exec node dist/src/main.js
