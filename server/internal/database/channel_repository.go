package database

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"voicehub-server/internal/models"
)

// ChannelRepository handles database operations for channels
type ChannelRepository struct {
	db *Database
}

// NewChannelRepository creates a new ChannelRepository
func NewChannelRepository(db *Database) *ChannelRepository {
	return &ChannelRepository{db: db}
}

// CreateVoiceChannel creates a new voice channel
func (r *ChannelRepository) CreateVoiceChannel(ctx context.Context, channel *models.VoiceChannel) error {
	query := `
		INSERT INTO voice_channels (id, server_id, name, bitrate, user_limit, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.DB.ExecContext(ctx, query,
		channel.ID, channel.ServerID, channel.Name, channel.Bitrate, channel.UserLimit, channel.CreatedAt)
	return err
}

// CreateTextChannel creates a new text channel
func (r *ChannelRepository) CreateTextChannel(ctx context.Context, channel *models.TextChannel) error {
	query := `
		INSERT INTO text_channels (id, server_id, name, created_at)
		VALUES ($1, $2, $3, $4)
	`
	_, err := r.db.DB.ExecContext(ctx, query,
		channel.ID, channel.ServerID, channel.Name, channel.CreatedAt)
	return err
}

// GetVoiceChannels retrieves all voice channels for a server
func (r *ChannelRepository) GetVoiceChannels(ctx context.Context, serverID uuid.UUID) ([]models.VoiceChannel, error) {
	query := `
		SELECT id, server_id, name, bitrate, user_limit, created_at
		FROM voice_channels
		WHERE server_id = $1
		ORDER BY created_at
	`
	rows, err := r.db.DB.QueryContext(ctx, query, serverID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []models.VoiceChannel
	for rows.Next() {
		var channel models.VoiceChannel
		if err := rows.Scan(&channel.ID, &channel.ServerID, &channel.Name, &channel.Bitrate, &channel.UserLimit, &channel.CreatedAt); err != nil {
			return nil, err
		}
		channels = append(channels, channel)
	}
	return channels, rows.Err()
}

// GetTextChannels retrieves all text channels for a server
func (r *ChannelRepository) GetTextChannels(ctx context.Context, serverID uuid.UUID) ([]models.TextChannel, error) {
	query := `
		SELECT id, server_id, name, created_at
		FROM text_channels
		WHERE server_id = $1
		ORDER BY created_at
	`
	rows, err := r.db.DB.QueryContext(ctx, query, serverID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []models.TextChannel
	for rows.Next() {
		var channel models.TextChannel
		if err := rows.Scan(&channel.ID, &channel.ServerID, &channel.Name, &channel.CreatedAt); err != nil {
			return nil, err
		}
		channels = append(channels, channel)
	}
	return channels, rows.Err()
}

// MessageRepository handles database operations for messages
type MessageRepository struct {
	db *Database
}

// NewMessageRepository creates a new MessageRepository
func NewMessageRepository(db *Database) *MessageRepository {
	return &MessageRepository{db: db}
}

// Create creates a new message
func (r *MessageRepository) Create(ctx context.Context, message *models.Message) error {
	query := `
		INSERT INTO messages (id, channel_id, user_id, content, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := r.db.DB.ExecContext(ctx, query,
		message.ID, message.ChannelID, message.UserID, message.Content, message.CreatedAt)
	return err
}

// GetByChannel retrieves messages for a channel
func (r *MessageRepository) GetByChannel(ctx context.Context, channelID uuid.UUID, limit, offset int) ([]models.Message, error) {
	query := `
		SELECT id, channel_id, user_id, content, created_at
		FROM messages
		WHERE channel_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.DB.QueryContext(ctx, query, channelID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []models.Message
	for rows.Next() {
		var message models.Message
		if err := rows.Scan(&message.ID, &message.ChannelID, &message.UserID, &message.Content, &message.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, message)
	}
	return messages, rows.Err()
}

// GetByID retrieves a message by ID
func (r *MessageRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Message, error) {
	query := `
		SELECT id, channel_id, user_id, content, created_at
		FROM messages WHERE id = $1
	`
	message := &models.Message{}
	err := r.db.DB.QueryRowContext(ctx, query, id).Scan(
		&message.ID, &message.ChannelID, &message.UserID, &message.Content, &message.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return message, err
}

// Delete deletes a message
func (r *MessageRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM messages WHERE id = $1`
	_, err := r.db.DB.ExecContext(ctx, query, id)
	return err
}
