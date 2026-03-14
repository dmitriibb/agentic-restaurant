package rabbitmq

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Topology struct {
	Exchange         string
	Queue            string
	DeadLetterQueue  string
	RoutingKey       string
	DeadLetterSuffix string
}

type Client struct {
	baseURL  string
	username string
	password string
	vhost    string
	http     *http.Client
}

func New(apiHost string, apiPort int, username, password, vhost string, timeout time.Duration) *Client {
	return &Client{
		baseURL:  fmt.Sprintf("http://%s:%d/api", apiHost, apiPort),
		username: username,
		password: password,
		vhost:    vhost,
		http: &http.Client{
			Timeout: timeout,
		},
	}
}

func (c *Client) EnsureTopology(ctx context.Context, t Topology) error {
	if err := c.putJSON(ctx, fmt.Sprintf("/exchanges/%s/%s", escapeVHost(c.vhost), url.PathEscape(t.Exchange)), map[string]any{
		"type":        "topic",
		"durable":     true,
		"auto_delete": false,
		"internal":    false,
		"arguments":   map[string]any{},
	}); err != nil {
		return fmt.Errorf("declare exchange: %w", err)
	}

	if err := c.putJSON(ctx, fmt.Sprintf("/queues/%s/%s", escapeVHost(c.vhost), url.PathEscape(t.DeadLetterQueue)), map[string]any{
		"durable":     true,
		"auto_delete": false,
		"arguments":   map[string]any{},
	}); err != nil {
		return fmt.Errorf("declare dead-letter queue: %w", err)
	}

	if err := c.putJSON(ctx, fmt.Sprintf("/queues/%s/%s", escapeVHost(c.vhost), url.PathEscape(t.Queue)), map[string]any{
		"durable":     true,
		"auto_delete": false,
		"arguments": map[string]any{
			"x-dead-letter-exchange":    t.Exchange,
			"x-dead-letter-routing-key": t.RoutingKey + t.DeadLetterSuffix,
		},
	}); err != nil {
		return fmt.Errorf("declare queue: %w", err)
	}

	if err := c.postJSON(ctx, fmt.Sprintf("/bindings/%s/e/%s/q/%s", escapeVHost(c.vhost), url.PathEscape(t.Exchange), url.PathEscape(t.Queue)), map[string]any{
		"routing_key": t.RoutingKey,
		"arguments":   map[string]any{},
	}); err != nil {
		return fmt.Errorf("bind queue: %w", err)
	}

	if err := c.postJSON(ctx, fmt.Sprintf("/bindings/%s/e/%s/q/%s", escapeVHost(c.vhost), url.PathEscape(t.Exchange), url.PathEscape(t.DeadLetterQueue)), map[string]any{
		"routing_key": t.RoutingKey + t.DeadLetterSuffix,
		"arguments":   map[string]any{},
	}); err != nil {
		return fmt.Errorf("bind dead-letter queue: %w", err)
	}

	return nil
}

func (c *Client) Ping(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/overview", nil)
	if err != nil {
		return err
	}
	req.SetBasicAuth(c.username, c.password)

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return fmt.Errorf("rabbitmq api returned status %d", resp.StatusCode)
	}
	return nil
}

func (c *Client) putJSON(ctx context.Context, path string, payload map[string]any) error {
	return c.doJSON(ctx, http.MethodPut, path, payload)
}

func (c *Client) postJSON(ctx context.Context, path string, payload map[string]any) error {
	return c.doJSON(ctx, http.MethodPost, path, payload)
}

func (c *Client) doJSON(ctx context.Context, method, path string, payload map[string]any) error {
	encoded, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(encoded))
	if err != nil {
		return err
	}
	req.SetBasicAuth(c.username, c.password)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("unexpected status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return nil
}

func escapeVHost(vhost string) string {
	if vhost == "" || vhost == "/" {
		return "%2F"
	}
	return url.PathEscape(vhost)
}
