-- 初始化迁移：创建所有核心表、索引与外键
-- 注意：users 表的安全字段（failed_login_attempts/locked_until/last_login_at/password_changed_at）
--       由后续 20260724000000_add_security_fields 迁移添加，此处不包含

-- 用户表
CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
  `avatar` VARCHAR(500) NULL,
  `phone` VARCHAR(20) NULL,
  `status` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `users_username_key`(`username`),
  UNIQUE INDEX `users_email_key`(`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 分类表
CREATE TABLE `categories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `slug` VARCHAR(50) NOT NULL,
  `description` TEXT NULL,
  `cover_image` VARCHAR(500) NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `status` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `categories_name_key`(`name`),
  UNIQUE INDEX `categories_slug_key`(`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 盆景商品表
CREATE TABLE `bonsais` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(120) NOT NULL,
  `description` TEXT NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `origin` VARCHAR(100) NOT NULL,
  `year` INT NOT NULL,
  `tree_age` INT NULL,
  `height` INT NULL,
  `width` INT NULL,
  `category_id` INT NOT NULL,
  `status` INT NOT NULL DEFAULT 1,
  `is_featured` BOOLEAN NOT NULL DEFAULT false,
  `view_count` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  UNIQUE INDEX `bonsais_slug_key`(`slug`),
  INDEX `bonsais_category_id_idx`(`category_id`),
  INDEX `bonsais_status_idx`(`status`),
  INDEX `bonsais_is_featured_idx`(`is_featured`),
  INDEX `bonsais_view_count_idx`(`view_count`),
  INDEX `bonsais_status_deleted_at_created_at_idx`(`status`, `deleted_at`, `created_at`),
  INDEX `bonsais_is_featured_status_deleted_at_idx`(`is_featured`, `status`, `deleted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 盆景图片表
CREATE TABLE `bonsai_images` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `bonsai_id` INT NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `is_main` BOOLEAN NOT NULL DEFAULT false,
  `sort` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `bonsai_images_bonsai_id_idx`(`bonsai_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 收藏表
CREATE TABLE `favorites` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `bonsai_id` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `favorites_user_id_bonsai_id_key`(`user_id`, `bonsai_id`),
  INDEX `favorites_user_id_idx`(`user_id`),
  INDEX `favorites_created_at_idx`(`created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 聊天会话表
CREATE TABLE `chat_rooms` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `bonsai_id` INT NULL,
  `status` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `chat_rooms_user_id_idx`(`user_id`),
  INDEX `chat_rooms_status_idx`(`status`),
  INDEX `chat_rooms_updated_at_idx`(`updated_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 聊天消息表
CREATE TABLE `chat_messages` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `room_id` INT NOT NULL,
  `sender_id` INT NOT NULL,
  `content` TEXT NOT NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `chat_messages_room_id_idx`(`room_id`),
  INDEX `chat_messages_sender_id_idx`(`sender_id`),
  INDEX `chat_messages_created_at_idx`(`created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 浏览日志表
CREATE TABLE `view_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NULL,
  `bonsai_id` INT NOT NULL,
  `ip` VARCHAR(45) NULL,
  `user_agent` VARCHAR(500) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `view_logs_bonsai_id_idx`(`bonsai_id`),
  INDEX `view_logs_created_at_idx`(`created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 外键约束
ALTER TABLE `bonsais` ADD CONSTRAINT `bonsais_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `bonsai_images` ADD CONSTRAINT `bonsai_images_bonsai_id_fkey` FOREIGN KEY (`bonsai_id`) REFERENCES `bonsais`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `favorites` ADD CONSTRAINT `favorites_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `favorites` ADD CONSTRAINT `favorites_bonsai_id_fkey` FOREIGN KEY (`bonsai_id`) REFERENCES `bonsais`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `chat_rooms` ADD CONSTRAINT `chat_rooms_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `chat_rooms` ADD CONSTRAINT `chat_rooms_bonsai_id_fkey` FOREIGN KEY (`bonsai_id`) REFERENCES `bonsais`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `chat_rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `view_logs` ADD CONSTRAINT `view_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `view_logs` ADD CONSTRAINT `view_logs_bonsai_id_fkey` FOREIGN KEY (`bonsai_id`) REFERENCES `bonsais`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
