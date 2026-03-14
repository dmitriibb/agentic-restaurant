package mysql

import (
	"context"
	"fmt"
	"net"
	"time"
)

type Client struct {
	address string
	timeout time.Duration
}

func New(host string, port int, timeout time.Duration) *Client {
	return &Client{
		address: fmt.Sprintf("%s:%d", host, port),
		timeout: timeout,
	}
}

func (c *Client) Ping(ctx context.Context) error {
	d := net.Dialer{Timeout: c.timeout}
	conn, err := d.DialContext(ctx, "tcp", c.address)
	if err != nil {
		return err
	}
	_ = conn.Close()
	return nil
}
