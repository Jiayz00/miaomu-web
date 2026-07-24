-- 增量迁移：补充关键复合索引与外键级联策略
-- 背景：第七轮 DBA 审查发现以下查询缺少有效索引覆盖，导致 filesort 或全表扫描
--
-- 索引变更（幂等性说明：Prisma migrate deploy 按顺序执行，本迁移假定索引不存在）
--   1. bonsais(category_id, status, deleted_at) —— 加速 findRelated 同分类推荐查询
--   2. chat_rooms(user_id, bonsai_id)            —— 加速 createRoom 复用会话查询
--   3. chat_messages(room_id, created_at)        —— 加速会话消息分页查询，避免 filesort
--   4. view_logs(bonsai_id, created_at)          —— 加速按盆景统计浏览趋势
--   5. view_logs(user_id)                        —— 加速按用户查询浏览历史
--
-- 外键策略变更：
--   - chat_rooms.bonsai_id: RESTRICT → SET NULL（盆景硬删除时会话保留，bonsai_id 置空）
--   - view_logs.user_id:    RESTRICT → SET NULL（用户硬删除时浏览日志保留，user_id 置空）
--   说明：业务层盆景采用软删除，正常流程不触发外键级联；此变更仅为 DBA 层防御性设计

-- 1. 添加复合索引
CREATE INDEX `bonsais_category_id_status_idx_deleted_at_idx` ON `bonsais`(`category_id`, `status`, `deleted_at`);

CREATE INDEX `chat_rooms_user_id_bonsai_id_idx` ON `chat_rooms`(`user_id`, `bonsai_id`);

CREATE INDEX `chat_messages_room_id_created_at_idx` ON `chat_messages`(`room_id`, `created_at`);

CREATE INDEX `view_logs_bonsai_id_created_at_idx` ON `view_logs`(`bonsai_id`, `created_at`);

CREATE INDEX `view_logs_user_id_idx` ON `view_logs`(`user_id`);

-- 2. 调整外键级联策略（先 DROP 再 ADD）
ALTER TABLE `chat_rooms` DROP FOREIGN KEY `chat_rooms_bonsai_id_fkey`;
ALTER TABLE `chat_rooms` ADD CONSTRAINT `chat_rooms_bonsai_id_fkey` FOREIGN KEY (`bonsai_id`) REFERENCES `bonsais`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `view_logs` DROP FOREIGN KEY `view_logs_user_id_fkey`;
ALTER TABLE `view_logs` ADD CONSTRAINT `view_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
