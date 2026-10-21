CREATE TABLE `server_review` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(36) NOT NULL,
  `text` varchar(500) NOT NULL,
  `created_at` datetime(3) NOT NULL,
  CONSTRAINT `server_review_id` PRIMARY KEY(`id`),
  CONSTRAINT `server_review_user_id_unique` UNIQUE(`user_id`),
  CONSTRAINT `server_review_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
CREATE INDEX `server_review_created_idx` ON `server_review` (`created_at`);
