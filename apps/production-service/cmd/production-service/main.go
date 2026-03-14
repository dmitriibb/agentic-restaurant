package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"agentic/restaurant/production-service/internal/config"
	"agentic/restaurant/production-service/internal/health"
	"agentic/restaurant/production-service/internal/logging"
	"agentic/restaurant/production-service/internal/mysql"
	"agentic/restaurant/production-service/internal/rabbitmq"
)

func main() {
	logger := logging.New()

	cfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load config", err, nil)
		os.Exit(1)
	}

	mysqlClient := mysql.New(cfg.MySQLHost, cfg.MySQLPort, cfg.MySQLTimeout)
	rabbitClient := rabbitmq.New(cfg.RabbitAPIHost, cfg.RabbitAPIPort, cfg.RabbitUsername, cfg.RabbitPassword, cfg.RabbitVHost, cfg.ReadinessTimout)

	startupCtx, startupCancel := context.WithTimeout(context.Background(), cfg.StartupTimeout)
	defer startupCancel()

	topology := rabbitmq.Topology{
		Exchange:         cfg.RabbitExchange,
		Queue:            cfg.RabbitQueue,
		DeadLetterQueue:  cfg.RabbitDLQ,
		RoutingKey:       cfg.RabbitRouteKey,
		DeadLetterSuffix: ".dlq",
	}
	if err := rabbitClient.EnsureTopology(startupCtx, topology); err != nil {
		logger.Error("failed to declare rabbitmq topology", err, map[string]any{"exchange": cfg.RabbitExchange, "queue": cfg.RabbitQueue})
		os.Exit(1)
	}

	if err := mysqlClient.Ping(startupCtx); err != nil {
		logger.Error("failed startup mysql connectivity check", err, map[string]any{"host": cfg.MySQLHost, "port": cfg.MySQLPort})
		os.Exit(1)
	}

	mux := http.NewServeMux()
	health.Handlers{MySQL: mysqlClient, RabbitMQ: rabbitClient, ReadinessTimout: cfg.ReadinessTimout}.Register(mux)

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 5 * time.Second,
		IdleTimeout:  30 * time.Second,
	}

	logger.Info("production-service started", map[string]any{"port": cfg.Port, "rabbit_exchange": cfg.RabbitExchange, "rabbit_queue": cfg.RabbitQueue})

	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("http server failed", err, nil)
			os.Exit(1)
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("graceful shutdown failed", err, nil)
		os.Exit(1)
	}

	logger.Info("production-service stopped", nil)
}
