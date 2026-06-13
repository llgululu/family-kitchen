-- AlterTable: add notification preferences JSON column to user
ALTER TABLE `user` ADD COLUMN `notification_prefs` Json NOT NULL DEFAULT ('{}');

-- CreateTable: notification_log
CREATE TABLE `notification_log` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(30) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `body` VARCHAR(500) NOT NULL,
    `data` Json NOT NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notification_log_userId_createdAt_idx`(`user_id`, `created_at`),
    INDEX `notification_log_userId_readAt_idx`(`user_id`, `read_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notification_log` ADD CONSTRAINT `notification_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
