package consumer

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"agentic/restaurant/production-service/internal/domain"
	"agentic/restaurant/production-service/internal/logging"
)

// ProductionStore abstracts the persistence operations needed by the handler.
type ProductionStore interface {
	BeginTx(ctx context.Context) (domain.TxHandle, error)
	InsertProcessedEvent(ctx context.Context, tx domain.TxHandle, eventID string) (bool, error)
	UpsertProductionOrder(ctx context.Context, tx domain.TxHandle, order *domain.ProductionOrder) error
	InsertProductionItem(ctx context.Context, tx domain.TxHandle, item *domain.ProductionItem) (bool, error)
	CountItemsByStatus(ctx context.Context, tx domain.TxHandle, orderID int64) (domain.ItemStatusCounts, error)
	UpdateOrderStatus(ctx context.Context, tx domain.TxHandle, orderID int64, status string, counts domain.ItemStatusCounts, readyAt *string) error
	InsertOutboxRecord(ctx context.Context, tx domain.TxHandle, record *domain.OutboxRecord) error
}

// Handler processes incoming production item requested events.
type Handler struct {
	store  ProductionStore
	logger *logging.Logger
}

// New creates a Handler.
func New(s ProductionStore, l *logging.Logger) *Handler {
	return &Handler{store: s, logger: l}
}

// HandleMessage processes a single AMQP message body.
// It runs the full flow inside a single database transaction:
// check idempotency, upsert order, insert item, derive status, write outbox.
// Returns nil on success (including idempotent duplicates).
func (h *Handler) HandleMessage(ctx context.Context, body []byte) error {
	var envelope domain.EventEnvelope
	if err := json.Unmarshal(body, &envelope); err != nil {
		h.logger.Error("failed to parse event envelope", err, nil)
		// Bad message format - don't requeue
		return nil
	}

	var payload domain.ItemRequestedPayload
	if err := json.Unmarshal(envelope.Payload, &payload); err != nil {
		h.logger.Error("failed to parse item requested payload", err, map[string]any{"eventId": envelope.EventID})
		return nil
	}

	tx, err := h.store.BeginTx(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		if tx != nil {
			_ = tx.Rollback()
		}
	}()

	// Step 1: Idempotency check
	isNew, err := h.store.InsertProcessedEvent(ctx, tx, envelope.EventID)
	if err != nil {
		return fmt.Errorf("insert processed event: %w", err)
	}
	if !isNew {
		// Duplicate event - commit and ack
		err = tx.Commit()
		tx = nil
		if err != nil {
			return fmt.Errorf("commit duplicate: %w", err)
		}
		h.logger.Info("duplicate event skipped", map[string]any{"eventId": envelope.EventID})
		return nil
	}

	// Step 2: Upsert production order
	var displayName *string
	if payload.UserDisplayName != "" {
		displayName = &payload.UserDisplayName
	}
	order := &domain.ProductionOrder{
		OrderID:           payload.OrderID,
		ExternalRequestID: payload.RequestID,
		UserID:            payload.UserID,
		UserDisplayName:   displayName,
	}
	if err := h.store.UpsertProductionOrder(ctx, tx, order); err != nil {
		return fmt.Errorf("upsert order: %w", err)
	}

	// Step 3: Insert production item
	itemID := domain.NewULID()
	sourceKey := fmt.Sprintf("%d-%d-%d", payload.OrderID, payload.LineNumber, payload.UnitSequence)
	item := &domain.ProductionItem{
		ID:            itemID,
		OrderID:       payload.OrderID,
		LineNumber:    payload.LineNumber,
		UnitSequence:  payload.UnitSequence,
		SourceItemKey: sourceKey,
		MenuItemID:    payload.MenuItemID,
		MenuItemName:  payload.MenuItemName,
		StationKey:    payload.StationKey,
	}
	if item.StationKey == "" {
		item.StationKey = "kitchen"
	}
	inserted, err := h.store.InsertProductionItem(ctx, tx, item)
	if err != nil {
		return fmt.Errorf("insert item: %w", err)
	}

	// Step 4: Count items by status and derive order status
	counts, err := h.store.CountItemsByStatus(ctx, tx, payload.OrderID)
	if err != nil {
		return fmt.Errorf("count items: %w", err)
	}

	newStatus := domain.DeriveOrderStatus(counts)

	// Step 5: Update order status
	var readyAt *string
	if newStatus == domain.StatusReady {
		now := time.Now().UTC().Format(time.RFC3339)
		readyAt = &now
	}
	if err := h.store.UpdateOrderStatus(ctx, tx, payload.OrderID, newStatus, counts, readyAt); err != nil {
		return fmt.Errorf("update order status: %w", err)
	}

	// Step 6: Write outbox records
	if inserted {
		if err := h.writeItemQueuedOutbox(ctx, tx, payload, itemID); err != nil {
			return fmt.Errorf("write item outbox: %w", err)
		}
	}

	// Step 7: Commit
	err = tx.Commit()
	tx = nil
	if err != nil {
		return fmt.Errorf("commit: %w", err)
	}

	h.logger.Info("processed item requested event", map[string]any{
		"eventId": envelope.EventID,
		"orderId": payload.OrderID,
		"itemId":  itemID,
		"status":  newStatus,
	})
	return nil
}

func (h *Handler) writeItemQueuedOutbox(ctx context.Context, tx domain.TxHandle, payload domain.ItemRequestedPayload, itemID string) error {
	outPayload := domain.ItemQueuedOutbound{
		OrderID:      payload.OrderID,
		ItemID:       itemID,
		LineNumber:   payload.LineNumber,
		UnitSequence: payload.UnitSequence,
		MenuItemName: payload.MenuItemName,
		Status:       domain.StatusQueued,
		OccurredAt:   time.Now().UTC().Format(time.RFC3339),
	}
	payloadJSON, err := json.Marshal(outPayload)
	if err != nil {
		return fmt.Errorf("marshal outbox payload: %w", err)
	}

	record := &domain.OutboxRecord{
		EventID:       domain.NewULID(),
		AggregateType: "production_item",
		AggregateID:   itemID,
		RoutingKey:    "item.queued",
		PayloadJSON:   string(payloadJSON),
	}
	return h.store.InsertOutboxRecord(ctx, tx, record)
}
