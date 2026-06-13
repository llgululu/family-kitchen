-- CreateTable
CREATE TABLE `user` (
    `id` VARCHAR(191) NOT NULL,
    `wx_openid` VARCHAR(191) NOT NULL,
    `wx_unionid` VARCHAR(191) NULL,
    `nickname` VARCHAR(191) NOT NULL DEFAULT '情侣厨房用户',
    `avatar_url` VARCHAR(500) NULL,
    `signature` VARCHAR(200) NULL,
    `current_family_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_wx_openid_key`(`wx_openid`),
    INDEX `user_wx_openid_idx`(`wx_openid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `family` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `relation_type` VARCHAR(20) NOT NULL DEFAULT 'couple',
    `anniversary_date` DATE NULL,
    `invite_code` VARCHAR(20) NULL,
    `invite_code_expires_at` DATETIME(3) NULL,
    `creator_user_id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `dissolving_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `family_invite_code_key`(`invite_code`),
    INDEX `family_invite_code_idx`(`invite_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `family_member` (
    `id` VARCHAR(191) NOT NULL,
    `family_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'member',
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `left_at` DATETIME(3) NULL,

    INDEX `family_member_family_id_idx`(`family_id`),
    INDEX `family_member_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recipe` (
    `id` VARCHAR(191) NOT NULL,
    `family_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(30) NOT NULL,
    `image_urls` JSON NOT NULL,
    `difficulty` SMALLINT NOT NULL DEFAULT 3,
    `meal_tags` JSON NOT NULL,
    `flavor_tags` JSON NOT NULL,
    `notes` VARCHAR(500) NULL,
    `created_by_user_id` VARCHAR(191) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `order_count` INTEGER NOT NULL DEFAULT 0,
    `avg_rating` FLOAT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `recipe_family_id_is_deleted_idx`(`family_id`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order` (
    `id` VARCHAR(191) NOT NULL,
    `family_id` VARCHAR(191) NOT NULL,
    `customer_user_id` VARCHAR(191) NOT NULL,
    `chef_user_id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `expected_serve_at` DATETIME(3) NULL,
    `customer_notes` VARCHAR(500) NULL,
    `reject_reason` VARCHAR(200) NULL,
    `total_love_points` INTEGER NOT NULL DEFAULT 0,
    `served_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `order_family_id_status_idx`(`family_id`, `status`),
    INDEX `order_customer_user_id_idx`(`customer_user_id`),
    INDEX `order_chef_user_id_idx`(`chef_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_item` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `recipe_id` VARCHAR(191) NULL,
    `recipe_snapshot` JSON NOT NULL,
    `custom_notes` VARCHAR(200) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    INDEX `order_item_order_id_idx`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_message` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `sender_user_id` VARCHAR(191) NULL,
    `type` VARCHAR(20) NOT NULL,
    `content` JSON NOT NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_message_order_id_created_at_idx`(`order_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rating` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `rater_user_id` VARCHAR(191) NOT NULL,
    `stars` SMALLINT NOT NULL,
    `comment` VARCHAR(500) NULL,
    `image_urls` JSON NOT NULL,
    `is_auto_generated` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `rating_order_id_key`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `love_point_log` (
    `id` VARCHAR(191) NOT NULL,
    `family_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `change_amount` INTEGER NOT NULL,
    `balance_after` INTEGER NOT NULL,
    `change_type` VARCHAR(30) NOT NULL,
    `source_order_id` VARCHAR(191) NULL,
    `description` VARCHAR(200) NULL,
    `reversible_until` DATETIME(3) NULL,
    `is_reversed` BOOLEAN NOT NULL DEFAULT false,
    `reversed_from_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `love_point_log_reversed_from_id_key`(`reversed_from_id`),
    INDEX `love_point_log_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `love_point_log_family_id_created_at_idx`(`family_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `achievement` (
    `id` VARCHAR(191) NOT NULL,
    `owner_type` VARCHAR(20) NOT NULL,
    `owner_id` VARCHAR(191) NOT NULL,
    `badge_key` VARCHAR(50) NOT NULL,
    `source_order_id` VARCHAR(191) NULL,
    `metadata` JSON NOT NULL,
    `unlocked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `achievement_owner_type_owner_id_idx`(`owner_type`, `owner_id`),
    UNIQUE INDEX `achievement_owner_type_owner_id_badge_key_key`(`owner_type`, `owner_id`, `badge_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `timeline_entry` (
    `id` VARCHAR(191) NOT NULL,
    `family_id` VARCHAR(191) NOT NULL,
    `source_type` VARCHAR(20) NOT NULL,
    `source_order_id` VARCHAR(191) NULL,
    `occurred_at` DATETIME(3) NOT NULL,
    `image_urls` JSON NOT NULL,
    `customer_user_id` VARCHAR(191) NULL,
    `chef_user_id` VARCHAR(191) NULL,
    `customer_comment` VARCHAR(500) NULL,
    `chef_comment` VARCHAR(500) NULL,
    `hidden_by_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `timeline_entry_source_order_id_key`(`source_order_id`),
    INDEX `timeline_entry_family_id_occurred_at_idx`(`family_id`, `occurred_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_current_family_id_fkey` FOREIGN KEY (`current_family_id`) REFERENCES `family`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `family_member` ADD CONSTRAINT `family_member_family_id_fkey` FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `family_member` ADD CONSTRAINT `family_member_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe` ADD CONSTRAINT `recipe_family_id_fkey` FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe` ADD CONSTRAINT `recipe_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_family_id_fkey` FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_customer_user_id_fkey` FOREIGN KEY (`customer_user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_chef_user_id_fkey` FOREIGN KEY (`chef_user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_recipe_id_fkey` FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_message` ADD CONSTRAINT `order_message_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_message` ADD CONSTRAINT `order_message_sender_user_id_fkey` FOREIGN KEY (`sender_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rating` ADD CONSTRAINT `rating_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rating` ADD CONSTRAINT `rating_rater_user_id_fkey` FOREIGN KEY (`rater_user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `love_point_log` ADD CONSTRAINT `love_point_log_family_id_fkey` FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `love_point_log` ADD CONSTRAINT `love_point_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `love_point_log` ADD CONSTRAINT `love_point_log_source_order_id_fkey` FOREIGN KEY (`source_order_id`) REFERENCES `order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `love_point_log` ADD CONSTRAINT `love_point_log_reversed_from_id_fkey` FOREIGN KEY (`reversed_from_id`) REFERENCES `love_point_log`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achievement` ADD CONSTRAINT `achievement_source_order_id_fkey` FOREIGN KEY (`source_order_id`) REFERENCES `order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timeline_entry` ADD CONSTRAINT `timeline_entry_family_id_fkey` FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timeline_entry` ADD CONSTRAINT `timeline_entry_source_order_id_fkey` FOREIGN KEY (`source_order_id`) REFERENCES `order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timeline_entry` ADD CONSTRAINT `timeline_entry_hidden_by_user_id_fkey` FOREIGN KEY (`hidden_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
