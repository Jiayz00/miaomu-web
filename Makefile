# 盆景平台常用命令快捷方式
# 使用方式：make <target>，例如 make dev、make build、make deploy
#
# 设计原则：
# - 所有命令在仓库根目录执行
# - 开发命令不依赖 .env（使用 dev compose 内的固定密码）
# - 生产命令依赖 .env 文件（部署前需准备）
# - 部署/备份命令在服务器端执行

.PHONY: help install dev dev-down dev-logs dev-reset build up down logs ps \
        backend-logs frontend-logs nginx-logs mysql-logs redis-logs \
        backend-shell mysql-shell redis-shell \
        prisma-generate prisma-push prisma-seed prisma-migrate \
        lint lint-frontend lint-backend \
        backup restore backup-list \
        deploy deploy-remote \
        clean clean-images clean-volumes

# 颜色定义（仅 GNU Make 4+ 支持，低版本自动忽略）
GREEN  := \033[32m
YELLOW := \033[33m
RED    := \033[31m
RESET  := \033[0m

# 默认目标
.DEFAULT_GOAL := help

help: ## 显示所有可用命令
	@echo "盆景平台 - 常用命令"
	@echo ""
	@echo "$(YELLOW)开发环境：$(RESET)"
	@echo "  make install          安装前后端依赖"
	@echo "  make dev              启动开发环境（仅 MySQL + Redis）"
	@echo "  make dev-down         停止开发环境"
	@echo "  make dev-logs         查看开发环境日志"
	@echo "  make dev-reset        重置开发数据库（删除卷后重启）"
	@echo ""
	@echo "$(YELLOW)生产环境：$(RESET)"
	@echo "  make build            构建所有生产镜像"
	@echo "  make up               启动所有生产服务"
	@echo "  make down             停止所有生产服务"
	@echo "  make logs             跟踪所有生产服务日志"
	@echo "  make ps               查看生产服务状态"
	@echo ""
	@echo "$(YELLOW)单服务日志：$(RESET)"
	@echo "  make backend-logs     后端日志"
	@echo "  make frontend-logs    前端日志"
	@echo "  make nginx-logs       Nginx 日志"
	@echo "  make mysql-logs       MySQL 日志"
	@echo "  make redis-logs       Redis 日志"
	@echo ""
	@echo "$(YELLOW)容器 shell：$(RESET)"
	@echo "  make backend-shell    进入后端容器"
	@echo "  make mysql-shell      进入 MySQL CLI"
	@echo "  make redis-shell      进入 Redis CLI"
	@echo ""
	@echo "$(YELLOW)数据库：$(RESET)"
	@echo "  make prisma-generate  生成 Prisma Client"
	@echo "  make prisma-push      同步 schema 到数据库（dev）"
	@echo "  make prisma-seed      注入种子数据"
	@echo "  make prisma-migrate   执行生产迁移"
	@echo ""
	@echo "$(YELLOW)质量保证：$(RESET)"
	@echo "  make lint             运行所有 lint"
	@echo "  make lint-frontend    前端 lint"
	@echo "  make lint-backend     后端 lint"
	@echo ""
	@echo "$(YELLOW)备份与恢复：$(RESET)"
	@echo "  make backup           备份 MySQL 数据库"
	@echo "  make backup-list      列出所有备份"
	@echo "  make restore FILE=xxx 恢复指定备份（需指定 FILE 路径）"
	@echo ""
	@echo "$(YELLOW)部署：$(RESET)"
	@echo "  make deploy           服务器端一键部署"
	@echo "  make deploy-remote    远程重新构建后端"
	@echo ""
	@echo "$(YELLOW)清理：$(RESET)"
	@echo "  make clean            停止并删除所有容器与网络（保留数据卷）"
	@echo "  clean-volumes         同时删除数据卷（危险！数据将丢失）"
	@echo "  clean-images          清理悬挂镜像"

# ===== 开发环境 =====
install: ## 安装前后端依赖
	@echo "$(GREEN)安装后端依赖...$(RESET)"
	cd backend && npm install
	@echo "$(GREEN)安装前端依赖...$(RESET)"
	cd frontend && npm install

dev: ## 启动开发环境（仅 MySQL + Redis）
	@echo "$(GREEN)启动开发环境数据库...$(RESET)"
	docker compose -f docker-compose.dev.yml up -d
	@echo ""
	@echo "$(GREEN)开发环境已就绪：$(RESET)"
	@echo "  MySQL: 127.0.0.1:3306  (root/rootpassword, penjing/penjingpassword)"
	@echo "  Redis: 127.0.0.1:6379  (无密码)"
	@echo ""
	@echo "启动后端：  cd backend && npm run start:dev"
	@echo "启动前端：  cd frontend && npm run dev"

dev-down: ## 停止开发环境
	@echo "$(YELLOW)停止开发环境...$(RESET)"
	docker compose -f docker-compose.dev.yml down

dev-logs: ## 查看开发环境日志
	docker compose -f docker-compose.dev.yml logs -f

dev-reset: ## 重置开发数据库（删除卷后重启）
	@echo "$(RED)⚠️ 即将删除所有开发数据，3 秒后开始，Ctrl+C 取消...$(RESET)"
	@sleep 3
	docker compose -f docker-compose.dev.yml down -v
	$(MAKE) dev

# ===== 生产环境 =====
build: ## 构建所有生产镜像
	@echo "$(GREEN)构建 Docker 镜像...$(RESET)"
	docker compose build

up: ## 启动所有生产服务
	@echo "$(GREEN)启动生产服务...$(RESET)"
	docker compose up -d
	@$(MAKE) ps

down: ## 停止所有生产服务
	@echo "$(YELLOW)停止生产服务...$(RESET)"
	docker compose down --remove-orphans

logs: ## 跟踪所有生产服务日志
	docker compose logs -f

ps: ## 查看生产服务状态
	@echo "$(GREEN)生产服务状态：$(RESET)"
	docker compose ps

# ===== 单服务日志 =====
backend-logs:
	docker logs penjing-backend -f --tail 100

frontend-logs:
	docker logs penjing-frontend -f --tail 100

nginx-logs:
	docker logs penjing-nginx -f --tail 100

mysql-logs:
	docker logs penjing-mysql -f --tail 100

redis-logs:
	docker logs penjing-redis -f --tail 100

# ===== 容器 shell =====
backend-shell:
	docker exec -it penjing-backend sh

mysql-shell:
	docker exec -it penjing-mysql mysql -uroot -p"$$(grep MYSQL_ROOT_PASSWORD .env | cut -d= -f2)" penjing_db

redis-shell:
	@REDIS_PASSWORD=$$(grep REDIS_PASSWORD .env | cut -d= -f2); \
	docker exec -it penjing-redis redis-cli -a "$$REDIS_PASSWORD"

# ===== Prisma =====
prisma-generate: ## 生成 Prisma Client
	cd backend && npx prisma generate

prisma-push: ## 同步 schema 到数据库（dev）
	cd backend && npx prisma db push

prisma-seed: ## 注入种子数据
	cd backend && npm run prisma:seed

prisma-migrate: ## 执行生产迁移
	cd backend && npx prisma migrate deploy

# ===== Lint =====
lint: lint-frontend lint-backend ## 运行所有 lint

lint-frontend:
	cd frontend && npm run lint

lint-backend:
	cd backend && npm run lint

# ===== 备份与恢复 =====
BACKUP_DIR ?= /opt/penjing-backups
backup: ## 备份 MySQL 数据库（默认到 /opt/penjing-backups）
	@mkdir -p $(BACKUP_DIR)
	@BACKUP_FILE="$(BACKUP_DIR)/penjing-`date +%Y%m%d-%H%M%S`.sql.gz"; \
	echo "$(GREEN)开始备份到 $$BACKUP_FILE ...$(RESET)"; \
	REDIS_PASSWORD=$$(grep REDIS_PASSWORD .env | cut -d= -f2); \
	MYSQL_ROOT_PASSWORD=$$(grep MYSQL_ROOT_PASSWORD .env | cut -d= -f2); \
	docker exec penjing-mysql mysqldump -uroot -p"$$MYSQL_ROOT_PASSWORD" \
		--single-transaction --quick --routines --triggers --events \
		penjing_db | gzip > $$BACKUP_FILE; \
	echo "$(GREEN)备份完成：$$BACKUP_FILE$$(gzip -l $$BACKUP_FILE | awk 'NR==2{printf \" (压缩后 %s)\", $$2}')$(RESET)"

backup-list: ## 列出所有备份
	@echo "$(GREEN)备份列表：$(RESET)"
	@ls -lh $(BACKUP_DIR)/ 2>/dev/null || echo "  $(YELLOW)备份目录不存在：$(BACKUP_DIR)$(RESET)"

restore: ## 恢复指定备份：make restore FILE=/path/to/backup.sql.gz
	@if [ -z "$(FILE)" ]; then echo "$(RED)❌ 请指定备份文件：make restore FILE=/path/to/backup.sql.gz$(RESET)"; exit 1; fi
	@if [ ! -f "$(FILE)" ]; then echo "$(RED)❌ 备份文件不存在：$(FILE)$(RESET)"; exit 1; fi
	@echo "$(RED)⚠️ 即将覆盖现有数据库，10 秒后开始，Ctrl+C 取消...$(RESET)"
	@sleep 10
	@echo "$(GREEN)开始恢复 $$(basename $(FILE)) ...$(RESET)"; \
	MYSQL_ROOT_PASSWORD=$$(grep MYSQL_ROOT_PASSWORD .env | cut -d= -f2); \
	gunzip -c $(FILE) | docker exec -i penjing-mysql mysql -uroot -p"$$MYSQL_ROOT_PASSWORD" penjing_db; \
	echo "$(GREEN)恢复完成$(RESET)"

# ===== 部署 =====
deploy: ## 服务器端一键部署
	bash deploy.sh

deploy-remote: ## 远程重新构建后端
	bash remote-rebuild.sh

# ===== 清理 =====
clean: ## 停止并删除所有容器与网络（保留数据卷）
	@echo "$(YELLOW)停止并删除所有容器（保留数据卷）...$(RESET)"
	docker compose down --remove-orphans
	docker compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true

clean-volumes: ## 同时删除数据卷（危险！数据将丢失）
	@echo "$(RED)⚠️ 即将删除所有数据卷，数据将永久丢失！10 秒后开始，Ctrl+C 取消...$(RESET)"
	@sleep 10
	docker compose down -v --remove-orphans
	docker compose -f docker-compose.dev.yml down -v --remove-orphans 2>/dev/null || true

clean-images: ## 清理悬挂镜像
	@echo "$(YELLOW)清理悬挂镜像...$(RESET)"
	docker image prune -f
