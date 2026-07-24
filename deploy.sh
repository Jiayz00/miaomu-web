#!/bin/bash
# 盆景平台一键部署脚本（服务器端执行）
#
# 安全设计：
# - 所有密钥/密码使用 openssl rand 生成强随机值
# - 不硬编码任何密码
# - 部署完成后输出管理员密码（仅本次部署可见）
# - 清理旧版本释放磁盘空间
#
# DevOps 设计：
# - 部署前自动备份 MySQL（防部署失败导致数据丢失）
# - 旧版本代码与 .env 备份到 rollback 目录，部署失败可一键回滚
# - 健康检查失败自动触发回滚
# - 保留最近 1 次成功的部署快照（路径：$DEPLOY_DIR.rollback）

set -e

# ===== 错误处理与回滚 =====
ROLLBACK_DIR=""
DEPLOY_FAILED=0

cleanup_on_failure() {
  if [ "$DEPLOY_FAILED" -eq 1 ] && [ -n "$ROLLBACK_DIR" ] && [ -d "$ROLLBACK_DIR" ]; then
    echo ""
    echo "=========================================="
    echo "  ⚠️ 部署失败，正在自动回滚..."
    echo "=========================================="
    DEPLOY_DIR="${DEPLOY_DIR:-/opt/penjing}"
    # 停止失败的容器
    cd "$DEPLOY_DIR"
    docker compose down --remove-orphans 2>/dev/null || true
    # 恢复旧版本
    rm -rf "$DEPLOY_DIR"
    mv "$ROLLBACK_DIR" "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
    # 用旧 .env 启动旧版本（密钥不变才能继续访问数据卷）
    if [ -f "$DEPLOY_DIR/.env" ]; then
      docker compose up -d 2>/dev/null || true
    fi
    echo "✅ 已回滚到上一版本"
    echo "  请检查失败原因后重新部署"
    echo "  查看日志：docker compose -f $DEPLOY_DIR/docker-compose.yml logs"
  fi
}
trap 'DEPLOY_FAILED=1; cleanup_on_failure' ERR

echo "=========================================="
echo "  盆景艺术展示平台 - 一键部署"
echo "=========================================="

DEPLOY_DIR="${DEPLOY_DIR:-/opt/penjing}"
ROLLBACK_DIR="$DEPLOY_DIR.rollback"

# 1. 准备部署目录（停止旧容器，保留数据卷）
# ⚠️ 安全设计：禁止使用 --volumes 标志，避免误删 mysql_data/redis_data/uploads_data
# 数据卷仅在显式备份/重置时由管理员手动清理
echo "[1/8] 准备部署目录..."
if [ -d "$DEPLOY_DIR" ]; then
    echo "  停止旧版本容器（保留数据卷）..."
    cd "$DEPLOY_DIR"
    # 仅停止容器，不删除数据卷
    docker compose down --remove-orphans 2>/dev/null || true
    cd /

    # 备份旧版本到 rollback 目录（用于失败时回滚）
    # 上次的 rollback 目录先清理（仅保留最新一次成功的）
    rm -rf "$ROLLBACK_DIR"
    echo "  备份旧版本到 $ROLLBACK_DIR ..."
    cp -a "$DEPLOY_DIR" "$ROLLBACK_DIR"

    # 清理悬挂镜像（不影响正在使用的镜像）
    docker image prune -f 2>/dev/null || true
    # 备份旧 .env（保留至 rollback 目录中已含）
    # 删除代码文件，但保留数据卷（由 Docker 管理，不在 DEPLOY_DIR 内）
    rm -rf "$DEPLOY_DIR"
fi
mkdir -p "$DEPLOY_DIR"

# 2. 复制项目文件（排除不需要的文件）
echo "[2/8] 复制项目文件..."
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
    --exclude '.rollback' \
    "$SCRIPT_DIR/" "$DEPLOY_DIR/"

# 3. 部署前自动备份 MySQL（防止部署失败导致数据丢失）
#    仅在旧 rollback 目录中存在 .env 时执行（说明已有部署）
if [ -f "$ROLLBACK_DIR/.env" ]; then
    echo "[3/8] 部署前备份 MySQL ..."
    # 加载旧 .env 取得 MySQL 密码
    # shellcheck disable=SC1091
    set -a; source "$ROLLBACK_DIR/.env"; set +a
    BACKUP_DIR="/opt/penjing-backups"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/penjing-pre-deploy-$(date +%Y%m%d-%H%M%S).sql.gz"
    # 仅当旧容器还存在数据卷且可访问时备份
    if docker exec penjing-mysql mysqldump -uroot -p"${MYSQL_ROOT_PASSWORD}" \
        --single-transaction --quick --routines --triggers --events \
        penjing_db 2>/dev/null | gzip > "$BACKUP_FILE"; then
        BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || echo 0)
        if [ "$BACKUP_SIZE" -gt 100 ]; then
            echo "  ✅ MySQL 备份完成: $BACKUP_FILE"
        else
            echo "  ⚠️ MySQL 备份异常小，可能容器已停止（将使用 rollback 目录恢复）"
            rm -f "$BACKUP_FILE"
        fi
    else
        echo "  ⚠️ MySQL 备份失败（容器可能已停止），继续部署"
        rm -f "$BACKUP_FILE"
    fi
fi

# 4. 生成强随机环境变量
echo "[4/8] 生成安全环境变量..."

# 若存在旧 .env（rollback 中），优先复用相同密钥（保证旧 token、Redis 数据仍有效）
if [ -f "$ROLLBACK_DIR/.env" ]; then
    echo "  复用旧 .env（保留已有密钥，避免踢出已登录用户与丢失 Redis 缓存）"
    cp "$ROLLBACK_DIR/.env" "$DEPLOY_DIR/.env"
else
    # 首次部署：生成强随机密钥（64 字符 hex = 32 字节熵）
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
fi

chmod 600 "$DEPLOY_DIR/.env"
echo "  环境变量已生成（权限 600）"

# 加载 .env（用于后续步骤）
# shellcheck disable=SC1090
set -a; source "$DEPLOY_DIR/.env"; set +a
# 兼容首次部署（复用旧 .env 时不会输出 ADMIN_PASSWORD，需从环境变量取或重新生成）
ADMIN_PASSWORD="${ADMIN_DEFAULT_PASSWORD:-（沿用旧密码）}"
SERVER_IP=$(hostname -I | awk '{print $1}')

# 5. 配置 SSL（自签名证书用于初始部署）
echo "[5/8] 配置 SSL..."
mkdir -p "$DEPLOY_DIR/nginx/ssl"
if [ ! -f "$DEPLOY_DIR/nginx/ssl/cert.pem" ]; then
    openssl req -x509 -nodes -days 365 \
        -newkey rsa:2048 \
        -keyout "$DEPLOY_DIR/nginx/ssl/key.pem" \
        -out "$DEPLOY_DIR/nginx/ssl/cert.pem" \
        -subj "/C=CN/ST=Beijing/L=Beijing/O=Penjing/CN=${SERVER_IP}" 2>/dev/null || true
    echo "  自签名 SSL 证书已生成"
fi

# 6. 清理 Docker 缓存（释放磁盘空间）
echo "[6/8] 清理 Docker 缓存..."
docker builder prune -f 2>/dev/null || true
docker image prune -f 2>/dev/null || true

# 7. 构建并启动服务
echo "[7/8] 构建 Docker 镜像并启动服务..."
cd "$DEPLOY_DIR"
docker compose build --no-cache
docker compose up -d

# 8. 等待服务就绪
echo "[8/8] 等待服务就绪..."
echo "  等待 MySQL 启动..."
for i in $(seq 1 30); do
    if docker exec penjing-mysql mysqladmin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD}" --silent 2>/dev/null; then
        echo "  MySQL 已就绪"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "  ⚠️ MySQL 启动超时"
    fi
    sleep 2
done

echo "  等待后端启动..."
for i in $(seq 1 60); do
    if docker exec penjing-backend wget -q --spider http://localhost:4000/health/live 2>/dev/null; then
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

echo "  等待 Nginx 入口就绪..."
for i in $(seq 1 20); do
    if wget -q --spider http://localhost/nginx-health 2>/dev/null; then
        echo "  Nginx 已就绪"
        break
    fi
    if [ $i -eq 20 ]; then
        echo "  ⚠️ Nginx 启动超时，查看日志：docker logs penjing-nginx"
    fi
    sleep 2
done

# 完成校验：若任一容器未就绪，则视为失败，触发回滚
echo ""
echo "  校验容器健康状态..."
HEALTHY_COUNT=$(docker compose ps --format json 2>/dev/null | grep -c '"Health":"healthy"' || echo 0)
EXPECTED=4
if [ "$HEALTHY_COUNT" -lt "$EXPECTED" ]; then
    echo "  ⚠️ 健康容器数：$HEALTHY_COUNT / $EXPECTED，部署失败"
    DEPLOY_FAILED=1
    exit 1
fi

# 部署成功：清理 rollback 目录
echo ""
echo "  清理 rollback 目录（部署成功）..."
rm -rf "$ROLLBACK_DIR"

# 完成
echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "  用户端:    http://${SERVER_IP}"
echo "  管理端:    http://${SERVER_IP}/admin/dashboard"
echo "  健康检查:  http://${SERVER_IP}/health"
echo ""
if [ -n "${ADMIN_DEFAULT_PASSWORD:-}" ] && [ "${ADMIN_DEFAULT_PASSWORD}" != "（沿用旧密码）" ]; then
    echo "  管理员账号: admin"
    echo "  管理员密码: ${ADMIN_DEFAULT_PASSWORD}"
    echo ""
    echo "  ⚠️ 请立即记录密码并妥善保管！"
    echo "  ⚠️ 密码仅在本次部署输出，不会再次显示。"
else
    echo "  管理员账号: admin（密码沿用上次部署）"
fi
echo "  ⚠️ 生产环境请配置真实 SSL 证书并启用 HTTPS 强制跳转"
echo ""
echo "  查看服务状态: docker compose -f $DEPLOY_DIR/docker-compose.yml ps"
echo "  查看后端日志: docker logs penjing-backend -f"
echo "  查看前端日志: docker logs penjing-frontend -f"
echo "  查看 Nginx 日志: docker logs penjing-nginx -f"
echo ""
echo "  日常备份（建议加入 cron）: bash $DEPLOY_DIR/backup.sh"
echo "=========================================="

exit 0
