-- AlterTable
ALTER TABLE `order` ADD COLUMN `served_image_urls` JSON NOT NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `recipe_favorite` (
    `id` VARCHAR(191) NOT NULL,
    `recipe_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `recipe_favorite_user_id_idx`(`user_id`),
    UNIQUE INDEX `recipe_favorite_recipe_id_user_id_key`(`recipe_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feedback` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `content` VARCHAR(2000) NOT NULL,
    `contact` VARCHAR(200) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `app_version` VARCHAR(50) NULL,
    `platform` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `feedback_status_created_at_idx`(`status`, `created_at`),
    INDEX `feedback_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `user_deleted_at_idx` ON `user`(`deleted_at`);

-- AddForeignKey
ALTER TABLE `recipe_favorite` ADD CONSTRAINT `recipe_favorite_recipe_id_fkey` FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe_favorite` ADD CONSTRAINT `recipe_favorite_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timeline_entry` ADD CONSTRAINT `timeline_entry_customer_user_id_fkey` FOREIGN KEY (`customer_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timeline_entry` ADD CONSTRAINT `timeline_entry_chef_user_id_fkey` FOREIGN KEY (`chef_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
