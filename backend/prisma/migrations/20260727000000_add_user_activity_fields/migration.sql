-- Migration: 用户活动时间与登录 IP 字段
-- 用于后台用户管理增强：记录最后活动时间、登录时间与登录 IP

ALTER TABLE `users`
  ADD COLUMN `last_login_ip` VARCHAR(45) NULL,
  ADD COLUMN `last_active_at` DATETIME(3) NULL;
