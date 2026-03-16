package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"agentic/restaurant/production-service/internal/auth"
	"agentic/restaurant/production-service/internal/domain"
	"agentic/restaurant/production-service/internal/logging"
)

func passthroughAuth(next http.Handler) http.Handler { return next }

// mockStore implements ProductionStore for testing.
type mockStore struct {
	orders []domain.ProductionOrder
	items  []domain.ProductionItem

	beginTxErr         error
	getItemResult      *domain.ProductionItem
	getItemErr         error
	updateItemResult   bool
	updateItemErr      error
	countItemsResult   domain.ItemStatusCounts
	countItemsErr      error
	updateOrderErr     error
	insertOutboxErr    error
	getOrderInTxResult *domain.ProductionOrder
	getOrderInTxErr    error
	lastOrderStatus    string
	lastOrderReadyAt   *string
	outboxRecords      []domain.OutboxRecord
}

type mockTx struct{}

func (m *mockTx) Commit() error   { return nil }
func (m *mockTx) Rollback() error { return nil }

func (s *mockStore) ListOrdersByStatus(ctx context.Context, status string, limit int) ([]domain.ProductionOrder, error) {
	if status == "" {
		return s.orders, nil
	}
	var filtered []domain.ProductionOrder
	for _, o := range s.orders {
		if o.Status == status {
			filtered = append(filtered, o)
		}
	}
	return filtered, nil
}

func (s *mockStore) GetOrderByID(ctx context.Context, orderID int64) (*domain.ProductionOrder, error) {
	for _, o := range s.orders {
		if o.OrderID == orderID {
			return &o, nil
		}
	}
	return nil, nil
}

func (s *mockStore) ListItemsByOrderID(ctx context.Context, orderID int64) ([]domain.ProductionItem, error) {
	var items []domain.ProductionItem
	for _, i := range s.items {
		if i.OrderID == orderID {
			items = append(items, i)
		}
	}
	return items, nil
}

func (s *mockStore) BeginTx(ctx context.Context) (domain.TxHandle, error) {
	if s.beginTxErr != nil {
		return nil, s.beginTxErr
	}
	return &mockTx{}, nil
}

func (s *mockStore) GetItemByID(ctx context.Context, tx domain.TxHandle, itemID string) (*domain.ProductionItem, error) {
	if s.getItemErr != nil {
		return nil, s.getItemErr
	}
	return s.getItemResult, nil
}

func (s *mockStore) UpdateItemStatus(ctx context.Context, tx domain.TxHandle, itemID string, newStatus string, expectedVersion int64, claimedByUserID *int64, claimedByDisplayName *string, blockedReason *string) (bool, error) {
	if s.updateItemErr != nil {
		return false, s.updateItemErr
	}
	return s.updateItemResult, nil
}

func (s *mockStore) CountItemsByStatus(ctx context.Context, tx domain.TxHandle, orderID int64) (domain.ItemStatusCounts, error) {
	if s.countItemsErr != nil {
		return domain.ItemStatusCounts{}, s.countItemsErr
	}
	return s.countItemsResult, nil
}

func (s *mockStore) UpdateOrderStatus(ctx context.Context, tx domain.TxHandle, orderID int64, status string, counts domain.ItemStatusCounts, readyAt *string) error {
	s.lastOrderStatus = status
	s.lastOrderReadyAt = readyAt
	return s.updateOrderErr
}

func (s *mockStore) InsertOutboxRecord(ctx context.Context, tx domain.TxHandle, record *domain.OutboxRecord) error {
	s.outboxRecords = append(s.outboxRecords, *record)
	return s.insertOutboxErr
}

func (s *mockStore) GetOrderByIDInTx(ctx context.Context, tx domain.TxHandle, orderID int64) (*domain.ProductionOrder, error) {
	if s.getOrderInTxErr != nil {
		return nil, s.getOrderInTxErr
	}
	return s.getOrderInTxResult, nil
}

// withClaims adds UserClaims to the request context for testing.
func withClaims(r *http.Request, claims *auth.UserClaims) *http.Request {
	ctx := context.WithValue(r.Context(), auth.ClaimsKeyForTest(), claims)
	return r.WithContext(ctx)
}

func TestListOrders(t *testing.T) {
	store := &mockStore{
		orders: []domain.ProductionOrder{
			{OrderID: 1, Status: domain.StatusQueued, CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{OrderID: 2, Status: domain.StatusInProgress, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		},
	}
	h := NewHandlers(store, logging.New())
	mux := http.NewServeMux()
	h.Register(mux, passthroughAuth, passthroughAuth)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/production/orders", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var orders []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &orders); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}
	if len(orders) != 2 {
		t.Errorf("expected 2 orders, got %d", len(orders))
	}
	firstCounts, ok := orders[0]["ItemStatusCounts"].(map[string]any)
	if !ok {
		t.Fatalf("expected ItemStatusCounts in summary")
	}
	if firstCounts["Queued"] == nil || firstCounts["InProgress"] == nil || firstCounts["Blocked"] == nil || firstCounts["Ready"] == nil {
		t.Fatalf("expected complete ItemStatusCounts payload, got %#v", firstCounts)
	}
}

func TestListOrdersFilterByStatus(t *testing.T) {
	store := &mockStore{
		orders: []domain.ProductionOrder{
			{OrderID: 1, Status: domain.StatusQueued, CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{OrderID: 2, Status: domain.StatusInProgress, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		},
	}
	h := NewHandlers(store, logging.New())
	mux := http.NewServeMux()
	h.Register(mux, passthroughAuth, passthroughAuth)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/production/orders?status=QUEUED", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var orders []map[string]any
	json.Unmarshal(rec.Body.Bytes(), &orders)
	if len(orders) != 1 {
		t.Errorf("expected 1 order, got %d", len(orders))
	}
}

func TestGetOrder(t *testing.T) {
	store := &mockStore{
		orders: []domain.ProductionOrder{
			{OrderID: 100, Status: domain.StatusQueued, ExternalRequestID: "req-1", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		},
		items: []domain.ProductionItem{
			{ID: "item-1", OrderID: 100, Status: domain.StatusQueued, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		},
	}
	h := NewHandlers(store, logging.New())
	mux := http.NewServeMux()
	h.Register(mux, passthroughAuth, passthroughAuth)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/production/orders/100", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestGetOrderNotFound(t *testing.T) {
	store := &mockStore{}
	h := NewHandlers(store, logging.New())
	mux := http.NewServeMux()
	h.Register(mux, passthroughAuth, passthroughAuth)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/production/orders/999", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rec.Code)
	}
}

func TestPickupSuccess(t *testing.T) {
	store := &mockStore{
		getItemResult: &domain.ProductionItem{
			ID:           "item-1",
			OrderID:      100,
			Status:       domain.StatusQueued,
			Version:      1,
			MenuItemName: "Pizza",
			LineNumber:   1,
			UnitSequence: 1,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		updateItemResult:   true,
		countItemsResult:   domain.ItemStatusCounts{InProgress: 1},
		getOrderInTxResult: &domain.ProductionOrder{OrderID: 100, ExternalRequestID: "req-1"},
	}
	h := NewHandlers(store, logging.New())
	mux := http.NewServeMux()
	h.Register(mux, passthroughAuth, passthroughAuth)

	body := `{}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/production/items/item-1/pickup", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = withClaims(req, &auth.UserClaims{UserID: 1007, Login: "staff1", Roles: []string{"STAFF"}, DisplayName: "Staff One"})
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp map[string]any
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["status"] != domain.StatusInProgress {
		t.Errorf("expected IN_PROGRESS, got %v", resp["status"])
	}
}

func TestPickupInvalidTransition(t *testing.T) {
	store := &mockStore{
		getItemResult: &domain.ProductionItem{
			ID:        "item-1",
			OrderID:   100,
			Status:    domain.StatusReady, // already ready, cannot pickup
			Version:   3,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}
	h := NewHandlers(store, logging.New())
	mux := http.NewServeMux()
	h.Register(mux, passthroughAuth, passthroughAuth)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/production/items/item-1/pickup", nil)
	req = withClaims(req, &auth.UserClaims{UserID: 1007, Login: "staff1", Roles: []string{"STAFF"}, DisplayName: "Staff One"})
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestCommandItemNotFound(t *testing.T) {
	store := &mockStore{
		getItemResult: nil,
	}
	h := NewHandlers(store, logging.New())
	mux := http.NewServeMux()
	h.Register(mux, passthroughAuth, passthroughAuth)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/production/items/nonexistent/pickup", nil)
	req = withClaims(req, &auth.UserClaims{UserID: 1007, Login: "staff1", Roles: []string{"STAFF"}, DisplayName: "Staff One"})
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rec.Code)
	}
}

func TestCommandNoAuth(t *testing.T) {
	store := &mockStore{}
	h := NewHandlers(store, logging.New())
	mux := http.NewServeMux()
	// Use actual middleware but with a mock server that returns invalid
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"valid":false}`)
	}))
	defer mockServer.Close()

	authClient := auth.NewClient(mockServer.URL, "test-token")
	authMw := auth.RequireStaffRole(authClient)
	h.Register(mux, authMw, passthroughAuth)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/production/items/item-1/pickup", nil)
	req.Header.Set("Authorization", "Bearer bad-token")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestVersionConflict(t *testing.T) {
	store := &mockStore{
		getItemResult: &domain.ProductionItem{
			ID:        "item-1",
			OrderID:   100,
			Status:    domain.StatusQueued,
			Version:   2,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		updateItemResult: false, // version mismatch
	}
	h := NewHandlers(store, logging.New())
	mux := http.NewServeMux()
	h.Register(mux, passthroughAuth, passthroughAuth)

	body := `{"expectedVersion": 1}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/production/items/item-1/pickup", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = withClaims(req, &auth.UserClaims{UserID: 1007, Login: "staff1", Roles: []string{"STAFF"}, DisplayName: "Staff One"})
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestBlockWithReason(t *testing.T) {
	store := &mockStore{
		getItemResult: &domain.ProductionItem{
			ID:           "item-1",
			OrderID:      100,
			Status:       domain.StatusInProgress,
			Version:      2,
			MenuItemName: "Burger",
			LineNumber:   1,
			UnitSequence: 1,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		updateItemResult:   true,
		countItemsResult:   domain.ItemStatusCounts{Blocked: 1},
		getOrderInTxResult: &domain.ProductionOrder{OrderID: 100, ExternalRequestID: "req-1"},
	}
	h := NewHandlers(store, logging.New())
	mux := http.NewServeMux()
	h.Register(mux, passthroughAuth, passthroughAuth)

	body := `{"reason": "ingredient missing"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/production/items/item-1/block", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = withClaims(req, &auth.UserClaims{UserID: 1008, Login: "manager1", Roles: []string{"MANAGER"}, DisplayName: "Manager One"})
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestReadyCommandDerivesOrderReadyAndWritesOutboxEvents(t *testing.T) {
	store := &mockStore{
		getItemResult: &domain.ProductionItem{
			ID:           "item-1",
			OrderID:      100,
			Status:       domain.StatusInProgress,
			Version:      4,
			MenuItemName: "Pizza",
			LineNumber:   1,
			UnitSequence: 1,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		updateItemResult: true,
		countItemsResult: domain.ItemStatusCounts{Ready: 1},
		getOrderInTxResult: &domain.ProductionOrder{
			OrderID:           100,
			ExternalRequestID: "req-100",
			TotalItemCount:    1,
		},
	}

	h := NewHandlers(store, logging.New())
	mux := http.NewServeMux()
	h.Register(mux, passthroughAuth, passthroughAuth)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/production/items/item-1/ready", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req = withClaims(req, &auth.UserClaims{UserID: 1007, Login: "staff1", Roles: []string{"STAFF"}, DisplayName: "Staff One"})
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if store.lastOrderStatus != domain.StatusReady {
		t.Fatalf("expected derived order status READY, got %s", store.lastOrderStatus)
	}
	if store.lastOrderReadyAt == nil {
		t.Fatal("expected readyAt timestamp to be set when order becomes READY")
	}
	if len(store.outboxRecords) != 2 {
		t.Fatalf("expected 2 outbox events (item.ready + order.ready), got %d", len(store.outboxRecords))
	}

	routingKeys := []string{store.outboxRecords[0].RoutingKey, store.outboxRecords[1].RoutingKey}
	if !(containsString(routingKeys, "item.ready") && containsString(routingKeys, "order.ready")) {
		t.Fatalf("expected routing keys to include item.ready and order.ready, got %v", routingKeys)
	}
}

func containsString(items []string, target string) bool {
	for _, item := range items {
		if item == target {
			return true
		}
	}
	return false
}

func TestListDisplayOrdersOmitsUserDisplayNameAndIncludesCounts(t *testing.T) {
	store := &mockStore{
		orders: []domain.ProductionOrder{
			{OrderID: 101, Status: domain.StatusInProgress, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		},
		items: []domain.ProductionItem{
			{ID: "i1", OrderID: 101, Status: domain.StatusQueued},
			{ID: "i2", OrderID: 101, Status: domain.StatusInProgress},
			{ID: "i3", OrderID: 101, Status: domain.StatusBlocked},
			{ID: "i4", OrderID: 101, Status: domain.StatusReady},
		},
	}
	h := NewHandlers(store, logging.New())
	mux := http.NewServeMux()
	h.Register(mux, passthroughAuth, passthroughAuth)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/production/display/orders", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var payload []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}
	if len(payload) != 1 {
		t.Fatalf("expected 1 summary, got %d", len(payload))
	}
	if _, exists := payload[0]["UserDisplayName"]; exists {
		t.Fatal("display summary should not include UserDisplayName")
	}
	counts, ok := payload[0]["ItemStatusCounts"].(map[string]any)
	if !ok {
		t.Fatal("expected ItemStatusCounts object")
	}
	if counts["Queued"] != float64(1) || counts["InProgress"] != float64(1) || counts["Blocked"] != float64(1) || counts["Ready"] != float64(1) {
		t.Fatalf("unexpected counts payload: %#v", counts)
	}
	if payload[0]["TotalItemCount"] != float64(4) {
		t.Fatalf("expected TotalItemCount=4, got %v", payload[0]["TotalItemCount"])
	}
}

func TestApplicationTokenCannotCallMutationEndpoint(t *testing.T) {
	store := &mockStore{}
	h := NewHandlers(store, logging.New())
	mux := http.NewServeMux()

	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body := new(struct {
			Token string `json:"token"`
		})
		_ = json.NewDecoder(r.Body).Decode(body)
		w.WriteHeader(http.StatusOK)
		if body.Token == "app-token" {
			fmt.Fprint(w, `{"valid":true,"userId":2001,"login":"app-staff-client-display-1","roles":["SERVICE"],"clientType":"APPLICATION","displayName":""}`)
			return
		}
		fmt.Fprint(w, `{"valid":false}`)
	}))
	defer mockServer.Close()

	authClient := auth.NewClient(mockServer.URL, "test-token")
	staffAuth := auth.RequireStaffRole(authClient)
	appAuth := auth.RequireApplicationClient(authClient)
	h.Register(mux, staffAuth, appAuth)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/production/items/item-1/pickup", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer app-token")
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for application token on mutation endpoint, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestApplicationTokenCanCallDisplayEndpoint(t *testing.T) {
	store := &mockStore{orders: []domain.ProductionOrder{{OrderID: 111, Status: domain.StatusQueued, CreatedAt: time.Now(), UpdatedAt: time.Now()}}}
	h := NewHandlers(store, logging.New())
	mux := http.NewServeMux()

	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body := new(struct {
			Token string `json:"token"`
		})
		_ = json.NewDecoder(r.Body).Decode(body)
		w.WriteHeader(http.StatusOK)
		if body.Token == "app-token" {
			fmt.Fprint(w, `{"valid":true,"userId":2001,"login":"app-staff-client-display-1","roles":["SERVICE"],"clientType":"APPLICATION","displayName":""}`)
			return
		}
		fmt.Fprint(w, `{"valid":false}`)
	}))
	defer mockServer.Close()

	authClient := auth.NewClient(mockServer.URL, "test-token")
	staffAuth := auth.RequireStaffRole(authClient)
	appAuth := auth.RequireApplicationClient(authClient)
	h.Register(mux, staffAuth, appAuth)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/production/display/orders", nil)
	req.Header.Set("Authorization", "Bearer app-token")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for application token on display endpoint, got %d: %s", rec.Code, rec.Body.String())
	}
}
