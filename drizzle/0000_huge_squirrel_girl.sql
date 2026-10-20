CREATE TABLE `account` (
	`id` varchar(36) NOT NULL,
	`account_id` varchar(255) NOT NULL,
	`provider_id` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` datetime(3),
	`refresh_token_expires_at` datetime(3),
	`scope` text,
	`password` text,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `account_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_provider_account_uidx` UNIQUE(`provider_id`,`account_id`)
);
--> statement-breakpoint
CREATE TABLE `ledger` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`amount` int NOT NULL,
	`balance_after` int unsigned NOT NULL,
	`type` varchar(32) NOT NULL,
	`ref` varchar(191),
	`idempotency_key` varchar(191) NOT NULL,
	`meta` json,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `ledger_id` PRIMARY KEY(`id`),
	CONSTRAINT `ledger_idempotency_key_unique` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `mc_profile` (
	`mc_uuid` char(32) NOT NULL,
	`name` varchar(32) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `mc_profile_mc_uuid` PRIMARY KEY(`mc_uuid`)
);
--> statement-breakpoint
CREATE TABLE `pending_reward` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`mc_uuid` char(32) NOT NULL,
	`amount` int unsigned NOT NULL,
	`type` varchar(32) NOT NULL,
	`ref` varchar(191),
	`idempotency_key` varchar(191) NOT NULL,
	`meta` json,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `pending_reward_id` PRIMARY KEY(`id`),
	CONSTRAINT `pending_reward_idempotency_key_unique` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `player` (
	`user_id` varchar(36) NOT NULL,
	`discord_id` varchar(32) NOT NULL,
	`mc_uuid` char(32),
	`mc_name` varchar(32),
	`balance` int unsigned NOT NULL DEFAULT 0,
	`link_checked_at` datetime(3),
	`linked_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `player_user_id` PRIMARY KEY(`user_id`),
	CONSTRAINT `player_discord_id_unique` UNIQUE(`discord_id`),
	CONSTRAINT `player_mc_uuid_unique` UNIQUE(`mc_uuid`)
);
--> statement-breakpoint
CREATE TABLE `playtime_progress` (
	`mc_uuid` char(32) NOT NULL,
	`credited_units` int unsigned NOT NULL DEFAULT 0,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `playtime_progress_mc_uuid` PRIMARY KEY(`mc_uuid`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(36) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`token` varchar(255) NOT NULL,
	`ip_address` varchar(45),
	`user_agent` text,
	`user_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `shop_item` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`image_url` varchar(255),
	`price` int unsigned NOT NULL,
	`commands` json NOT NULL,
	`stock` int unsigned,
	`enabled` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `shop_item_id` PRIMARY KEY(`id`),
	CONSTRAINT `shop_item_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `shop_order` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`item_id` int unsigned NOT NULL,
	`item_name` varchar(120) NOT NULL,
	`mc_uuid` char(32) NOT NULL,
	`mc_name` varchar(32),
	`price` int unsigned NOT NULL,
	`commands` json NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	`fail_reason` varchar(255),
	`created_at` datetime(3) NOT NULL,
	`claimed_at` datetime(3),
	`completed_at` datetime(3),
	CONSTRAINT `shop_order_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ledger` ADD CONSTRAINT `ledger_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `player` ADD CONSTRAINT `player_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_order` ADD CONSTRAINT `shop_order_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_order` ADD CONSTRAINT `shop_order_item_id_shop_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `shop_item`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `ledger_user_created_idx` ON `ledger` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `pending_reward_uuid_idx` ON `pending_reward` (`mc_uuid`);--> statement-breakpoint
CREATE INDEX `player_mc_name_idx` ON `player` (`mc_name`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `shop_order_status_idx` ON `shop_order` (`status`,`claimed_at`);--> statement-breakpoint
CREATE INDEX `shop_order_user_idx` ON `shop_order` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);