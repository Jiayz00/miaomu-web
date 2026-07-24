-- 增量迁移：新增站点布局表 SiteLayout
--
-- 用途：管理员可自定义主页的区块构成、顺序与配置
-- - key: 布局键，如 "homepage"
-- - sections: JSON 数组，每项为 { id, type, title, subtitle, visible, config, order }
-- - is_active: 同一时刻仅允许一条记录为 true（由 service 层事务保证）
--
-- 区块类型：hero / featured / categories / bonsai-grid / showcase / story / cta / contact / stats

CREATE TABLE `site_layouts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(50) NOT NULL,
    `sections` JSON NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `site_layouts_key_key` (`key`),
    INDEX `site_layouts_is_active_idx` (`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
