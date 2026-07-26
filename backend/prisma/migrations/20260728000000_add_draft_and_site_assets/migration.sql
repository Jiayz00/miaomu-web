-- Extend SiteLayout with draft fields and add SiteAsset table
-- 支持站点编辑器草稿/发布分离机制与图集管理

-- 1) SiteLayout: 新增草稿字段（双字段方案，避免数据迁移）
ALTER TABLE `site_layouts`
  ADD COLUMN `draft_sections` JSON NULL,
  ADD COLUMN `draft_updated_at` DATETIME(3) NULL;

-- 2) SiteAsset: 新增图集表（与 site_layouts.sections 解耦）
CREATE TABLE `site_assets` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `url` VARCHAR(500) NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(50) NOT NULL,
  `size` INTEGER NOT NULL,
  `width` INTEGER NULL,
  `height` INTEGER NULL,
  `duration` INTEGER NULL,
  `alt` VARCHAR(200) NULL,
  `category` VARCHAR(20) NOT NULL DEFAULT 'image',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `site_assets_url_key`(`url`),
  INDEX `site_assets_category_idx`(`category`),
  INDEX `site_assets_created_at_idx`(`created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
