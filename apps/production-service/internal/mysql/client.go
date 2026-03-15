package mysql

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

// Client wraps a *sql.DB pool and satisfies the health.Checker interface.
type Client struct {
	DB      *sql.DB
	timeout time.Duration
}

// New opens a MySQL connection pool and returns a Client.
func New(host string, port int, database, username, password string, timeout time.Duration) (*Client, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true&timeout=%s",
		username, password, host, port, database, timeout.String())

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("open mysql: %w", err)
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	return &Client{DB: db, timeout: timeout}, nil
}

// Ping checks MySQL connectivity. Satisfies health.Checker.
func (c *Client) Ping(ctx context.Context) error {
	return c.DB.PingContext(ctx)
}

// Close closes the underlying connection pool.
func (c *Client) Close() error {
	return c.DB.Close()
}
