-- AlterTable
ALTER TABLE `production_orders` MODIFY `order_status` ENUM('pending_approval', 'approved', 'ordered', 'shipped', 'in_customs', 'delivered', 'rejected', 'rework') NOT NULL DEFAULT 'pending_approval';

-- AlterTable
ALTER TABLE `projects` ADD COLUMN `is_hard_deadline` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `status` ENUM('new', 'designing', 'revision', 'review', 'approved', 'in_production', 'done', 'cancelled', 'blocked') NOT NULL DEFAULT 'new';
