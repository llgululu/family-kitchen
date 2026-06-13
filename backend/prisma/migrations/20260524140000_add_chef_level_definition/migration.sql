-- CreateTable
CREATE TABLE `chef_level_definitions` (
    `id` VARCHAR(191) NOT NULL,
    `level_key` VARCHAR(30) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `emoji` VARCHAR(10) NOT NULL,
    `min_orders` INTEGER NOT NULL DEFAULT 0,
    `min_avg_rating` DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `chef_level_definitions_level_key_key` ON `chef_level_definitions`(`level_key`);
