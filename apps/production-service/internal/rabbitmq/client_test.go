package rabbitmq

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

type requestRecord struct {
	method string
	path   string
	body   map[string]any
}

func TestEnsureTopologyDeclaresExchangeQueueAndBindings(t *testing.T) {
	var mu sync.Mutex
	recorded := make([]requestRecord, 0)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer r.Body.Close()
		payload := map[string]any{}
		_ = json.NewDecoder(r.Body).Decode(&payload)

		mu.Lock()
		recorded = append(recorded, requestRecord{method: r.Method, path: r.URL.Path, body: payload})
		mu.Unlock()

		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	hostPort := strings.TrimPrefix(server.URL, "http://")
	parts := strings.Split(hostPort, ":")
	port, _ := strconv.Atoi(parts[1])

	client := New(parts[0], port, "guest", "guest", "/", 2*time.Second)
	err := client.EnsureTopology(context.Background(), Topology{
		Exchange:         "restaurant.production.v1",
		Queue:            "production-service.item-requested.v1",
		DeadLetterQueue:  "production-service.item-requested.dlq",
		RoutingKey:       "item.requested",
		DeadLetterSuffix: ".dlq",
	})
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	if len(recorded) != 5 {
		t.Fatalf("expected 5 topology requests, got %d", len(recorded))
	}

	expected := []struct {
		method string
		path   string
	}{
		{http.MethodPut, "/api/exchanges///restaurant.production.v1"},
		{http.MethodPut, "/api/queues///production-service.item-requested.dlq"},
		{http.MethodPut, "/api/queues///production-service.item-requested.v1"},
		{http.MethodPost, "/api/bindings///e/restaurant.production.v1/q/production-service.item-requested.v1"},
		{http.MethodPost, "/api/bindings///e/restaurant.production.v1/q/production-service.item-requested.dlq"},
	}

	for i, exp := range expected {
		if recorded[i].method != exp.method {
			t.Fatalf("request %d method mismatch: expected %s got %s", i, exp.method, recorded[i].method)
		}
		if recorded[i].path != exp.path {
			t.Fatalf("request %d path mismatch: expected %s got %s", i, exp.path, recorded[i].path)
		}
	}
}

func TestPingReturnsErrorOnFailureStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer server.Close()

	hostPort := strings.TrimPrefix(server.URL, "http://")
	parts := strings.Split(hostPort, ":")
	port, _ := strconv.Atoi(parts[1])

	client := New(parts[0], port, "guest", "wrong", "/", time.Second)
	err := client.Ping(context.Background())
	if err == nil {
		t.Fatal("expected ping error for unauthorized response")
	}
}
