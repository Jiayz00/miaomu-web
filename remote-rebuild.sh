#!/bin/bash
# 后端重新构建与部署脚本
set -e
cd "${DEPLOY_DIR:-/opt/penjing}"

echo "===== [1/3] 构建后端镜像 ====="
docker compose build backend --no-cache

echo "===== [2/3] 重启服务 ====="
docker compose up -d

echo "===== [3/3] 等待后端启动 ====="
for i in $(seq 1 40); do
  if docker exec penjing-backend wget -q --spider http://localhost:4000/api/v1/bonsais?page=1\&limit=1 2>/dev/null; then
    echo "  后端已就绪 (用时 $((i*5))s)"
    echo "DEPLOY_SUCCESS" > /tmp/deploy-status.txt
    exit 0
  fi
  sleep 5
done

echo "  后端启动失败，最新日志："
docker logs penjing-backend --tail 50
echo "DEPLOY_FAILED" > /tmp/deploy-status.txt
exit 1
