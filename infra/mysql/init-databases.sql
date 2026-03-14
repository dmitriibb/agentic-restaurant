-- Bootstrap script for the shared MySQL instance.
-- The MYSQL_DATABASE env var creates `users_db` automatically;
-- this script adds additional databases and application users.

CREATE DATABASE IF NOT EXISTS orders_db;
CREATE DATABASE IF NOT EXISTS production_db;

CREATE USER IF NOT EXISTS 'users'@'%' IDENTIFIED BY 'users';
GRANT ALL PRIVILEGES ON users_db.* TO 'users'@'%';

CREATE USER IF NOT EXISTS 'orders'@'%' IDENTIFIED BY 'orders';
GRANT ALL PRIVILEGES ON orders_db.* TO 'orders'@'%';

CREATE USER IF NOT EXISTS 'production'@'%' IDENTIFIED BY 'production';
GRANT ALL PRIVILEGES ON production_db.* TO 'production'@'%';

FLUSH PRIVILEGES;