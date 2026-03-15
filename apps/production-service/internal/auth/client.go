package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// UserClaims holds the validated user identity from a bearer token.
type UserClaims struct {
	UserID      int64
	Login       string
	Roles       []string
	ClientType  string
	DisplayName string
}

// HasRole returns true if the user has the given role.
func (c *UserClaims) HasRole(role string) bool {
	for _, r := range c.Roles {
		if r == role {
			return true
		}
	}
	return false
}

type validateRequest struct {
	Token string `json:"token"`
}

type validateResponse struct {
	Valid       bool   `json:"valid"`
	UserID      int64  `json:"userId"`
	Login       string `json:"login"`
	Roles       string `json:"roles"`
	ClientType  string `json:"clientType"`
	DisplayName string `json:"displayName"`
}

// Client validates bearer tokens through the users-service internal API.
type Client struct {
	usersServiceURL string
	serviceToken    string
	http            *http.Client
}

// NewClient creates an auth Client.
func NewClient(usersServiceURL, serviceToken string) *Client {
	return &Client{
		usersServiceURL: strings.TrimRight(usersServiceURL, "/"),
		serviceToken:    serviceToken,
		http: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// ValidateToken calls users-service to validate the given bearer token.
// Returns nil claims and an error if the token is invalid or the call fails.
func (c *Client) ValidateToken(ctx context.Context, bearerToken string) (*UserClaims, error) {
	body, err := json.Marshal(validateRequest{Token: bearerToken})
	if err != nil {
		return nil, fmt.Errorf("marshal validate request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.usersServiceURL+"/api/v1/internal/auth/validate", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Service-Token", c.serviceToken)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call users-service: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("users-service returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var vResp validateResponse
	if err := json.Unmarshal(respBody, &vResp); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}

	if !vResp.Valid {
		return nil, nil
	}

	roles := strings.Split(vResp.Roles, ",")
	for i := range roles {
		roles[i] = strings.TrimSpace(roles[i])
	}

	return &UserClaims{
		UserID:      vResp.UserID,
		Login:       vResp.Login,
		Roles:       roles,
		ClientType:  vResp.ClientType,
		DisplayName: vResp.DisplayName,
	}, nil
}
