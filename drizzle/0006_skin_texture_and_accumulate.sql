ALTER TABLE `mc_profile`
  ADD COLUMN `skin_url` varchar(512) NULL;

UPDATE `shop_item` SET `commands` = JSON_ARRAY('lp user {player} parent addtemp plus 30d accumulate')
WHERE `slug` = 'plus-1-month';

UPDATE `shop_item` SET `commands` = JSON_ARRAY('lp user {player} parent addtemp plus 90d accumulate')
WHERE `slug` = 'plus-3-months';

UPDATE `shop_item` SET `commands` = JSON_ARRAY('lp user {player} parent addtemp plus 365d accumulate')
WHERE `slug` = 'plus-1-year';

UPDATE `shop_item` SET `commands` = JSON_ARRAY('lp user {player} parent addtemp gold 30d accumulate')
WHERE `slug` = 'gold-1-month';

UPDATE `shop_item` SET `commands` = JSON_ARRAY('lp user {player} parent addtemp gold 90d accumulate')
WHERE `slug` = 'gold-3-months';

UPDATE `shop_item` SET `commands` = JSON_ARRAY('lp user {player} parent addtemp gold 365d accumulate')
WHERE `slug` = 'gold-1-year';
