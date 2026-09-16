package database

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"voicehub-server/internal/models"
)

// UserRepository handles database operations for users
type UserRepository struct {
	db *Database
}

// NewUserRepository creates a new UserRepository
func NewUserRepository(db *Database) *UserRepository {
	return &UserRepository{db: db}
}

// Create creates a new user
func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (id, username, email, password_hash, avatar, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.DB.ExecContext(ctx, query,
		user.ID, user.Username, user.Email, user.PasswordHash,
		user.Avatar, user.Status, user.CreatedAt, user.UpdatedAt)
	return err
}

// GetByID retrieves a user by ID
func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	query := `
		SELECT id, username, email, password_hash, avatar, status, created_at, updated_at
		FROM users WHERE id = $1
	`
	user := &models.User{}
	err := r.db.DB.QueryRowContext(ctx, query, id).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.Avatar, &user.Status, &user.CreatedAt, &user.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return user, err
}

// GetByEmail retrieves a user by email
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT id, username, email, password_hash, avatar, status, created_at, updated_at
		FROM users WHERE email = $1
	`
	user := &models.User{}
	err := r.db.DB.QueryRowContext(ctx, query, email).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.Avatar, &user.Status, &user.CreatedAt, &user.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return user, err
}

// GetByUsername retrieves a user by username
func (r *UserRepository) GetByUsername(ctx context.Context, username string) (*models.User, error) {
	query := `
		SELECT id, username, email, password_hash, avatar, status, created_at, updated_at
		FROM users WHERE username = $1
	`
	user := &models.User{}
	err := r.db.DB.QueryRowContext(ctx, query, username).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.Avatar, &user.Status, &user.CreatedAt, &user.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return user, err
}

// UpdateStatus updates a user's status
func (r *UserRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	query := `UPDATE users SET status = $1, updated_at = $2 WHERE id = $3`
	_, err := r.db.DB.ExecContext(ctx, query, status, time.Now(), id)
	return err
}

// UpdateAvatar updates a user's avatar
func (r *UserRepository) UpdateAvatar(ctx context.Context, id uuid.UUID, avatar string) error {
	query := `UPDATE users SET avatar = $1, updated_at = $2 WHERE id = $3`
	_, err := r.db.DB.ExecContext(ctx, query, avatar, time.Now(), id)
	return err
}
