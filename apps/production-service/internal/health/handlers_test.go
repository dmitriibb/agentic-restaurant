package health

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

type checkerFunc func(context.Context) error

func (f checkerFunc) Ping(ctx context.Context) error {
	return f(ctx)
}

func TestReadyReportsUp(t *testing.T) {
	h := Handlers{
		MySQL:           checkerFunc(func(context.Context) error { return nil }),
		RabbitMQ:        checkerFunc(func(context.Context) error { return nil }),
		ReadinessTimout: time.Second,
	}

	mux := http.NewServeMux()
	h.Register(mux)

	req := httptest.NewRequest(http.MethodGet, "/health/ready", nil)
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", res.Code)
	}
}

func TestReadyReportsDown(t *testing.T) {
	h := Handlers{
		MySQL:           checkerFunc(func(context.Context) error { return errors.New("no mysql") }),
		RabbitMQ:        checkerFunc(func(context.Context) error { return nil }),
		ReadinessTimout: time.Second,
	}

	mux := http.NewServeMux()
	h.Register(mux)

	req := httptest.NewRequest(http.MethodGet, "/health/ready", nil)
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)

	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", res.Code)
	}
}
