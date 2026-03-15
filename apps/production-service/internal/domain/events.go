package domain

import (
	"encoding/json"
	"time"
)

// EventEnvelope is the common wrapper for all RabbitMQ messages.
type EventEnvelope struct {
	EventID       string          `json:"eventId"`
	EventType     string          `json:"eventType"`
	OccurredAt    time.Time       `json:"occurredAt"`
	Producer      string          `json:"producer"`
	CorrelationID string          `json:"correlationId"`
	Payload       json.RawMessage `json:"payload"`
}

// ItemRequestedPayload is the payload for production.item.requested.v1 events.
type ItemRequestedPayload struct {
	OrderID         int64  `json:"orderId"`
	RequestID       string `json:"requestId"`
	UserID          int64  `json:"userId"`
	UserDisplayName string `json:"userDisplayName"`
	LineNumber      int    `json:"lineNumber"`
	UnitSequence    int    `json:"unitSequence"`
	TotalItemCount  int    `json:"totalItemCount"`
	MenuItemID      int64  `json:"menuItemId"`
	MenuItemName    string `json:"menuItemName"`
	StationKey      string `json:"stationKey"`
	CreatedAt       string `json:"createdAt"`
}

// ItemQueuedOutbound is the outbound payload for a newly queued production item.
type ItemQueuedOutbound struct {
	OrderID      int64  `json:"orderId"`
	ItemID       string `json:"itemId"`
	LineNumber   int    `json:"lineNumber"`
	UnitSequence int    `json:"unitSequence"`
	MenuItemName string `json:"menuItemName"`
	Status       string `json:"status"`
	OccurredAt   string `json:"occurredAt"`
}

// OrderStatusOutbound is the outbound payload for an order status change.
type OrderStatusOutbound struct {
	OrderID        int64  `json:"orderId"`
	RequestID      string `json:"requestId"`
	Status         string `json:"status"`
	TotalItemCount int    `json:"totalItemCount"`
	ReadyItemCount int    `json:"readyItemCount"`
	OccurredAt     string `json:"occurredAt"`
}

// ItemStatusChangedOutbound is the outbound payload for a staff-driven item status change.
type ItemStatusChangedOutbound struct {
	OrderID          int64  `json:"orderId"`
	ItemID           string `json:"itemId"`
	LineNumber       int    `json:"lineNumber"`
	UnitSequence     int    `json:"unitSequence"`
	MenuItemName     string `json:"menuItemName"`
	Status           string `json:"status"`
	StaffUserID      int64  `json:"staffUserId"`
	StaffDisplayName string `json:"staffDisplayName"`
	OccurredAt       string `json:"occurredAt"`
}

// OrderReadyOutbound is the outbound payload when all items in an order are ready.
type OrderReadyOutbound struct {
	OrderID        int64  `json:"orderId"`
	RequestID      string `json:"requestId"`
	Status         string `json:"status"`
	ReadyAt        string `json:"readyAt"`
	TotalItemCount int    `json:"totalItemCount"`
	ReadyItemCount int    `json:"readyItemCount"`
	OccurredAt     string `json:"occurredAt"`
}
