-- Tuesday shop: distinguish automatic and manual fulfillment.
-- Existing rows/orders default to auto to preserve current behavior.
ALTER TABLE `shop_item`
  ADD COLUMN `fulfillment_mode` varchar(16) NOT NULL DEFAULT 'auto';

ALTER TABLE `shop_order`
  ADD COLUMN `fulfillment_mode` varchar(16) NOT NULL DEFAULT 'auto';
