-- Локальная тестовая среда для сайта Tuesday.
-- Выполняется автоматически при первом старте контейнера (docker-entrypoint-initdb.d)
-- или вручную: mariadb -u root -p < docker/mariadb/init/01-init.sql
--
-- Что создаётся:
--   1) база tuesday_web  - БД сайта (профили, баланс, магазин), пользователь tuesday_web с полными правами только на неё
--   2) база discordsrv   - ИМИТАЦИЯ базы плагина DiscordSRV с таблицей связанных аккаунтов,
--                          пользователь tuesday_ro имеет право только SELECT (как на продакшене)
--
-- ВАЖНО: пароли ниже только для локальной разработки. На сервере заказчика используйте свои.

CREATE DATABASE IF NOT EXISTS tuesday_web
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS discordsrv
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'tuesday_web'@'%' IDENTIFIED BY 'tuesday_web_pass';
GRANT ALL PRIVILEGES ON tuesday_web.* TO 'tuesday_web'@'%';

CREATE USER IF NOT EXISTS 'tuesday_ro'@'%' IDENTIFIED BY 'tuesday_ro_pass';
GRANT SELECT ON discordsrv.* TO 'tuesday_ro'@'%';

-- Для подключений с localhost (нативная установка без docker)
CREATE USER IF NOT EXISTS 'tuesday_web'@'localhost' IDENTIFIED BY 'tuesday_web_pass';
GRANT ALL PRIVILEGES ON tuesday_web.* TO 'tuesday_web'@'localhost';
CREATE USER IF NOT EXISTS 'tuesday_ro'@'localhost' IDENTIFIED BY 'tuesday_ro_pass';
GRANT SELECT ON discordsrv.* TO 'tuesday_ro'@'localhost';

FLUSH PRIVILEGES;

-- Имитация таблицы связанных аккаунтов DiscordSRV (JDBC-бэкенд).
-- Имя таблицы и колонок на реальном сервере нужно сверить командой DESCRIBE и при
-- необходимости поправить DISCORDSRV_* переменные в .env (см. README).
USE discordsrv;

CREATE TABLE IF NOT EXISTS discordsrv_accounts (
  discord VARCHAR(32) NOT NULL,
  uuid    VARCHAR(36) NOT NULL,
  PRIMARY KEY (discord),
  KEY idx_uuid (uuid)
) ENGINE = InnoDB;

-- Тестовые связки (выдуманные Discord ID и UUID).
-- Чтобы проверить сценарий "аккаунт уже привязан" со своим Discord, добавьте свою строку:
--   INSERT INTO discordsrv.discordsrv_accounts (discord, uuid)
--   VALUES ('ВАШ_DISCORD_ID', 'ваш-minecraft-uuid-с-дефисами');
-- Если своей строки нет, сайт покажет подсказку "привяжите Discord к игровому аккаунту".
INSERT IGNORE INTO discordsrv_accounts (discord, uuid) VALUES
  ('100000000000000001', '069a79f4-44e9-4726-a5be-fca90e38aaf5'),
  ('100000000000000002', '853c80ef-3c37-49fd-aa49-938b674adae6');
