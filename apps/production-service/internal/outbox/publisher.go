package outbox

import (
	"context"
	"fmt"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"

	"agentic/restaurant/production-service/internal/logging"
	"agentic/restaurant/production-service/internal/store"
)

// Publisher polls the outbox table and publishes pending events to RabbitMQ.
type Publisher struct {
	store    *store.Store
	exchange string
	url      string
	logger   *logging.Logger
	interval time.Duration
}

// NewPublisher creates an outbox Publisher.
func NewPublisher(s *store.Store, amqpHost string, amqpPort int, username, password, vhost, exchange string, logger *logging.Logger) *Publisher {
	encodedVHost := vhost
	if vhost == "/" {
		encodedVHost = ""
	}
	url := fmt.Sprintf("amqp://%s:%s@%s:%d/%s", username, password, amqpHost, amqpPort, encodedVHost)
	return &Publisher{
		store:    s,
		exchange: exchange,
		url:      url,
		logger:   logger,
		interval: 1 * time.Second,
	}
}

// Start runs the publish loop until the context is cancelled.
func (p *Publisher) Start(ctx context.Context) {
	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := p.publishBatch(ctx); err != nil {
				p.logger.Error("outbox publish batch failed", err, nil)
			}
		}
	}
}

func (p *Publisher) publishBatch(ctx context.Context) error {
	records, err := p.store.FetchUnpublishedOutbox(ctx, 50)
	if err != nil {
		return err
	}
	if len(records) == 0 {
		return nil
	}

	conn, err := amqp.Dial(p.url)
	if err != nil {
		return fmt.Errorf("amqp dial: %w", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		return fmt.Errorf("open channel: %w", err)
	}
	defer ch.Close()

	for _, record := range records {
		err := ch.PublishWithContext(ctx,
			p.exchange,        // exchange
			record.RoutingKey, // routing key
			false,             // mandatory
			false,             // immediate
			amqp.Publishing{
				ContentType:  "application/json",
				Body:         []byte(record.PayloadJSON),
				DeliveryMode: amqp.Persistent,
				MessageId:    record.EventID,
				Timestamp:    time.Now(),
			},
		)
		if err != nil {
			p.logger.Error("failed to publish outbox record", err, map[string]any{"outboxId": record.ID})
			continue
		}

		if err := p.store.MarkOutboxPublished(ctx, record.ID); err != nil {
			p.logger.Error("failed to mark outbox published", err, map[string]any{"outboxId": record.ID})
		}
	}
	return nil
}
