package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port              int
	MySQLHost         string
	MySQLPort         int
	MySQLDatabase     string
	MySQLUsername     string
	MySQLPassword     string
	MySQLTimeout      time.Duration
	RabbitHost        string
	RabbitPort        int
	RabbitAPIHost     string
	RabbitAPIPort     int
	RabbitUsername    string
	RabbitPassword    string
	RabbitVHost       string
	RabbitExchange    string
	RabbitQueue       string
	RabbitDLQ         string
	RabbitRouteKey    string
	StartupTimeout    time.Duration
	ReadinessTimout   time.Duration
	UsersServiceURL   string
	UsersServiceToken string
}

func Load() (Config, error) {
	cfg := Config{
		Port:              intFromEnv("SERVER_PORT", 8084),
		MySQLHost:         strFromEnv("PRODUCTION_DB_HOST", "mysql"),
		MySQLPort:         intFromEnv("PRODUCTION_DB_PORT", 3306),
		MySQLDatabase:     strFromEnv("PRODUCTION_DB_NAME", "production_db"),
		MySQLUsername:     strFromEnv("PRODUCTION_DB_USERNAME", "production"),
		MySQLPassword:     strFromEnv("PRODUCTION_DB_PASSWORD", "production"),
		MySQLTimeout:      durationFromEnv("PRODUCTION_DB_TIMEOUT", 2*time.Second),
		RabbitHost:        strFromEnv("RABBITMQ_HOST", "restaurant-rabbitmq"),
		RabbitPort:        intFromEnv("RABBITMQ_PORT", 5672),
		RabbitAPIHost:     strFromEnv("RABBITMQ_API_HOST", "restaurant-rabbitmq"),
		RabbitAPIPort:     intFromEnv("RABBITMQ_API_PORT", 15672),
		RabbitUsername:    strFromEnv("RABBITMQ_USERNAME", "guest"),
		RabbitPassword:    strFromEnv("RABBITMQ_PASSWORD", "guest"),
		RabbitVHost:       strFromEnv("RABBITMQ_VHOST", "/"),
		RabbitExchange:    strFromEnv("PRODUCTION_EXCHANGE", "restaurant.production.v1"),
		RabbitQueue:       strFromEnv("PRODUCTION_ITEM_REQUESTED_QUEUE", "production-service.item-requested.v1"),
		RabbitDLQ:         strFromEnv("PRODUCTION_ITEM_REQUESTED_DLQ", "production-service.item-requested.dlq"),
		RabbitRouteKey:    strFromEnv("PRODUCTION_ITEM_REQUESTED_ROUTING_KEY", "item.requested"),
		StartupTimeout:    durationFromEnv("STARTUP_TIMEOUT", 10*time.Second),
		ReadinessTimout:   durationFromEnv("READINESS_TIMEOUT", 2*time.Second),
		UsersServiceURL:   strFromEnv("USERS_SERVICE_URL", "http://users-service:8081"),
		UsersServiceToken: strFromEnv("USERS_SERVICE_TOKEN", "local-dev-token"),
	}

	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

func (c Config) Validate() error {
	var err error
	if c.Port <= 0 {
		err = errors.Join(err, fmt.Errorf("SERVER_PORT must be greater than 0"))
	}
	if c.MySQLHost == "" || c.MySQLDatabase == "" || c.MySQLUsername == "" {
		err = errors.Join(err, fmt.Errorf("mysql host/database/username are required"))
	}
	if c.MySQLPort <= 0 {
		err = errors.Join(err, fmt.Errorf("PRODUCTION_DB_PORT must be greater than 0"))
	}
	if c.RabbitAPIHost == "" || c.RabbitUsername == "" {
		err = errors.Join(err, fmt.Errorf("rabbitmq api host/username are required"))
	}
	if c.RabbitAPIPort <= 0 {
		err = errors.Join(err, fmt.Errorf("RABBITMQ_API_PORT must be greater than 0"))
	}
	if c.RabbitExchange == "" || c.RabbitQueue == "" || c.RabbitDLQ == "" || c.RabbitRouteKey == "" {
		err = errors.Join(err, fmt.Errorf("production rabbitmq topology names are required"))
	}
	if c.StartupTimeout <= 0 || c.ReadinessTimout <= 0 {
		err = errors.Join(err, fmt.Errorf("timeouts must be greater than 0"))
	}
	return err
}

func strFromEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func intFromEnv(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func durationFromEnv(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return parsed
}
