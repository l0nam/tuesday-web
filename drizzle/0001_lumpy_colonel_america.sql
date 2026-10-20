CREATE TABLE `player_city` (
	`mc_uuid` char(32) NOT NULL,
	`city_id` varchar(100) NOT NULL,
	`city_name` varchar(120) NOT NULL,
	`role` varchar(32),
	`members` int unsigned,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `player_city_mc_uuid` PRIMARY KEY(`mc_uuid`)
);
--> statement-breakpoint
CREATE TABLE `player_day` (
	`mc_uuid` char(32) NOT NULL,
	`day` date NOT NULL,
	`seconds` int unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `player_day_mc_uuid_day_pk` PRIMARY KEY(`mc_uuid`,`day`)
);
--> statement-breakpoint
CREATE TABLE `player_discord` (
	`mc_uuid` char(32) NOT NULL,
	`discord_id` varchar(32),
	`username` varchar(64),
	`roles` json NOT NULL,
	`checked_at` datetime(3),
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `player_discord_mc_uuid` PRIMARY KEY(`mc_uuid`)
);
--> statement-breakpoint
CREATE TABLE `player_donate` (
	`mc_uuid` char(32) NOT NULL,
	`tier` varchar(32) NOT NULL,
	`expires_at` datetime(3),
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `player_donate_mc_uuid` PRIMARY KEY(`mc_uuid`)
);
--> statement-breakpoint
CREATE TABLE `player_stats` (
	`mc_uuid` char(32) NOT NULL,
	`total_seconds` bigint unsigned NOT NULL DEFAULT 0,
	`online` boolean NOT NULL DEFAULT false,
	`first_seen_at` datetime(3) NOT NULL,
	`last_seen_at` datetime(3),
	`playtime_reported_at` datetime(3),
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `player_stats_mc_uuid` PRIMARY KEY(`mc_uuid`)
);
--> statement-breakpoint
ALTER TABLE `player` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `player` ADD `show_discord` boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `mc_profile_name_idx` ON `mc_profile` (`name`);