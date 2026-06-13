-- CreateIndex
CREATE INDEX `achievement_owner_type_owner_id_unlocked_at_idx` ON `achievement`(`owner_type`, `owner_id`, `unlocked_at`);

-- CreateIndex
CREATE INDEX `badge_definition_is_active_trigger_type_sort_order_idx` ON `badge_definition`(`is_active`, `trigger_type`, `sort_order`);

-- CreateIndex
CREATE INDEX `family_member_user_id_left_at_idx` ON `family_member`(`user_id`, `left_at`);

-- CreateIndex
CREATE INDEX `order_family_id_status_completed_at_idx` ON `order`(`family_id`, `status`, `completed_at`);

-- RenameIndex
ALTER TABLE `recipe` RENAME INDEX `recipe_created_by_user_id_fkey` TO `recipe_created_by_user_id_idx`;
