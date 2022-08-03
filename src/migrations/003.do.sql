CREATE TABLE `configs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `key` varchar(32) NOT NULL,
  `value` varchar(256) NOT NULL,
  `create_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_update_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


ALTER TABLE `pinning_service`.`pin_object`
DROP COLUMN `status`,
DROP COLUMN `retry_times`,
DROP INDEX `index_pin_object_status`,
ADD INDEX `idx_pin_object_cid_deleted`(`cid`, `deleted`) USING BTREE;

