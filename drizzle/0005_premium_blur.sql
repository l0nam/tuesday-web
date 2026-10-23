ALTER TABLE `shop_item` ADD `fulfillment_mode` varchar(16) DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE `shop_order` ADD `fulfillment_mode` varchar(16) DEFAULT 'auto' NOT NULL;