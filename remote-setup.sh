#!/bin/bash
# 远程部署初始化脚本 - 生成环境变量并启动服务
set -e

cd "${DEPLOY_DIR:-/opt/penjing}"

# 生成强随机密钥
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)
MYSQL_PASSWORD=$(openssl rand -hex 16)
REDIS_PASSWORD=$(openssl rand -hex 16)
ADMIN_PASSWORD="$(openssl rand -base64 16 | tr -d '/+=' | head -c 16)Aa1"
SERVER_IP=$(hostname -I | awk '{print $1}')

# 写入 .env 文件
cat > .env << ENVEOF
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
MYSQL_PASSWORD=${MYSQL_PASSWORD}
DATABASE_URL=mysql://penjing:${MYSQL_PASSWORD}@mysql:3306/penjing_db
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=4000
NODE_ENV=production
CORS_ORIGIN=http://${SERVER_IP},https://${SERVER_IP}
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=5242880
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_DEFAULT_PASSWORD=${ADMIN_PASSWORD}
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_SOCKET_URL=
ENVEOF

chmod 600 .env
echo "=== 环境变量已生成 ==="
echo "SERVER_IP=${SERVER_IP}"
echo "ADMIN_PASSWORD=${ADMIN_PASSWORD}"
echo ""

# 创建 SSL 证书
mkdir -p nginx/ssl
if [ ! -f nginx/ssl/cert.pem ]; then
    openssl req -x509 -nodes -days 365 \
        -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=CN/ST=Beijing/L=Beijing/O=Penjing/CN=${SERVER_IP}" 2>/dev/null
    echo "=== SSL 证书已生成 ==="
fi

# 清理旧容器和缓存（保留数据卷，避免数据丢失）
# ⚠️ 禁止使用 --volumes，否则会删除 mysql_data/redis_data/uploads_data
echo "=== 清理旧容器（保留数据卷）==="
docker compose down --remove-orphans 2>/dev/null || true
docker builder prune -f 2>/dev/null || true
docker image prune -f 2>/dev/null || true

# 构建并启动
echo "=== 构建 Docker 镜像 ==="
docker compose build --no-cache

echo "=== 启动服务 ==="
docker compose up -d

echo ""
echo "=== 等待服务就绪 ==="
echo "等待 MySQL..."
for i in $(seq 1 30); do
    if docker exec penjing-mysql mysqladmin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD}" --silent 2>/dev/null; then
        echo "  MySQL 就绪"
        break
    fi
    sleep 2
done

echo "等待后端..."
for i in $(seq 1 60); do
    if docker exec penjing-backend wget -q --spider http://localhost:4000/health/live 2>/dev/null; then
        echo "  后端就绪"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "  后端超时，查看日志："
        docker logs penjing-backend --tail 30
    fi
    sleep 3
done

echo "等待前端..."
for i in $(seq 1 40); do
    if docker exec penjing-frontend wget -q --spider http://localhost:3000 2>/dev/null; then
        echo "  前端就绪"
        break
    fi
    if [ $i -eq 40 ]; then
        echo "  前端超时，查看日志："
        docker logs penjing-frontend --tail 30
    fi
    sleep 3
done

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo "  用户端:  http://${SERVER_IP}"
echo "  管理端:  http://${SERVER_IP}/admin/dashboard"
echo "  账号:    admin"
echo "  密码:    ${ADMIN_PASSWORD}"
echo "=========================================="
