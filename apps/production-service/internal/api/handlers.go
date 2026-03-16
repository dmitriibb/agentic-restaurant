package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"agentic/restaurant/production-service/internal/auth"
	"agentic/restaurant/production-service/internal/domain"
	"agentic/restaurant/production-service/internal/logging"
)

// ProductionStore abstracts the persistence operations needed by the handlers.
type ProductionStore interface {
	ListOrdersByStatus(ctx context.Context, status string, limit int) ([]domain.ProductionOrder, error)
	GetOrderByID(ctx context.Context, orderID int64) (*domain.ProductionOrder, error)
	ListItemsByOrderID(ctx context.Context, orderID int64) ([]domain.ProductionItem, error)
	BeginTx(ctx context.Context) (domain.TxHandle, error)
	GetItemByID(ctx context.Context, tx domain.TxHandle, itemID string) (*domain.ProductionItem, error)
	UpdateItemStatus(ctx context.Context, tx domain.TxHandle, itemID string, newStatus string, expectedVersion int64, claimedByUserID *int64, claimedByDisplayName *string, blockedReason *string) (bool, error)
	CountItemsByStatus(ctx context.Context, tx domain.TxHandle, orderID int64) (domain.ItemStatusCounts, error)
	UpdateOrderStatus(ctx context.Context, tx domain.TxHandle, orderID int64, status string, counts domain.ItemStatusCounts, readyAt *string) error
	InsertOutboxRecord(ctx context.Context, tx domain.TxHandle, record *domain.OutboxRecord) error
	GetOrderByIDInTx(ctx context.Context, tx domain.TxHandle, orderID int64) (*domain.ProductionOrder, error)
}

// Handlers provides HTTP handlers for the production API.
type Handlers struct {
	store  ProductionStore
	logger *logging.Logger
}

type orderItemStatusCounts struct {
	Queued     int
	InProgress int
	Blocked    int
	Ready      int
}

type interactiveOrderSummary struct {
	OrderID          int64
	Status           string
	CreatedAt        time.Time
	UpdatedAt        time.Time
	ItemStatusCounts orderItemStatusCounts
	TotalItemCount   int
	UserDisplayName  *string
}

type displayOrderSummary struct {
	OrderID          int64
	Status           string
	CreatedAt        time.Time
	UpdatedAt        time.Time
	ItemStatusCounts orderItemStatusCounts
	TotalItemCount   int
}

// NewHandlers creates the API Handlers.
func NewHandlers(s ProductionStore, l *logging.Logger) *Handlers {
	return &Handlers{store: s, logger: l}
}

// Register mounts the production API routes on the given mux behind role-specific auth middleware.
func (h *Handlers) Register(mux *http.ServeMux, staffAuthMiddleware func(http.Handler) http.Handler, applicationAuthMiddleware func(http.Handler) http.Handler) {
	mux.Handle("GET /api/v1/production/orders", staffAuthMiddleware(http.HandlerFunc(h.listOrders)))
	mux.Handle("GET /api/v1/production/orders/{orderId}", staffAuthMiddleware(http.HandlerFunc(h.getOrder)))
	mux.Handle("POST /api/v1/production/items/{itemId}/pickup", staffAuthMiddleware(http.HandlerFunc(h.commandHandler(domain.CommandPickup))))
	mux.Handle("POST /api/v1/production/items/{itemId}/block", staffAuthMiddleware(http.HandlerFunc(h.commandHandler(domain.CommandBlock))))
	mux.Handle("POST /api/v1/production/items/{itemId}/resume", staffAuthMiddleware(http.HandlerFunc(h.commandHandler(domain.CommandResume))))
	mux.Handle("POST /api/v1/production/items/{itemId}/ready", staffAuthMiddleware(http.HandlerFunc(h.commandHandler(domain.CommandReady))))
	mux.Handle("GET /api/v1/production/display/orders", applicationAuthMiddleware(http.HandlerFunc(h.listDisplayOrders)))
}

func (h *Handlers) listOrders(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	limitStr := r.URL.Query().Get("limit")
	limit := 50
	if limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 && parsed <= 200 {
			limit = parsed
		}
	}

	orders, err := h.store.ListOrdersByStatus(r.Context(), status, limit)
	if err != nil {
		h.logger.Error("failed to list orders", err, nil)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
		return
	}
	if orders == nil {
		writeJSON(w, http.StatusOK, []interactiveOrderSummary{})
		return
	}

	summaries := make([]interactiveOrderSummary, 0, len(orders))
	for _, order := range orders {
		counts, totalCount, ok := h.buildOrderSummaryCounts(r.Context(), order.OrderID)
		if !ok {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}
		summaries = append(summaries, interactiveOrderSummary{
			OrderID:          order.OrderID,
			Status:           order.Status,
			CreatedAt:        order.CreatedAt,
			UpdatedAt:        order.UpdatedAt,
			ItemStatusCounts: counts,
			TotalItemCount:   totalCount,
			UserDisplayName:  order.UserDisplayName,
		})
	}

	writeJSON(w, http.StatusOK, summaries)
}

func (h *Handlers) listDisplayOrders(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	limitStr := r.URL.Query().Get("limit")
	limit := 50
	if limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 && parsed <= 200 {
			limit = parsed
		}
	}

	orders, err := h.store.ListOrdersByStatus(r.Context(), status, limit)
	if err != nil {
		h.logger.Error("failed to list display orders", err, nil)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
		return
	}
	if orders == nil {
		writeJSON(w, http.StatusOK, []displayOrderSummary{})
		return
	}

	summaries := make([]displayOrderSummary, 0, len(orders))
	for _, order := range orders {
		counts, totalCount, ok := h.buildOrderSummaryCounts(r.Context(), order.OrderID)
		if !ok {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}
		summaries = append(summaries, displayOrderSummary{
			OrderID:          order.OrderID,
			Status:           order.Status,
			CreatedAt:        order.CreatedAt,
			UpdatedAt:        order.UpdatedAt,
			ItemStatusCounts: counts,
			TotalItemCount:   totalCount,
		})
	}

	writeJSON(w, http.StatusOK, summaries)
}

func (h *Handlers) buildOrderSummaryCounts(ctx context.Context, orderID int64) (orderItemStatusCounts, int, bool) {
	items, err := h.store.ListItemsByOrderID(ctx, orderID)
	if err != nil {
		h.logger.Error("failed to list items for summary", err, map[string]any{"orderId": orderID})
		return orderItemStatusCounts{}, 0, false
	}

	counts := orderItemStatusCounts{}
	for _, item := range items {
		switch item.Status {
		case domain.StatusQueued:
			counts.Queued++
		case domain.StatusInProgress:
			counts.InProgress++
		case domain.StatusBlocked:
			counts.Blocked++
		case domain.StatusReady:
			counts.Ready++
		}
	}

	totalCount := counts.Queued + counts.InProgress + counts.Blocked + counts.Ready
	return counts, totalCount, true
}

func (h *Handlers) getOrder(w http.ResponseWriter, r *http.Request) {
	orderIDStr := r.PathValue("orderId")
	orderID, err := strconv.ParseInt(orderIDStr, 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid order ID"})
		return
	}

	order, err := h.store.GetOrderByID(r.Context(), orderID)
	if err != nil {
		h.logger.Error("failed to get order", err, map[string]any{"orderId": orderID})
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
		return
	}
	if order == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "order not found"})
		return
	}

	items, err := h.store.ListItemsByOrderID(r.Context(), orderID)
	if err != nil {
		h.logger.Error("failed to list items", err, map[string]any{"orderId": orderID})
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
		return
	}
	if items == nil {
		items = []domain.ProductionItem{}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"order": order,
		"items": items,
	})
}

type commandRequest struct {
	ExpectedVersion *int64  `json:"expectedVersion"`
	Reason          *string `json:"reason"`
}

func (h *Handlers) commandHandler(command string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		itemID := r.PathValue("itemId")
		if itemID == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing item ID"})
			return
		}

		claims := auth.ClaimsFromContext(r.Context())
		if claims == nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no claims in context"})
			return
		}

		var cmdReq commandRequest
		if r.Body != nil && r.ContentLength > 0 {
			if err := json.NewDecoder(r.Body).Decode(&cmdReq); err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
				return
			}
		}

		tx, err := h.store.BeginTx(r.Context())
		if err != nil {
			h.logger.Error("failed to begin transaction", err, nil)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}
		defer func() {
			if tx != nil {
				_ = tx.Rollback()
			}
		}()

		item, err := h.store.GetItemByID(r.Context(), tx, itemID)
		if err != nil {
			h.logger.Error("failed to get item", err, map[string]any{"itemId": itemID})
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}
		if item == nil {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "item not found"})
			return
		}

		newStatus, err := domain.ValidateTransition(item.Status, command)
		if err != nil {
			writeJSON(w, http.StatusConflict, map[string]string{
				"error":         err.Error(),
				"currentStatus": item.Status,
			})
			return
		}

		expectedVersion := item.Version
		if cmdReq.ExpectedVersion != nil {
			expectedVersion = *cmdReq.ExpectedVersion
		}

		var claimedByUserID *int64
		var claimedByDisplayName *string
		if command == domain.CommandPickup {
			claimedByUserID = &claims.UserID
			claimedByDisplayName = &claims.DisplayName
		}

		var blockedReason *string
		if command == domain.CommandBlock && cmdReq.Reason != nil {
			blockedReason = cmdReq.Reason
		}

		updated, err := h.store.UpdateItemStatus(r.Context(), tx, itemID, newStatus, expectedVersion, claimedByUserID, claimedByDisplayName, blockedReason)
		if err != nil {
			h.logger.Error("failed to update item", err, map[string]any{"itemId": itemID})
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}
		if !updated {
			writeJSON(w, http.StatusConflict, map[string]string{
				"error": "version conflict: item was modified by another request",
			})
			return
		}

		counts, err := h.store.CountItemsByStatus(r.Context(), tx, item.OrderID)
		if err != nil {
			h.logger.Error("failed to count items", err, map[string]any{"orderId": item.OrderID})
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}

		derivedOrderStatus := domain.DeriveOrderStatus(counts)
		var readyAt *string
		if derivedOrderStatus == domain.StatusReady {
			now := time.Now().UTC().Format(time.RFC3339)
			readyAt = &now
		}
		if err := h.store.UpdateOrderStatus(r.Context(), tx, item.OrderID, derivedOrderStatus, counts, readyAt); err != nil {
			h.logger.Error("failed to update order status", err, map[string]any{"orderId": item.OrderID})
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}

		routingKey := "item." + strings.ReplaceAll(strings.ToLower(newStatus), "_", "_")
		switch newStatus {
		case domain.StatusInProgress:
			if command == domain.CommandResume {
				routingKey = "item.resumed"
			} else {
				routingKey = "item.in_progress"
			}
		case domain.StatusBlocked:
			routingKey = "item.blocked"
		case domain.StatusReady:
			routingKey = "item.ready"
		}

		now := time.Now().UTC().Format(time.RFC3339)
		itemOutPayload := domain.ItemStatusChangedOutbound{
			OrderID:          item.OrderID,
			ItemID:           item.ID,
			LineNumber:       item.LineNumber,
			UnitSequence:     item.UnitSequence,
			MenuItemName:     item.MenuItemName,
			Status:           newStatus,
			StaffUserID:      claims.UserID,
			StaffDisplayName: claims.DisplayName,
			OccurredAt:       now,
		}
		itemPayloadJSON, err := json.Marshal(itemOutPayload)
		if err != nil {
			h.logger.Error("failed to marshal item payload", err, map[string]any{"itemId": itemID})
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}
		if err := h.store.InsertOutboxRecord(r.Context(), tx, &domain.OutboxRecord{
			EventID:       domain.NewULID(),
			AggregateType: "production_item",
			AggregateID:   item.ID,
			RoutingKey:    routingKey,
			PayloadJSON:   string(itemPayloadJSON),
		}); err != nil {
			h.logger.Error("failed to write item outbox", err, map[string]any{"itemId": itemID})
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}

		if derivedOrderStatus == domain.StatusReady {
			order, err := h.store.GetOrderByIDInTx(r.Context(), tx, item.OrderID)
			if err != nil {
				h.logger.Error("failed to get order for ready event", err, map[string]any{"orderId": item.OrderID})
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
				return
			}
			if order != nil {
				orderOutPayload := domain.OrderReadyOutbound{
					OrderID:        order.OrderID,
					RequestID:      order.ExternalRequestID,
					Status:         domain.StatusReady,
					ReadyAt:        now,
					TotalItemCount: order.TotalItemCount,
					ReadyItemCount: counts.Ready,
					OccurredAt:     now,
				}
				orderPayloadJSON, err := json.Marshal(orderOutPayload)
				if err != nil {
					h.logger.Error("failed to marshal order payload", err, nil)
					writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
					return
				}
				if err := h.store.InsertOutboxRecord(r.Context(), tx, &domain.OutboxRecord{
					EventID:       domain.NewULID(),
					AggregateType: "production_order",
					AggregateID:   fmt.Sprintf("%d", order.OrderID),
					RoutingKey:    "order.ready",
					PayloadJSON:   string(orderPayloadJSON),
				}); err != nil {
					h.logger.Error("failed to write order ready outbox", err, nil)
					writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
					return
				}
			}
		}

		err = tx.Commit()
		tx = nil
		if err != nil {
			h.logger.Error("failed to commit transaction", err, nil)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}

		h.logger.Info("item command executed", map[string]any{
			"itemId":    itemID,
			"command":   command,
			"newStatus": newStatus,
			"staffId":   claims.UserID,
		})

		writeJSON(w, http.StatusOK, map[string]any{
			"itemId":     item.ID,
			"orderId":    item.OrderID,
			"status":     newStatus,
			"command":    command,
			"executedBy": claims.DisplayName,
		})
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}
