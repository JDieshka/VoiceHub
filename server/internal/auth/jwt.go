package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"voicehub-server/internal/config"
	"voicehub-server/internal/models"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("token expired")
)

// JWTManager handles JWT token generation and validation
type JWTManager struct {
	secretKey     string
	tokenDuration time.Duration
}

// NewJWTManager creates a new JWTManager
func NewJWTManager(cfg *config.Config) *JWTManager {
	return &JWTManager{
		secretKey:     cfg.JWTSecret,
		tokenDuration: cfg.JWTExpiration,
	}
}

// Generate creates a new JWT token for a user
func (m *JWTManager) Generate(user *models.User) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  user.ID.String(),
		"username": user.Username,
		"email":    user.Email,
		"exp":      time.Now().Add(m.tokenDuration).Unix(),
		"iat":      time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(m.secretKey))
}

// Verify validates a JWT token and returns the claims
func (m *JWTManager) Verify(tokenString string) (*models.TokenClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(m.secretKey), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	// Parse user ID
	userIDStr, ok := claims["user_id"].(string)
	if !ok {
		return nil, ErrInvalidToken
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, ErrInvalidToken
	}

	// Parse username
	username, ok := claims["username"].(string)
	if !ok {
		return nil, ErrInvalidToken
	}

	// Parse email
	email, ok := claims["email"].(string)
	if !ok {
		return nil, ErrInvalidToken
	}

	return &models.TokenClaims{
		UserID:   userID,
		Username: username,
		Email:    email,
	}, nil
}
