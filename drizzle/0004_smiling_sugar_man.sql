CREATE TABLE `admin_audit` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`actor_user_id` varchar(36) NOT NULL,
	`target_user_id` varchar(36),
	`action` varchar(80) NOT NULL,
	`meta` json,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `admin_audit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_review_block` (
	`user_id` varchar(36) NOT NULL,
	`blocked_by` varchar(36) NOT NULL,
	`reason` varchar(240),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `admin_review_block_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `admin_role` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`discord_role_id` varchar(32) NOT NULL,
	`label` varchar(64) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `admin_role_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_role_discord_uidx` UNIQUE(`discord_role_id`)
);
--> statement-breakpoint
CREATE TABLE `admin_role_permission` (
	`role_id` int unsigned NOT NULL,
	`permission` varchar(64) NOT NULL,
	`allowed` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `admin_role_permission_role_id_permission_pk` PRIMARY KEY(`role_id`,`permission`)
);
--> statement-breakpoint
CREATE TABLE `server_review` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`text` varchar(500) NOT NULL,
	`rating` int unsigned NOT NULL DEFAULT 5,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `server_review_id` PRIMARY KEY(`id`),
	CONSTRAINT `server_review_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `admin_audit` ADD CONSTRAINT `admin_audit_actor_user_id_user_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_audit` ADD CONSTRAINT `admin_audit_target_user_id_user_id_fk` FOREIGN KEY (`target_user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_review_block` ADD CONSTRAINT `admin_review_block_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_review_block` ADD CONSTRAINT `admin_review_block_blocked_by_user_id_fk` FOREIGN KEY (`blocked_by`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_role_permission` ADD CONSTRAINT `admin_role_permission_role_id_admin_role_id_fk` FOREIGN KEY (`role_id`) REFERENCES `admin_role`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `server_review` ADD CONSTRAINT `server_review_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admin_audit_created_idx` ON `admin_audit` (`created_at`);--> statement-breakpoint
CREATE INDEX `admin_audit_target_idx` ON `admin_audit` (`target_user_id`);--> statement-breakpoint
CREATE INDEX `admin_role_permission_key_idx` ON `admin_role_permission` (`permission`);--> statement-breakpoint
CREATE INDEX `server_review_created_idx` ON `server_review` (`created_at`);