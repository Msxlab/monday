-- AlterTable
ALTER TABLE `refresh_tokens` ADD COLUMN `device_info` VARCHAR(500) NULL,
    ADD COLUMN `ip_address` VARCHAR(45) NULL,
    ADD COLUMN `last_used_at` DATETIME(3) NULL;
