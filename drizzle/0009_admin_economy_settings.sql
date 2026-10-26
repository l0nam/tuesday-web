CREATE TABLE `app_setting` (
  `key` varchar(64) NOT NULL,
  `value` json NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  CONSTRAINT `app_setting_key` PRIMARY KEY(`key`)
);
