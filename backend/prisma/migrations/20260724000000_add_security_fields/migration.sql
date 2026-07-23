-- CreateTable: 用户安全字段（登录失败计数、锁定、最后登录时间、密码修改时间）
-- 用于实现账号锁定（防爆破）、密码修改后强制重新登录等功能

ALTER TABLE `users`
  ADD COLUMN `failed_login_attempts` INT NOT NULL DEFAULT 0,
  ADD COLUMN `locked_until` DATETIME(3) NULL,
  ADD COLUMN `last_login_at` DATETIME(3) NULL,
  ADD COLUMN `password_changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- 索引：加速锁定状态查询（定时清理过期锁定 / 登录时检查锁定）
CREATE INDEX `users_locked_until_idx` ON `users`(`locked_until`);
