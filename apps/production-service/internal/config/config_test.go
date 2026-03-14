package config

import (
	"os"
	"testing"
)

func TestLoadDefaults(t *testing.T) {
	t.Setenv("SERVER_PORT", "")
	t.Setenv("PRODUCTION_EXCHANGE", "")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected defaults to load, got error: %v", err)
	}

	if cfg.Port != 8084 {
		t.Fatalf("expected default port 8084, got %d", cfg.Port)
	}
	if cfg.RabbitExchange != "restaurant.production.v1" {
		t.Fatalf("unexpected default exchange: %s", cfg.RabbitExchange)
	}
	if cfg.RabbitQueue != "production-service.item-requested.v1" {
		t.Fatalf("unexpected default queue: %s", cfg.RabbitQueue)
	}
}

func TestValidateInvalidPort(t *testing.T) {
	_ = os.Setenv("SERVER_PORT", "0")
	t.Cleanup(func() { _ = os.Unsetenv("SERVER_PORT") })

	_, err := Load()
	if err == nil {
		t.Fatal("expected validation error for invalid server port")
	}
}
