package rabbitmq

import (
	"context"
	"fmt"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

// MessageHandler processes a single AMQP delivery.
type MessageHandler func(ctx context.Context, body []byte) error

// Consumer consumes messages from a RabbitMQ queue via AMQP.
type Consumer struct {
	url     string
	queue   string
	handler MessageHandler
	conn    *amqp.Connection
	channel *amqp.Channel
	done    chan struct{}
}

// NewConsumer creates a Consumer that will connect to the given AMQP URL
// and consume from the specified queue.
func NewConsumer(host string, port int, username, password, vhost, queue string) *Consumer {
	encodedVHost := vhost
	if vhost == "/" {
		encodedVHost = ""
	}
	url := fmt.Sprintf("amqp://%s:%s@%s:%d/%s", username, password, host, port, encodedVHost)
	return &Consumer{
		url:   url,
		queue: queue,
		done:  make(chan struct{}),
	}
}

// Start connects to RabbitMQ and begins consuming messages.
// It blocks until the context is cancelled. Reconnects on connection loss.
func (c *Consumer) Start(ctx context.Context, handler MessageHandler) error {
	c.handler = handler

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		err := c.consumeLoop(ctx)
		if err != nil && ctx.Err() == nil {
			// Connection lost, wait before reconnecting
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(3 * time.Second):
				continue
			}
		}
		if ctx.Err() != nil {
			return ctx.Err()
		}
	}
}

func (c *Consumer) consumeLoop(ctx context.Context) error {
	conn, err := amqp.Dial(c.url)
	if err != nil {
		return fmt.Errorf("amqp dial: %w", err)
	}
	defer conn.Close()
	c.conn = conn

	ch, err := conn.Channel()
	if err != nil {
		return fmt.Errorf("open channel: %w", err)
	}
	defer ch.Close()
	c.channel = ch

	if err := ch.Qos(1, 0, false); err != nil {
		return fmt.Errorf("set qos: %w", err)
	}

	deliveries, err := ch.Consume(
		c.queue, // queue
		"",      // consumer tag (auto-generated)
		false,   // autoAck
		false,   // exclusive
		false,   // noLocal
		false,   // noWait
		nil,     // args
	)
	if err != nil {
		return fmt.Errorf("consume: %w", err)
	}

	connClose := conn.NotifyClose(make(chan *amqp.Error, 1))

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case amqpErr := <-connClose:
			if amqpErr != nil {
				return fmt.Errorf("connection closed: %s", amqpErr.Error())
			}
			return fmt.Errorf("connection closed")
		case d, ok := <-deliveries:
			if !ok {
				return fmt.Errorf("delivery channel closed")
			}
			if err := c.handler(ctx, d.Body); err != nil {
				// Nack and requeue on error
				_ = d.Nack(false, true)
			} else {
				// Ack only after successful processing
				_ = d.Ack(false)
			}
		}
	}
}

// Close gracefully shuts down the consumer.
func (c *Consumer) Close() error {
	if c.channel != nil {
		_ = c.channel.Close()
	}
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}
