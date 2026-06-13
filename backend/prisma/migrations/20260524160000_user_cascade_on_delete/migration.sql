-- Recipe.createdByUserId: RESTRICT -> CASCADE
ALTER TABLE `recipe` DROP FOREIGN KEY `recipe_created_by_user_id_fkey`;
ALTER TABLE `recipe` ADD CONSTRAINT `recipe_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Order.customerUserId: RESTRICT -> CASCADE
ALTER TABLE `order` DROP FOREIGN KEY `order_customer_user_id_fkey`;
ALTER TABLE `order` ADD CONSTRAINT `order_customer_user_id_fkey` FOREIGN KEY (`customer_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Order.chefUserId: RESTRICT -> CASCADE
ALTER TABLE `order` DROP FOREIGN KEY `order_chef_user_id_fkey`;
ALTER TABLE `order` ADD CONSTRAINT `order_chef_user_id_fkey` FOREIGN KEY (`chef_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- OrderMessage.senderUserId: SET NULL -> CASCADE
ALTER TABLE `order_message` DROP FOREIGN KEY `order_message_sender_user_id_fkey`;
ALTER TABLE `order_message` ADD CONSTRAINT `order_message_sender_user_id_fkey` FOREIGN KEY (`sender_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Rating.raterUserId: RESTRICT -> CASCADE
ALTER TABLE `rating` DROP FOREIGN KEY `rating_rater_user_id_fkey`;
ALTER TABLE `rating` ADD CONSTRAINT `rating_rater_user_id_fkey` FOREIGN KEY (`rater_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- TimelineEntry.customerUserId: SET NULL -> CASCADE
ALTER TABLE `timeline_entry` DROP FOREIGN KEY `timeline_entry_customer_user_id_fkey`;
ALTER TABLE `timeline_entry` ADD CONSTRAINT `timeline_entry_customer_user_id_fkey` FOREIGN KEY (`customer_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- TimelineEntry.chefUserId: SET NULL -> CASCADE
ALTER TABLE `timeline_entry` DROP FOREIGN KEY `timeline_entry_chef_user_id_fkey`;
ALTER TABLE `timeline_entry` ADD CONSTRAINT `timeline_entry_chef_user_id_fkey` FOREIGN KEY (`chef_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- TimelineEntry.hiddenByUserId: SET NULL -> CASCADE
ALTER TABLE `timeline_entry` DROP FOREIGN KEY `timeline_entry_hidden_by_user_id_fkey`;
ALTER TABLE `timeline_entry` ADD CONSTRAINT `timeline_entry_hidden_by_user_id_fkey` FOREIGN KEY (`hidden_by_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Feedback.userId: SET NULL -> CASCADE
ALTER TABLE `feedback` DROP FOREIGN KEY `feedback_user_id_fkey`;
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- BusinessConfig.updatedBy: SET NULL -> CASCADE
ALTER TABLE `business_config` DROP FOREIGN KEY `business_config_updated_by_fkey`;
ALTER TABLE `business_config` ADD CONSTRAINT `business_config_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- BusinessConfigChange.operatorId: RESTRICT -> CASCADE
ALTER TABLE `business_config_change` DROP FOREIGN KEY `business_config_change_operator_id_fkey`;
ALTER TABLE `business_config_change` ADD CONSTRAINT `business_config_change_operator_id_fkey` FOREIGN KEY (`operator_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
