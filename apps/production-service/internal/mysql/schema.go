package mysql

import (
	"context"
	"database/sql"
	"fmt"
)

var migrations = []string{
	`CREATE TABLE IF NOT EXISTS production_orders (
		order_id BIGINT PRIMARY KEY,
		external_request_id VARCHAR(64) NOT NULL,
		user_id BIGINT NOT NULL,
		user_display_name VARCHAR(255) NULL,
		status VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
		total_item_count INT NOT NULL DEFAULT 0,
		ready_item_count INT NOT NULL DEFAULT 0,
		blocked_item_count INT NOT NULL DEFAULT 0,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		ready_at TIMESTAMP NULL,
		version BIGINT NOT NULL DEFAULT 1,
		INDEX idx_production_orders_status (status)
	)`,
	`CREATE TABLE IF NOT EXISTS production_items (
		id CHAR(26) PRIMARY KEY,
		order_id BIGINT NOT NULL,
		line_number INT NOT NULL,
		unit_sequence INT NOT NULL,
		source_item_key VARCHAR(64) NOT NULL,
		menu_item_id BIGINT NOT NULL,
		menu_item_name VARCHAR(255) NOT NULL,
		station_key VARCHAR(64) NOT NULL DEFAULT 'kitchen',
		status VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
		claimed_by_user_id BIGINT NULL,
		claimed_by_display_name VARCHAR(255) NULL,
		blocked_reason VARCHAR(255) NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		claimed_at TIMESTAMP NULL,
		ready_at TIMESTAMP NULL,
		version BIGINT NOT NULL DEFAULT 1,
		UNIQUE INDEX idx_production_items_source_key (order_id, line_number, unit_sequence),
		INDEX idx_production_items_order_id (order_id),
		INDEX idx_production_items_status (status),
		CONSTRAINT fk_production_items_order FOREIGN KEY (order_id) REFERENCES production_orders(order_id)
	)`,
	`CREATE TABLE IF NOT EXISTS processed_events (
		event_id VARCHAR(64) PRIMARY KEY,
		processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS production_event_outbox (
		id BIGINT AUTO_INCREMENT PRIMARY KEY,
		event_id VARCHAR(64) NOT NULL,
		aggregate_type VARCHAR(64) NOT NULL,
		aggregate_id VARCHAR(64) NOT NULL,
		routing_key VARCHAR(128) NOT NULL,
		payload_json TEXT NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		published_at TIMESTAMP NULL,
		INDEX idx_outbox_unpublished (published_at)
	)`,
}

// RunMigrations applies all schema DDL statements.
func RunMigrations(ctx context.Context, db *sql.DB) error {
	for i, ddl := range migrations {
		if _, err := db.ExecContext(ctx, ddl); err != nil {
			return fmt.Errorf("migration %d failed: %w", i, err)
		}
	}
	return nil
}
