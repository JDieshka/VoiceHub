package database

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"voicehub-server/internal/models"
)

// RefreshTokenRepository handles database operations for refresh tokens
type RefreshTokenRepository struct {
	db *Database
}

// NewRefreshTokenRepository creates a new RefreshTokenRepository
func NewRefreshTokenRepository(db *Database) *RefreshTokenRepository {
	return &RefreshTokenRepository{db: db}
}

// Create creates a new refresh token
func (r *RefreshTokenRepository) Create(ctx context.Context, token *models.RefreshToken) error {
	query := `
		INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := r.db.DB.ExecContext(ctx, query,
		token.ID, token.UserID, token.Token, token.ExpiresAt, token.CreatedAt)
	return err
}

// GetByToken retrieves a refresh token by token string
func (r *RefreshTokenRepository) GetByToken(ctx context.Context, token string) (*models.RefreshToken, error) {
	query := `
		SELECT id, user_id, token, expires_at, created_at
		FROM refresh_tokens WHERE token = $1
	`
	rt := &models.RefreshToken{}
	err := r.db.DB.QueryRowContext(ctx, query, token).Scan(
		&rt.ID, &rt.UserID, &rt.Token, &rt.ExpiresAt, &rt.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return rt, err
}

// Delete deletes a refresh token
func (r *RefreshTokenRepository) Delete(ctx context.Context, token string) error {
	query := `DELETE FROM refresh_tokens WHERE token = $1`
	_, err := r.db.DB.ExecContext(ctx, query, token)
	return err
}

// DeleteByUserID deletes all refresh tokens for a user
func (r *RefreshTokenRepository) DeleteByUserID(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM refresh_tokens WHERE user_id = $1`
	_, err := r.db.DB.ExecContext(ctx, query, userID)
	return err
}

// DeleteExpired deletes all expired refresh tokens
func (r *RefreshTokenRepository) DeleteExpired(ctx context.Context) error {
	query := `DELETE FROM refresh_tokens WHERE expires_at < $1`
	_, err := r.db.DB.ExecContext(ctx, query, time.Now())
	return err
}
