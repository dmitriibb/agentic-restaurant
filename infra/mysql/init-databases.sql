-- Bootstrap script for the shared MySQL instance.
-- The MYSQL_DATABASE env var creates `users_db` automatically;
-- this script adds the second database and both application users.

-- ── Second database ────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS orders_db;

-- ── Application users ──────────────────────────────────────
CREATE USER IF NOT EXISTS 'users'@'%' IDENTIFIED BY 'users';
GRANT ALL PRIVILEGES ON users_db.* TO 'users'@'%';

CREATE USER IF NOT EXISTS 'orders'@'%' IDENTIFIED BY 'orders';
GRANT ALL PRIVILEGES ON orders_db.* TO 'orders'@'%';

FLUSH PRIVILEGES;
