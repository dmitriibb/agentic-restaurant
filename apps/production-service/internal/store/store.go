package store

import (
	"context"
	"database/sql"
	"fmt"

	"agentic/restaurant/production-service/internal/domain"
)

// Store provides persistence operations for production state.
type Store struct {
	db *sql.DB
}

// New creates a Store backed by the given database connection.
func New(db *sql.DB) *Store {
	return &Store{db: db}
}

// BeginTx starts a new database transaction.
func (s *Store) BeginTx(ctx context.Context) (domain.TxHandle, error) {
	return s.db.BeginTx(ctx, nil)
}

// InsertProcessedEvent records an event as processed.
// Returns true if the event was newly inserted, false if it was a duplicate.
func (s *Store) InsertProcessedEvent(ctx context.Context, tx domain.TxHandle, eventID string) (bool, error) {
	sqlTx := tx.(*sql.Tx)
	result, err := sqlTx.ExecContext(ctx,
		"INSERT IGNORE INTO processed_events (event_id) VALUES (?)", eventID)
	if err != nil {
		return false, fmt.Errorf("insert processed_events: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("check rows affected: %w", err)
	}
	return rows > 0, nil
}

// UpsertProductionOrder creates or updates a production order.
// On first insert, sets total_item_count to 1. On duplicate, increments total_item_count.
func (s *Store) UpsertProductionOrder(ctx context.Context, tx domain.TxHandle, order *domain.ProductionOrder) error {
	sqlTx := tx.(*sql.Tx)
	_, err := sqlTx.ExecContext(ctx, `
		INSERT INTO production_orders (order_id, external_request_id, user_id, user_display_name, status, total_item_count, version)
		VALUES (?, ?, ?, ?, ?, 1, 1)
		ON DUPLICATE KEY UPDATE
			total_item_count = total_item_count + 1,
			updated_at = CURRENT_TIMESTAMP`,
		order.OrderID, order.ExternalRequestID, order.UserID, order.UserDisplayName, domain.StatusQueued)
	if err != nil {
		return fmt.Errorf("upsert production_orders: %w", err)
	}
	return nil
}

// InsertProductionItem inserts a new production item.
// Uses INSERT IGNORE to handle duplicate source_item_key gracefully.
// Returns true if the item was newly inserted.
func (s *Store) InsertProductionItem(ctx context.Context, tx domain.TxHandle, item *domain.ProductionItem) (bool, error) {
	sqlTx := tx.(*sql.Tx)
	result, err := sqlTx.ExecContext(ctx, `
		INSERT IGNORE INTO production_items (id, order_id, line_number, unit_sequence, source_item_key, menu_item_id, menu_item_name, station_key, status, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
		item.ID, item.OrderID, item.LineNumber, item.UnitSequence, item.SourceItemKey,
		item.MenuItemID, item.MenuItemName, item.StationKey, domain.StatusQueued)
	if err != nil {
		return false, fmt.Errorf("insert production_items: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("check rows affected: %w", err)
	}
	return rows > 0, nil
}

// CountItemsByStatus returns aggregated item counts grouped by status for an order.
func (s *Store) CountItemsByStatus(ctx context.Context, tx domain.TxHandle, orderID int64) (domain.ItemStatusCounts, error) {
	sqlTx := tx.(*sql.Tx)
	rows, err := sqlTx.QueryContext(ctx,
		"SELECT status, COUNT(*) FROM production_items WHERE order_id = ? GROUP BY status", orderID)
	if err != nil {
		return domain.ItemStatusCounts{}, fmt.Errorf("count items by status: %w", err)
	}
	defer rows.Close()

	var counts domain.ItemStatusCounts
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return domain.ItemStatusCounts{}, fmt.Errorf("scan status count: %w", err)
		}
		switch status {
		case domain.StatusQueued:
			counts.Queued = count
		case domain.StatusInProgress:
			counts.InProgress = count
		case domain.StatusBlocked:
			counts.Blocked = count
		case domain.StatusReady:
			counts.Ready = count
		case domain.StatusCancelled:
			counts.Cancelled = count
		}
	}
	return counts, rows.Err()
}

// UpdateOrderStatus updates the derived status and counts on a production order.
func (s *Store) UpdateOrderStatus(ctx context.Context, tx domain.TxHandle, orderID int64, status string, counts domain.ItemStatusCounts, readyAt *string) error {
	sqlTx := tx.(*sql.Tx)
	query := `UPDATE production_orders 
		SET status = ?, ready_item_count = ?, blocked_item_count = ?, 
		    version = version + 1, updated_at = CURRENT_TIMESTAMP`
	args := []any{status, counts.Ready, counts.Blocked}

	if readyAt != nil {
		query += ", ready_at = CURRENT_TIMESTAMP"
	}
	query += " WHERE order_id = ?"
	args = append(args, orderID)

	_, err := sqlTx.ExecContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("update order status: %w", err)
	}
	return nil
}

// InsertOutboxRecord inserts an outbound event record into the outbox.
func (s *Store) InsertOutboxRecord(ctx context.Context, tx domain.TxHandle, record *domain.OutboxRecord) error {
	sqlTx := tx.(*sql.Tx)
	_, err := sqlTx.ExecContext(ctx, `
		INSERT INTO production_event_outbox (event_id, aggregate_type, aggregate_id, routing_key, payload_json)
		VALUES (?, ?, ?, ?, ?)`,
		record.EventID, record.AggregateType, record.AggregateID, record.RoutingKey, record.PayloadJSON)
	if err != nil {
		return fmt.Errorf("insert outbox: %w", err)
	}
	return nil
}

// FetchUnpublishedOutbox returns up to limit outbox records that have not been published.
func (s *Store) FetchUnpublishedOutbox(ctx context.Context, limit int) ([]domain.OutboxRecord, error) {
	rows, err := s.db.QueryContext(ctx,
		"SELECT id, event_id, aggregate_type, aggregate_id, routing_key, payload_json FROM production_event_outbox WHERE published_at IS NULL ORDER BY id LIMIT ?",
		limit)
	if err != nil {
		return nil, fmt.Errorf("fetch unpublished outbox: %w", err)
	}
	defer rows.Close()

	var records []domain.OutboxRecord
	for rows.Next() {
		var r domain.OutboxRecord
		if err := rows.Scan(&r.ID, &r.EventID, &r.AggregateType, &r.AggregateID, &r.RoutingKey, &r.PayloadJSON); err != nil {
			return nil, fmt.Errorf("scan outbox record: %w", err)
		}
		records = append(records, r)
	}
	return records, rows.Err()
}

// MarkOutboxPublished marks an outbox record as published.
func (s *Store) MarkOutboxPublished(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx,
		"UPDATE production_event_outbox SET published_at = CURRENT_TIMESTAMP WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("mark outbox published: %w", err)
	}
	return nil
}
