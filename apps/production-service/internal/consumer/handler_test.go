package consumer

import (
	"context"
	"encoding/json"
	"testing"

	"agentic/restaurant/production-service/internal/domain"
	"agentic/restaurant/production-service/internal/logging"
)

// mockTx implements domain.TxHandle without a real database.
type mockTx struct {
	committed  bool
	rolledBack bool
}

func (m *mockTx) Commit() error   { m.committed = true; return nil }
func (m *mockTx) Rollback() error { m.rolledBack = true; return nil }

// mockStore implements ProductionStore for unit testing.
type mockStore struct {
	processedEvents map[string]bool
	orders          map[int64]*domain.ProductionOrder
	items           []domain.ProductionItem
	outboxRecords   []domain.OutboxRecord
	lastOrderStatus string
	lastOrderID     int64
}

func newMockStore() *mockStore {
	return &mockStore{
		processedEvents: make(map[string]bool),
		orders:          make(map[int64]*domain.ProductionOrder),
	}
}

func (m *mockStore) BeginTx(_ context.Context) (domain.TxHandle, error) {
	return &mockTx{}, nil
}

func (m *mockStore) InsertProcessedEvent(_ context.Context, _ domain.TxHandle, eventID string) (bool, error) {
	if m.processedEvents[eventID] {
		return false, nil
	}
	m.processedEvents[eventID] = true
	return true, nil
}

func (m *mockStore) UpsertProductionOrder(_ context.Context, _ domain.TxHandle, order *domain.ProductionOrder) error {
	existing, ok := m.orders[order.OrderID]
	if ok {
		existing.TotalItemCount++
	} else {
		cp := *order
		cp.TotalItemCount = 1
		m.orders[order.OrderID] = &cp
	}
	return nil
}

func (m *mockStore) InsertProductionItem(_ context.Context, _ domain.TxHandle, item *domain.ProductionItem) (bool, error) {
	for _, existing := range m.items {
		if existing.SourceItemKey == item.SourceItemKey {
			return false, nil
		}
	}
	m.items = append(m.items, *item)
	return true, nil
}

func (m *mockStore) CountItemsByStatus(_ context.Context, _ domain.TxHandle, orderID int64) (domain.ItemStatusCounts, error) {
	var counts domain.ItemStatusCounts
	for _, item := range m.items {
		if item.OrderID == orderID {
			switch item.Status {
			case domain.StatusQueued:
				counts.Queued++
			case domain.StatusInProgress:
				counts.InProgress++
			case domain.StatusBlocked:
				counts.Blocked++
			case domain.StatusReady:
				counts.Ready++
			case domain.StatusCancelled:
				counts.Cancelled++
			default:
				counts.Queued++ // items are inserted as QUEUED by the handler
			}
		}
	}
	return counts, nil
}

func (m *mockStore) UpdateOrderStatus(_ context.Context, _ domain.TxHandle, orderID int64, status string, _ domain.ItemStatusCounts, _ *string) error {
	m.lastOrderID = orderID
	m.lastOrderStatus = status
	return nil
}

func (m *mockStore) InsertOutboxRecord(_ context.Context, _ domain.TxHandle, record *domain.OutboxRecord) error {
	m.outboxRecords = append(m.outboxRecords, *record)
	return nil
}

func makeEventBody(eventID string, orderID int64, lineNumber, unitSequence int) []byte {
	payload := domain.ItemRequestedPayload{
		OrderID:         orderID,
		RequestID:       "req-001",
		UserID:          100,
		UserDisplayName: "Test User",
		LineNumber:      lineNumber,
		UnitSequence:    unitSequence,
		TotalItemCount:  2,
		MenuItemID:      55,
		MenuItemName:    "Margherita Pizza",
		StationKey:      "kitchen",
		CreatedAt:       "2026-03-15T10:00:00Z",
	}
	payloadJSON, _ := json.Marshal(payload)
	envelope := domain.EventEnvelope{
		EventID:       eventID,
		EventType:     "production.item.requested.v1",
		Producer:      "orders-service",
		CorrelationID: "req-001",
		Payload:       payloadJSON,
	}
	body, _ := json.Marshal(envelope)
	return body
}

func TestHandleMessage_HappyPath(t *testing.T) {
	ms := newMockStore()
	logger := logging.New()
	h := New(ms, logger)

	body := makeEventBody("evt-001", 9100, 1, 1)
	err := h.HandleMessage(context.Background(), body)
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	// Verify order was created
	if len(ms.orders) != 1 {
		t.Fatalf("expected 1 order, got %d", len(ms.orders))
	}
	order := ms.orders[9100]
	if order == nil {
		t.Fatal("expected order 9100")
	}

	// Verify item was created
	if len(ms.items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(ms.items))
	}
	if ms.items[0].MenuItemName != "Margherita Pizza" {
		t.Fatalf("unexpected item name: %s", ms.items[0].MenuItemName)
	}

	// Verify order status was set to QUEUED
	if ms.lastOrderStatus != domain.StatusQueued {
		t.Fatalf("expected order status QUEUED, got %s", ms.lastOrderStatus)
	}

	// Verify outbox record was created
	if len(ms.outboxRecords) != 1 {
		t.Fatalf("expected 1 outbox record, got %d", len(ms.outboxRecords))
	}
	if ms.outboxRecords[0].RoutingKey != "item.queued" {
		t.Fatalf("unexpected routing key: %s", ms.outboxRecords[0].RoutingKey)
	}

	// Verify event was recorded as processed
	if !ms.processedEvents["evt-001"] {
		t.Fatal("expected event to be recorded as processed")
	}
}

func TestHandleMessage_DuplicateEvent(t *testing.T) {
	ms := newMockStore()
	logger := logging.New()
	h := New(ms, logger)

	body := makeEventBody("evt-002", 9100, 1, 1)

	// First call
	if err := h.HandleMessage(context.Background(), body); err != nil {
		t.Fatalf("first call: expected no error, got: %v", err)
	}

	// Record state after first call
	itemCountAfterFirst := len(ms.items)
	outboxCountAfterFirst := len(ms.outboxRecords)

	// Second call with same event ID (duplicate delivery)
	if err := h.HandleMessage(context.Background(), body); err != nil {
		t.Fatalf("second call: expected no error, got: %v", err)
	}

	// Verify no new items or outbox records were created
	if len(ms.items) != itemCountAfterFirst {
		t.Fatalf("duplicate created extra items: expected %d, got %d", itemCountAfterFirst, len(ms.items))
	}
	if len(ms.outboxRecords) != outboxCountAfterFirst {
		t.Fatalf("duplicate created extra outbox records: expected %d, got %d", outboxCountAfterFirst, len(ms.outboxRecords))
	}
}

func TestHandleMessage_MultipleItemsSameOrder(t *testing.T) {
	ms := newMockStore()
	logger := logging.New()
	h := New(ms, logger)

	// Two items for the same order
	body1 := makeEventBody("evt-010", 9200, 1, 1)
	body2 := makeEventBody("evt-011", 9200, 1, 2)

	if err := h.HandleMessage(context.Background(), body1); err != nil {
		t.Fatalf("first item: %v", err)
	}
	if err := h.HandleMessage(context.Background(), body2); err != nil {
		t.Fatalf("second item: %v", err)
	}

	if len(ms.items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(ms.items))
	}
	if len(ms.orders) != 1 {
		t.Fatalf("expected 1 order, got %d", len(ms.orders))
	}
	if ms.lastOrderStatus != domain.StatusQueued {
		t.Fatalf("expected QUEUED, got %s", ms.lastOrderStatus)
	}
}

func TestHandleMessage_InvalidJSON(t *testing.T) {
	ms := newMockStore()
	logger := logging.New()
	h := New(ms, logger)

	// Invalid JSON should return nil (don't requeue bad messages)
	err := h.HandleMessage(context.Background(), []byte("not json"))
	if err != nil {
		t.Fatalf("expected nil for bad json, got: %v", err)
	}

	// Nothing should have been created
	if len(ms.processedEvents) != 0 {
		t.Fatal("no events should be processed for bad json")
	}
}
