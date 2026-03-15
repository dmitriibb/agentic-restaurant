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

	"agentic/restaurant/production-service/internal/api"
	"agentic/restaurant/production-service/internal/auth"
	"agentic/restaurant/production-service/internal/config"
	"agentic/restaurant/production-service/internal/consumer"
	"agentic/restaurant/production-service/internal/health"
	"agentic/restaurant/production-service/internal/logging"
	"agentic/restaurant/production-service/internal/mysql"
	"agentic/restaurant/production-service/internal/outbox"
	"agentic/restaurant/production-service/internal/rabbitmq"
	"agentic/restaurant/production-service/internal/store"
)

func main() {
	logger := logging.New()

	cfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load config", err, nil)
		os.Exit(1)
	}

	mysqlClient, err := mysql.New(cfg.MySQLHost, cfg.MySQLPort, cfg.MySQLDatabase, cfg.MySQLUsername, cfg.MySQLPassword, cfg.MySQLTimeout)
	if err != nil {
		logger.Error("failed to create mysql client", err, nil)
		os.Exit(1)
	}
	defer mysqlClient.Close()

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

	if err := mysql.RunMigrations(startupCtx, mysqlClient.DB); err != nil {
		logger.Error("failed to run database migrations", err, nil)
		os.Exit(1)
	}

	logger.Info("database migrations applied", nil)

	// Create store and consumer handler
	productionStore := store.New(mysqlClient.DB)
	handler := consumer.New(productionStore, logger)

	// Create and start AMQP consumer
	amqpConsumer := rabbitmq.NewConsumer(cfg.RabbitHost, cfg.RabbitPort, cfg.RabbitUsername, cfg.RabbitPassword, cfg.RabbitVHost, cfg.RabbitQueue)

	workerCtx, workerCancel := context.WithCancel(context.Background())

	go func() {
		if err := amqpConsumer.Start(workerCtx, handler.HandleMessage); err != nil && workerCtx.Err() == nil {
			logger.Error("amqp consumer stopped unexpectedly", err, nil)
		}
	}()

	logger.Info("amqp consumer started", map[string]any{"queue": cfg.RabbitQueue})

	// Create and start outbox publisher
	outboxPublisher := outbox.NewPublisher(productionStore, cfg.RabbitHost, cfg.RabbitPort, cfg.RabbitUsername, cfg.RabbitPassword, cfg.RabbitVHost, cfg.RabbitExchange, logger)

	go outboxPublisher.Start(workerCtx)

	logger.Info("outbox publisher started", nil)

	mux := http.NewServeMux()
	health.Handlers{MySQL: mysqlClient, RabbitMQ: rabbitClient, ReadinessTimout: cfg.ReadinessTimout}.Register(mux)

	// Create auth client and API handlers
	authClient := auth.NewClient(cfg.UsersServiceURL, cfg.UsersServiceToken)
	authMiddleware := auth.RequireStaffRole(authClient)
	apiHandlers := api.NewHandlers(productionStore, logger)
	apiHandlers.Register(mux, authMiddleware)

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

	workerCancel()
	_ = amqpConsumer.Close()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("graceful shutdown failed", err, nil)
		os.Exit(1)
	}

	logger.Info("production-service stopped", nil)
}
