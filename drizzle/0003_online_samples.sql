CREATE TABLE `online_sample` (
	`bucket` datetime(3) NOT NULL,
	`online` int unsigned NOT NULL,
	CONSTRAINT `online_sample_bucket` PRIMARY KEY(`bucket`)
);
