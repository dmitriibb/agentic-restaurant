package health

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"
)

type Checker interface {
	Ping(context.Context) error
}

type Handlers struct {
	MySQL           Checker
	RabbitMQ        Checker
	ReadinessTimout time.Duration
}

func (h Handlers) Register(mux *http.ServeMux) {
	mux.HandleFunc("/health/live", h.live)
	mux.HandleFunc("/health/ready", h.ready)
}

func (h Handlers) live(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"status": "UP"})
}

func (h Handlers) ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), h.ReadinessTimout)
	defer cancel()

	mysqlErr := h.MySQL.Ping(ctx)
	rabbitErr := h.RabbitMQ.Ping(ctx)

	if mysqlErr != nil || rabbitErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"status": "DOWN",
			"checks": map[string]any{
				"mysql":    statusForErr(mysqlErr),
				"rabbitmq": statusForErr(rabbitErr),
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status": "UP",
		"checks": map[string]any{
			"mysql":    "UP",
			"rabbitmq": "UP",
		},
	})
}

func statusForErr(err error) string {
	if errors.Is(err, context.DeadlineExceeded) {
		return "DOWN_TIMEOUT"
	}
	if err == nil {
		return "UP"
	}
	return "DOWN"
}

func writeJSON(w http.ResponseWriter, status int, payload map[string]any) {
	bytes, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(bytes)
}
