-- CreateTable (may already exist from failed migration attempt)
CREATE TABLE IF NOT EXISTS `badge_definition` (
    `id` VARCHAR(191) NOT NULL,
    `badge_key` VARCHAR(50) NOT NULL,
    `title` VARCHAR(30) NOT NULL,
    `description` VARCHAR(100) NOT NULL,
    `emoji` VARCHAR(10) NOT NULL,
    `category` VARCHAR(20) NOT NULL,
    `owner_type` VARCHAR(20) NOT NULL,
    `trigger_type` VARCHAR(30) NOT NULL,
    `evaluator_type` VARCHAR(30) NOT NULL,
    `evaluator_config` JSON NOT NULL,
    `hidden` BOOLEAN NOT NULL DEFAULT false,
    `progress_target` INTEGER NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `badge_definition_badge_key_key`(`badge_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `achievement` ADD CONSTRAINT `achievement_badge_key_fkey` FOREIGN KEY (`badge_key`) REFERENCES `badge_definition`(`badge_key`) ON DELETE RESTRICT ON UPDATE CASCADE;
