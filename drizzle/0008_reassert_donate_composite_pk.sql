ALTER TABLE `mc_profile` ADD COLUMN IF NOT EXISTS `skin_url` varchar(512) NULL;
--> statement-breakpoint
UPDATE `shop_item` SET `commands` = JSON_ARRAY('lp user {player} parent addtemp plus 30d accumulate') WHERE `slug` = 'plus-1-month';
--> statement-breakpoint
UPDATE `shop_item` SET `commands` = JSON_ARRAY('lp user {player} parent addtemp plus 90d accumulate') WHERE `slug` = 'plus-3-months';
--> statement-breakpoint
UPDATE `shop_item` SET `commands` = JSON_ARRAY('lp user {player} parent addtemp plus 365d accumulate') WHERE `slug` = 'plus-1-year';
--> statement-breakpoint
UPDATE `shop_item` SET `commands` = JSON_ARRAY('lp user {player} parent addtemp gold 30d accumulate') WHERE `slug` = 'gold-1-month';
--> statement-breakpoint
UPDATE `shop_item` SET `commands` = JSON_ARRAY('lp user {player} parent addtemp gold 90d accumulate') WHERE `slug` = 'gold-3-months';
--> statement-breakpoint
UPDATE `shop_item` SET `commands` = JSON_ARRAY('lp user {player} parent addtemp gold 365d accumulate') WHERE `slug` = 'gold-1-year';
--> statement-breakpoint
ALTER TABLE `player_donate` DROP PRIMARY KEY, ADD PRIMARY KEY (`mc_uuid`, `tier`);
