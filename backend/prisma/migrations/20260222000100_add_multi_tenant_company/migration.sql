CREATE TABLE `companies` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `companies_slug_key`(`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `companies` (`name`, `slug`, `status`, `created_at`, `updated_at`)
VALUES ('Default Company', 'default-company', 'active', NOW(3), NOW(3));

ALTER TABLE `users`
  ADD COLUMN `company_id` INTEGER NULL,
  ADD COLUMN `active_company_id` INTEGER NULL;

UPDATE `users` SET `company_id` = 1, `active_company_id` = 1 WHERE `company_id` IS NULL;
ALTER TABLE `users`
  MODIFY `company_id` INTEGER NOT NULL,
  ADD INDEX `users_company_id_idx`(`company_id`),
  ADD INDEX `users_active_company_id_idx`(`active_company_id`),
  ADD CONSTRAINT `users_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `users_active_company_id_fkey` FOREIGN KEY (`active_company_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `projects` ADD COLUMN `company_id` INTEGER NULL;
UPDATE `projects` SET `company_id` = 1 WHERE `company_id` IS NULL;
ALTER TABLE `projects`
  MODIFY `company_id` INTEGER NOT NULL,
  DROP INDEX `projects_nj_number_key`,
  ADD UNIQUE INDEX `projects_company_id_nj_number_key`(`company_id`, `nj_number`),
  ADD INDEX `projects_company_id_idx`(`company_id`),
  ADD CONSTRAINT `projects_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `leaves` ADD COLUMN `company_id` INTEGER NULL;
UPDATE `leaves` SET `company_id` = 1 WHERE `company_id` IS NULL;
ALTER TABLE `leaves`
  MODIFY `company_id` INTEGER NOT NULL,
  ADD INDEX `leaves_company_id_idx`(`company_id`),
  ADD CONSTRAINT `leaves_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `notifications` ADD COLUMN `company_id` INTEGER NULL;
UPDATE `notifications` SET `company_id` = 1 WHERE `company_id` IS NULL;
ALTER TABLE `notifications`
  MODIFY `company_id` INTEGER NOT NULL,
  ADD INDEX `notifications_company_id_idx`(`company_id`),
  ADD CONSTRAINT `notifications_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `production_orders` ADD COLUMN `company_id` INTEGER NULL;
UPDATE `production_orders` SET `company_id` = 1 WHERE `company_id` IS NULL;
ALTER TABLE `production_orders`
  MODIFY `company_id` INTEGER NOT NULL,
  ADD INDEX `production_orders_company_id_idx`(`company_id`),
  ADD CONSTRAINT `production_orders_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `audit_logs` ADD COLUMN `company_id` INTEGER NULL;
UPDATE `audit_logs` SET `company_id` = 1 WHERE `company_id` IS NULL;
ALTER TABLE `audit_logs`
  MODIFY `company_id` INTEGER NOT NULL,
  ADD INDEX `audit_logs_company_id_idx`(`company_id`),
  ADD CONSTRAINT `audit_logs_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
