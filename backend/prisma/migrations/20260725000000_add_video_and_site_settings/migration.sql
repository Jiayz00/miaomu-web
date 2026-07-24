-- 增量迁移：新增盆景视频字段与站点设置表
--
-- 1. bonsais 表新增 video 列（可选，存储展示视频 URL）
--    支持 mp4/webm/mov，最大 100MB，由后端 UploadService 校验
-- 2. 新增 site_settings 表（key-value 结构存储站点联系方式等可配置项）
--    - phone / email / address / wechat / weibo：联系方式
--    - show_phone / show_email / ...：展示开关（'true' / 'false'）
--    - site_name / site_description / icp：站点元信息
--    首次启动时由 SettingsModule.onModuleInit 初始化默认值

-- 1. 盆景视频字段
ALTER TABLE `bonsais` ADD COLUMN `video` VARCHAR(500) NULL;

-- 2. 站点设置表
CREATE TABLE `site_settings` (
    `key` VARCHAR(50) NOT NULL,
    `value` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
