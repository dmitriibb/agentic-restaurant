package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
)

type contextKey string

const claimsKey contextKey = "userClaims"

// ClaimsFromContext returns the UserClaims stored in the request context by the middleware.
func ClaimsFromContext(ctx context.Context) *UserClaims {
	if v, ok := ctx.Value(claimsKey).(*UserClaims); ok {
		return v
	}
	return nil
}

// ClaimsKeyForTest returns the context key used for storing claims. For testing only.
func ClaimsKeyForTest() contextKey {
	return claimsKey
}

// RequireStaffRole returns middleware that validates the bearer token and checks for STAFF, MANAGER, or ADMIN role.
func RequireStaffRole(client *Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := validateBearerToken(w, r, client)
			if claims == nil {
				return
			}

			if !claims.HasRole("STAFF") && !claims.HasRole("MANAGER") && !claims.HasRole("ADMIN") {
				writeError(w, http.StatusForbidden, "insufficient role: STAFF, MANAGER, or ADMIN required")
				return
			}

			ctx := context.WithValue(r.Context(), claimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireApplicationClient returns middleware that validates the bearer token and checks for APPLICATION client type.
func RequireApplicationClient(client *Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := validateBearerToken(w, r, client)
			if claims == nil {
				return
			}

			if claims.ClientType != "APPLICATION" {
				writeError(w, http.StatusForbidden, "insufficient client type: APPLICATION required")
				return
			}

			ctx := context.WithValue(r.Context(), claimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func validateBearerToken(w http.ResponseWriter, r *http.Request, client *Client) *UserClaims {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		writeError(w, http.StatusUnauthorized, "missing or invalid Authorization header")
		return nil
	}
	token := strings.TrimPrefix(authHeader, "Bearer ")

	claims, err := client.ValidateToken(r.Context(), token)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "token validation failed")
		return nil
	}
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "invalid or expired token")
		return nil
	}

	return claims
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
