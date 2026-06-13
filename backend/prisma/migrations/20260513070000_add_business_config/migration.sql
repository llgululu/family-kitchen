-- CreateTable
CREATE TABLE `business_config` (
    `group_key` VARCHAR(64) NOT NULL,
    `value` JSON NOT NULL,
    `schema_version` INTEGER NOT NULL DEFAULT 1,
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` VARCHAR(191) NULL,

    PRIMARY KEY (`group_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `business_config_change` (
    `id` VARCHAR(191) NOT NULL,
    `group_key` VARCHAR(64) NOT NULL,
    `old_value` JSON NOT NULL,
    `new_value` JSON NOT NULL,
    `operator_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `business_config_change_group_key_created_at_idx`(`group_key`, `created_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `business_config` ADD CONSTRAINT `business_config_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_config_change` ADD CONSTRAINT `business_config_change_operator_id_fkey` FOREIGN KEY (`operator_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
