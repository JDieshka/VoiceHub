package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
	"voicehub-server/internal/config"
)

// Database wraps the sql.DB connection
type Database struct {
	DB *sql.DB
}

// New creates a new database connection
func New(cfg *config.Config) (*Database, error) {
	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(cfg.MaxDBConns)
	db.SetMaxIdleConns(cfg.MaxDBConns / 2)
	db.SetConnMaxLifetime(cfg.DBConnMaxLifetime)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &Database{DB: db}, nil
}

// Close closes the database connection
func (d *Database) Close() error {
	return d.DB.Close()
}

// RunMigrations runs SQL migrations
func (d *Database) RunMigrations() error {
	// Read migration file
	// In production, use a migration tool like golang-migrate
	// For now, we'll just create tables if they don't exist
	
	migrationSQL := `
	CREATE TABLE IF NOT EXISTS users (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		username VARCHAR(50) UNIQUE NOT NULL,
		email VARCHAR(255) UNIQUE NOT NULL,
		password_hash VARCHAR(255) NOT NULL,
		avatar VARCHAR(10) DEFAULT '🎮',
		status VARCHAR(20) DEFAULT 'offline',
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS servers (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		name VARCHAR(100) NOT NULL,
		icon VARCHAR(10) DEFAULT '🎮',
		owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS server_members (
		server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		role VARCHAR(20) DEFAULT 'member',
		joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		PRIMARY KEY (server_id, user_id)
	);

	CREATE TABLE IF NOT EXISTS voice_channels (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
		name VARCHAR(100) NOT NULL,
		bitrate INTEGER DEFAULT 64000,
		user_limit INTEGER,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS text_channels (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
		name VARCHAR(100) NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS messages (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		channel_id UUID NOT NULL REFERENCES text_channels(id) ON DELETE CASCADE,
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		content TEXT NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS refresh_tokens (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		token VARCHAR(255) UNIQUE NOT NULL,
		expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);
	`

	_, err := d.DB.Exec(migrationSQL)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	return nil
}
