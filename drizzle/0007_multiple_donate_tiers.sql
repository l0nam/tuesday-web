ALTER TABLE `mc_profile` ADD COLUMN IF NOT EXISTS `skin_url` varchar(512) NULL;--> statement-breakpoint
ALTER TABLE `player_donate` DROP PRIMARY KEY, ADD PRIMARY KEY (`mc_uuid`, `tier`);
