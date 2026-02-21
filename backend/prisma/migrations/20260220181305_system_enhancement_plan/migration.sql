/*
  Warnings:

  - You are about to alter the column `from_status` on the `project_status_history` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(8))`.
  - You are about to alter the column `to_status` on the `project_status_history` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(8))`.

*/
-- AlterTable
ALTER TABLE `project_status_history` MODIFY `from_status` ENUM('new', 'designing', 'revision', 'review', 'approved', 'in_production', 'done', 'cancelled', 'blocked') NULL,
    MODIFY `to_status` ENUM('new', 'designing', 'revision', 'review', 'approved', 'in_production', 'done', 'cancelled', 'blocked') NOT NULL;

-- AlterTable
ALTER TABLE `projects` ADD COLUMN `is_archived` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `password_reset_expires` DATETIME(3) NULL,
    ADD COLUMN `password_reset_token` VARCHAR(255) NULL;

-- CreateIndex
CREATE INDEX `audit_logs_resource_type_resource_id_idx` ON `audit_logs`(`resource_type`, `resource_id`);

-- CreateIndex
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs`(`created_at`);

-- CreateIndex
CREATE INDEX `daily_logs_user_id_created_at_idx` ON `daily_logs`(`user_id`, `created_at`);

-- CreateIndex
CREATE INDEX `leaves_start_date_end_date_idx` ON `leaves`(`start_date`, `end_date`);

-- CreateIndex
CREATE INDEX `notifications_user_id_is_read_idx` ON `notifications`(`user_id`, `is_read`);

-- CreateIndex
CREATE INDEX `notifications_created_at_idx` ON `notifications`(`created_at`);

-- CreateIndex
CREATE INDEX `production_orders_order_status_idx` ON `production_orders`(`order_status`);

-- CreateIndex
CREATE INDEX `project_comments_created_at_idx` ON `project_comments`(`created_at`);

-- CreateIndex
CREATE INDEX `project_revisions_created_at_idx` ON `project_revisions`(`created_at`);

-- CreateIndex
CREATE INDEX `projects_status_idx` ON `projects`(`status`);

-- CreateIndex
CREATE INDEX `projects_created_at_idx` ON `projects`(`created_at`);

-- CreateIndex
CREATE INDEX `projects_deadline_idx` ON `projects`(`deadline`);

-- RenameIndex
ALTER TABLE `audit_logs` RENAME INDEX `audit_logs_user_id_fkey` TO `audit_logs_user_id_idx`;

-- RenameIndex
ALTER TABLE `daily_logs` RENAME INDEX `daily_logs_project_id_fkey` TO `daily_logs_project_id_idx`;

-- RenameIndex
ALTER TABLE `leaves` RENAME INDEX `leaves_user_id_fkey` TO `leaves_user_id_idx`;

-- RenameIndex
ALTER TABLE `production_orders` RENAME INDEX `production_orders_project_id_fkey` TO `production_orders_project_id_idx`;

-- RenameIndex
ALTER TABLE `project_comments` RENAME INDEX `project_comments_project_id_fkey` TO `project_comments_project_id_idx`;

-- RenameIndex
ALTER TABLE `project_revisions` RENAME INDEX `project_revisions_project_id_fkey` TO `project_revisions_project_id_idx`;

-- RenameIndex
ALTER TABLE `project_status_history` RENAME INDEX `project_status_history_project_id_fkey` TO `project_status_history_project_id_idx`;

-- RenameIndex
ALTER TABLE `projects` RENAME INDEX `projects_assigned_designer_id_fkey` TO `projects_assigned_designer_id_idx`;

-- RenameIndex
ALTER TABLE `projects` RENAME INDEX `projects_created_by_id_fkey` TO `projects_created_by_id_idx`;
