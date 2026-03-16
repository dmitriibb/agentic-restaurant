package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

// mockAuthClient is a test server that mimics users-service /api/v1/internal/auth/validate
func mockUsersService(responseJSON string, statusCode int) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/internal/auth/validate" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		if r.Header.Get("X-Service-Token") != "test-token" {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		w.Write([]byte(responseJSON))
	}))
}

func TestRequireStaffRole_StaffAllowed(t *testing.T) {
	server := mockUsersService(`{"valid":true,"userId":1007,"login":"staff1","roles":["STAFF"],"clientType":"REGISTERED_USER","displayName":"Staff One"}`, 200)
	defer server.Close()

	client := NewClient(server.URL, "test-token")
	middleware := RequireStaffRole(client)

	called := false
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		claims := ClaimsFromContext(r.Context())
		if claims == nil {
			t.Fatal("expected claims in context")
		}
		if claims.UserID != 1007 {
			t.Errorf("expected userID 1007, got %d", claims.UserID)
		}
		if !claims.HasRole("STAFF") {
			t.Error("expected STAFF role")
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/production/orders", nil)
	req.Header.Set("Authorization", "Bearer valid-staff-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if !called {
		t.Error("handler should have been called")
	}
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}

func TestRequireStaffRole_ManagerAllowed(t *testing.T) {
	server := mockUsersService(`{"valid":true,"userId":1008,"login":"manager1","roles":["MANAGER"],"clientType":"REGISTERED_USER","displayName":"Manager One"}`, 200)
	defer server.Close()

	client := NewClient(server.URL, "test-token")
	middleware := RequireStaffRole(client)

	called := false
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/production/orders", nil)
	req.Header.Set("Authorization", "Bearer valid-manager-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if !called {
		t.Error("handler should have been called")
	}
}

func TestRequireStaffRole_AdminAllowed(t *testing.T) {
	server := mockUsersService(`{"valid":true,"userId":1006,"login":"admin","roles":["ADMIN"],"clientType":"REGISTERED_USER","displayName":"admin"}`, 200)
	defer server.Close()

	client := NewClient(server.URL, "test-token")
	middleware := RequireStaffRole(client)

	called := false
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/production/orders", nil)
	req.Header.Set("Authorization", "Bearer valid-admin-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if !called {
		t.Error("handler should have been called")
	}
}

func TestRequireStaffRole_MissingAuthHeader(t *testing.T) {
	client := NewClient("http://localhost:9999", "test-token")
	middleware := RequireStaffRole(client)

	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/production/orders", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestRequireStaffRole_InvalidToken(t *testing.T) {
	server := mockUsersService(`{"valid":false}`, 200)
	defer server.Close()

	client := NewClient(server.URL, "test-token")
	middleware := RequireStaffRole(client)

	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/production/orders", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestRequireStaffRole_InsufficientRole(t *testing.T) {
	server := mockUsersService(`{"valid":true,"userId":1001,"login":"customer1","roles":["CUSTOMER"],"clientType":"REGISTERED_USER","displayName":"Customer"}`, 200)
	defer server.Close()

	client := NewClient(server.URL, "test-token")
	middleware := RequireStaffRole(client)

	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/production/orders", nil)
	req.Header.Set("Authorization", "Bearer customer-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rec.Code)
	}
}

func TestClaimsFromContext_NoClaims(t *testing.T) {
	claims := ClaimsFromContext(context.Background())
	if claims != nil {
		t.Error("expected nil claims from empty context")
	}
}

func TestRequireApplicationClient_ApplicationAllowed(t *testing.T) {
	server := mockUsersService(`{"valid":true,"userId":2001,"login":"app-staff-client-display-1","roles":["SERVICE"],"clientType":"APPLICATION","displayName":""}`, 200)
	defer server.Close()

	client := NewClient(server.URL, "test-token")
	middleware := RequireApplicationClient(client)

	called := false
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/production/display/orders", nil)
	req.Header.Set("Authorization", "Bearer valid-app-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if !called {
		t.Error("handler should have been called")
	}
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}

func TestRequireApplicationClient_RegisteredUserForbidden(t *testing.T) {
	server := mockUsersService(`{"valid":true,"userId":1007,"login":"staff1","roles":["STAFF"],"clientType":"REGISTERED_USER","displayName":"Staff One"}`, 200)
	defer server.Close()

	client := NewClient(server.URL, "test-token")
	middleware := RequireApplicationClient(client)

	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/production/display/orders", nil)
	req.Header.Set("Authorization", "Bearer staff-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rec.Code)
	}
}
