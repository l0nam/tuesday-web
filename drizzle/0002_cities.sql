CREATE TABLE `city` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(32) NOT NULL,
	`name_key` varchar(64) NOT NULL,
	`description` varchar(300),
	`owner_id` varchar(36) NOT NULL,
	`banner_code` varchar(255) NOT NULL,
	`discord_url` varchar(255),
	`recruiting` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `city_id` PRIMARY KEY(`id`),
	CONSTRAINT `city_name_key_unique` UNIQUE(`name_key`),
	CONSTRAINT `city_owner_id_unique` UNIQUE(`owner_id`)
);
--> statement-breakpoint
CREATE TABLE `city_application` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`city_id` int unsigned NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`message` varchar(300),
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	`reject_reason` varchar(300),
	`reviewed_by` varchar(36),
	`reviewed_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `city_application_id` PRIMARY KEY(`id`),
	CONSTRAINT `city_application_city_user_uidx` UNIQUE(`city_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `city_member` (
	`user_id` varchar(36) NOT NULL,
	`city_id` int unsigned NOT NULL,
	`role` varchar(16) NOT NULL DEFAULT 'member',
	`joined_at` datetime(3) NOT NULL,
	CONSTRAINT `city_member_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `city` ADD CONSTRAINT `city_owner_id_user_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `city_application` ADD CONSTRAINT `city_application_city_id_city_id_fk` FOREIGN KEY (`city_id`) REFERENCES `city`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `city_application` ADD CONSTRAINT `city_application_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `city_member` ADD CONSTRAINT `city_member_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `city_member` ADD CONSTRAINT `city_member_city_id_city_id_fk` FOREIGN KEY (`city_id`) REFERENCES `city`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `city_application_user_idx` ON `city_application` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `city_application_city_status_idx` ON `city_application` (`city_id`,`status`);--> statement-breakpoint
CREATE INDEX `city_member_city_idx` ON `city_member` (`city_id`,`role`);