package domain

import "time"

// TxHandle abstracts a database transaction for testability.
type TxHandle interface {
	Commit() error
	Rollback() error
}

// ProductionOrder represents the operational view of an accepted order.
type ProductionOrder struct {
	OrderID           int64
	ExternalRequestID string
	UserID            int64
	UserDisplayName   *string
	Status            string
	TotalItemCount    int
	ReadyItemCount    int
	BlockedItemCount  int
	CreatedAt         time.Time
	UpdatedAt         time.Time
	ReadyAt           *time.Time
	Version           int64
}

// ProductionItem represents one executable kitchen work unit.
type ProductionItem struct {
	ID                   string
	OrderID              int64
	LineNumber           int
	UnitSequence         int
	SourceItemKey        string
	MenuItemID           int64
	MenuItemName         string
	StationKey           string
	Status               string
	ClaimedByUserID      *int64
	ClaimedByDisplayName *string
	BlockedReason        *string
	CreatedAt            time.Time
	UpdatedAt            time.Time
	ClaimedAt            *time.Time
	ReadyAt              *time.Time
	Version              int64
}

// ProcessedEvent records that a given event has already been handled.
type ProcessedEvent struct {
	EventID     string
	ProcessedAt time.Time
}

// OutboxRecord represents a pending outbound event.
type OutboxRecord struct {
	ID            int64
	EventID       string
	AggregateType string
	AggregateID   string
	RoutingKey    string
	PayloadJSON   string
	CreatedAt     time.Time
	PublishedAt   *time.Time
}

// ItemStatusCounts holds aggregated item counts by status for an order.
type ItemStatusCounts struct {
	Queued     int
	InProgress int
	Blocked    int
	Ready      int
	Cancelled  int
}
