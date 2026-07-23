#!/bin/bash
# 盆景平台一键部署脚本（服务器端执行）
#
# 安全设计：
# - 所有密钥/密码使用 openssl rand 生成强随机值
# - 不硬编码任何密码
# - 部署完成后输出管理员密码（仅本次部署可见）
# - 清理旧版本释放磁盘空间

set -e

echo "=========================================="
echo "  盆景艺术展示平台 - 一键部署"
echo "=========================================="

DEPLOY_DIR="${DEPLOY_DIR:-/opt/penjing}"

# 1. 准备部署目录（删除旧版本，释放磁盘）
echo "[1/7] 准备部署目录..."
if [ -d "$DEPLOY_DIR" ]; then
    echo "  停止并清理旧版本..."
    cd "$DEPLOY_DIR"
    docker compose down --volumes --remove-orphans 2>/dev/null || true
    cd /
    # 清理旧镜像
    docker image prune -f 2>/dev/null || true
    rm -rf "$DEPLOY_DIR"
fi
mkdir -p "$DEPLOY_DIR"

# 2. 复制项目文件（排除不需要的文件）
echo "[2/7] 复制项目文件..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
rsync -av --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.next' \
    --exclude 'dist' \
    --exclude 'uploads' \
    --exclude '*.log' \
    --exclude '.env' \
    --exclude '.env.local' \
    "$SCRIPT_DIR/" "$DEPLOY_DIR/"

# 3. 生成强随机环境变量
echo "[3/7] 生成安全环境变量..."

# 生成强随机密钥（64 字符 hex = 32 字节熵）
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)
MYSQL_PASSWORD=$(openssl rand -hex 16)
REDIS_PASSWORD=$(openssl rand -hex 16)
ADMIN_PASSWORD="$(openssl rand -base64 16 | tr -d '/+=' | head -c 16)Aa1"

# 获取服务器 IP
SERVER_IP=$(hostname -I | awk '{print $1}')

cat > "$DEPLOY_DIR/.env" << ENVEOF
# 数据库
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
MYSQL_PASSWORD=${MYSQL_PASSWORD}
DATABASE_URL=mysql://penjing:${MYSQL_PASSWORD}@mysql:3306/penjing_db

# Redis
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# JWT（64 字符 hex）
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# 服务
PORT=4000
NODE_ENV=production
CORS_ORIGIN=http://${SERVER_IP},https://${SERVER_IP}

# 文件上传
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=5242880

# 管理员
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_DEFAULT_PASSWORD=${ADMIN_PASSWORD}

# 前端
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_SOCKET_URL=
ENVEOF

chmod 600 "$DEPLOY_DIR/.env"
echo "  环境变量已生成（权限 600）"

# 4. 配置 SSL（自签名证书用于初始部署）
echo "[4/7] 配置 SSL..."
mkdir -p "$DEPLOY_DIR/nginx/ssl"
if [ ! -f "$DEPLOY_DIR/nginx/ssl/cert.pem" ]; then
    openssl req -x509 -nodes -days 365 \
        -newkey rsa:2048 \
        -keyout "$DEPLOY_DIR/nginx/ssl/key.pem" \
        -out "$DEPLOY_DIR/nginx/ssl/cert.pem" \
        -subj "/C=CN/ST=Beijing/L=Beijing/O=Penjing/CN=${SERVER_IP}" 2>/dev/null || true
    echo "  自签名 SSL 证书已生成"
fi

# 5. 清理 Docker 缓存（释放磁盘空间）
echo "[5/7] 清理 Docker 缓存..."
docker builder prune -f 2>/dev/null || true
docker image prune -f 2>/dev/null || true

# 6. 构建并启动服务
echo "[6/7] 构建 Docker 镜像并启动服务..."
cd "$DEPLOY_DIR"
docker compose build --no-cache
docker compose up -d

# 7. 等待服务就绪
echo "[7/7] 等待服务就绪..."
echo "  等待 MySQL 启动..."
for i in $(seq 1 30); do
    if docker exec penjing-mysql mysqladmin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD}" --silent 2>/dev/null; then
        echo "  MySQL 已就绪"
        break
    fi
    sleep 2
done

echo "  等待后端启动..."
for i in $(seq 1 60); do
    if docker exec penjing-backend wget -q --spider http://localhost:4000/api/v1/bonsais?page=1\&limit=1 2>/dev/null; then
        echo "  后端已就绪"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "  ⚠️ 后端启动超时，查看日志：docker logs penjing-backend"
    fi
    sleep 3
done

echo "  等待前端启动..."
for i in $(seq 1 40); do
    if docker exec penjing-frontend wget -q --spider http://localhost:3000 2>/dev/null; then
        echo "  前端已就绪"
        break
    fi
    if [ $i -eq 40 ]; then
        echo "  ⚠️ 前端启动超时，查看日志：docker logs penjing-frontend"
    fi
    sleep 3
done

# 完成
echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "  用户端:    http://${SERVER_IP}"
echo "  管理端:    http://${SERVER_IP}/admin/dashboard"
echo ""
echo "  管理员账号: admin"
echo "  管理员密码: ${ADMIN_PASSWORD}"
echo ""
echo "  ⚠️ 请立即记录密码并妥善保管！"
echo "  ⚠️ 密码仅在本次部署输出，不会再次显示。"
echo ""
echo "  查看服务状态: docker compose -f $DEPLOY_DIR/docker-compose.yml ps"
echo "  查看后端日志: docker logs penjing-backend -f"
echo "  查看前端日志: docker logs penjing-frontend -f"
echo "=========================================="
