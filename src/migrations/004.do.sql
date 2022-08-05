ALTER TABLE `pinning_service`.`pin_file`
DROP INDEX `idx_pin_file_deleted_pin_status`,
ADD INDEX `idx_pin_file_deleted_pin_status`(`deleted` ASC, `pin_status` ASC, `expired_at` ASC) USING BTREE;
