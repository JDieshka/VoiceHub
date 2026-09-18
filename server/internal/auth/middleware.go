package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"voicehub-server/internal/models"
)

type contextKey string

const UserContextKey contextKey = "user"

// Middleware creates an authentication middleware
func Middleware(jwtManager *JWTManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get token from Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Missing authorization header", http.StatusUnauthorized)
				return
			}

			// Parse Bearer token
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
				return
			}

			tokenString := parts[1]

			// Verify token
			claims, err := jwtManager.Verify(tokenString)
			if err != nil {
				if err == ErrExpiredToken {
					http.Error(w, "Token expired", http.StatusUnauthorized)
					return
				}
				http.Error(w, "Invalid token", http.StatusUnauthorized)
				return
			}

			// Add user to context
			user := &models.User{
				ID:       claims.UserID,
				Username: claims.Username,
				Email:    claims.Email,
			}

			ctx := context.WithValue(r.Context(), UserContextKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserFromContext retrieves the user from the request context
func GetUserFromContext(ctx context.Context) *models.User {
	user, ok := ctx.Value(UserContextKey).(*models.User)
	if !ok {
		return nil
	}
	return user
}

// GenerateRefreshToken generates a random refresh token
func GenerateRefreshToken() string {
	return uuid.New().String()
}
