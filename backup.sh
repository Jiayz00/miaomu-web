#!/bin/bash
# 盆景平台 MySQL 自动备份脚本
#
# 功能：
# - 全量备份 penjing_db 数据库（含 routines / triggers / events）
# - 备份文件 gzip 压缩，文件名含时间戳
# - 自动清理超过保留期的旧备份（默认 7 天）
# - 失败时返回非 0 退出码（便于 cron / 监控系统告警）
#
# 部署方式（服务器端）：
# 1. 手动测试：bash backup.sh
# 2. 配置定时任务（每天凌晨 3 点备份）：
#    echo "0 3 * * * /opt/penjing/backup.sh >> /var/log/penjing-backup.log 2>&1" | \
#      crontab -
#
# 配置项（环境变量或 .env）：
# - BACKUP_DIR：备份目录，默认 /opt/penjing-backups
# - BACKUP_RETAIN_DAYS：保留天数，默认 7
# - MYSQL_CONTAINER：MySQL 容器名，默认 penjing-mysql
# - MYSQL_DATABASE：数据库名，默认 penjing_db
# - MYSQL_ROOT_PASSWORD：MySQL root 密码（必需，从 .env 读取）

set -euo pipefail

# ===== 加载 .env =====
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env}"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env 文件不存在: $ENV_FILE" >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

# ===== 配置 =====
BACKUP_DIR="${BACKUP_DIR:-/opt/penjing-backups}"
BACKUP_RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-7}"
MYSQL_CONTAINER="${MYSQL_CONTAINER:-penjing-mysql}"
MYSQL_DATABASE="${MYSQL_DATABASE:-penjing_db}"

if [ -z "${MYSQL_ROOT_PASSWORD:-}" ]; then
  echo "❌ MYSQL_ROOT_PASSWORD 未设置" >&2
  exit 1
fi

# ===== 准备备份目录 =====
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# ===== 生成备份 =====
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/penjing-${TIMESTAMP}.sql.gz"

echo "[$(date -u +%FT%TZ)] 开始备份 $MYSQL_DATABASE ..."

# 使用 --single-transaction 保证 InnoDB 一致性快照（不锁表）
# --quick 避免 MySQL 大表全量加载到内存
# --routines --triggers --events 保证存储过程、触发器、定时事件完整备份
docker exec "$MYSQL_CONTAINER" \
  mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --events \
  --default-character-set=utf8mb4 \
  "$MYSQL_DATABASE" 2>/dev/null | gzip > "$BACKUP_FILE"

BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE")
if [ "$BACKUP_SIZE" -lt 100 ]; then
  echo "❌ 备份文件异常小（${BACKUP_SIZE} 字节），可能备份失败" >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi

HUMAN_SIZE=$(numfmt --to=iec --suffix=B "$BACKUP_SIZE" 2>/dev/null || echo "${BACKUP_SIZE} bytes")
echo "[$(date -u +%FT%TZ)] ✅ 备份完成: $BACKUP_FILE ($HUMAN_SIZE)"

# ===== 清理旧备份 =====
DELETED=$(find "$BACKUP_DIR" -name "penjing-*.sql.gz" -mtime +"$BACKUP_RETAIN_DAYS" -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date -u +%FT%TZ)] 🗑️  清理 $DELETED 个超过 ${BACKUP_RETAIN_DAYS} 天的旧备份"
fi

# ===== 汇总 =====
TOTAL=$(find "$BACKUP_DIR" -name "penjing-*.sql.gz" | wc -l)
echo "[$(date -u +%FT%TZ)] 当前备份总数: $TOTAL"
echo "[$(date -u +%FT%TZ)] 备份目录: $BACKUP_DIR"

exit 0
