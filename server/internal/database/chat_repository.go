package database

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"voicehub-server/internal/models"
)

// ChatRepository handles database operations for chats
type ChatRepository struct {
	db *Database
}

// NewChatRepository creates a new ChatRepository
func NewChatRepository(db *Database) *ChatRepository {
	return &ChatRepository{db: db}
}

// Create creates a new chat
func (r *ChatRepository) Create(ctx context.Context, chat *models.Chat) error {
	query := `
		INSERT INTO chats (id, name, created_at)
		VALUES ($1, $2, $3)
	`
	_, err := r.db.DB.ExecContext(ctx, query,
		chat.ID, chat.Name, chat.CreatedAt)
	return err
}

// GetByID retrieves a chat by ID
func (r *ChatRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Chat, error) {
	query := `
		SELECT id, name, created_at
		FROM chats WHERE id = $1
	`
	chat := &models.Chat{}
	err := r.db.DB.QueryRowContext(ctx, query, id).Scan(
		&chat.ID, &chat.Name, &chat.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return chat, err
}

// GetUserChats retrieves all chats for a user
func (r *ChatRepository) GetUserChats(ctx context.Context, userID uuid.UUID) ([]models.Chat, error) {
	query := `
		SELECT c.id, c.name, c.created_at
		FROM chats c
		JOIN chat_members cm ON c.id = cm.chat_id
		WHERE cm.user_id = $1
		ORDER BY c.created_at DESC
	`
	rows, err := r.db.DB.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chats []models.Chat
	for rows.Next() {
		var chat models.Chat
		if err := rows.Scan(&chat.ID, &chat.Name, &chat.CreatedAt); err != nil {
			return nil, err
		}
		chats = append(chats, chat)
	}
	return chats, rows.Err()
}

// AddMember adds a user to a chat
func (r *ChatRepository) AddMember(ctx context.Context, chatID, userID uuid.UUID) error {
	query := `
		INSERT INTO chat_members (chat_id, user_id, joined_at)
		VALUES ($1, $2, $3)
	`
	_, err := r.db.DB.ExecContext(ctx, query, chatID, userID, time.Now())
	return err
}

// RemoveMember removes a user from a chat
func (r *ChatRepository) RemoveMember(ctx context.Context, chatID, userID uuid.UUID) error {
	query := `DELETE FROM chat_members WHERE chat_id = $1 AND user_id = $2`
	_, err := r.db.DB.ExecContext(ctx, query, chatID, userID)
	return err
}

// GetMembers retrieves all members of a chat
func (r *ChatRepository) GetMembers(ctx context.Context, chatID uuid.UUID) ([]models.ChatMember, error) {
	query := `
		SELECT chat_id, user_id, joined_at
		FROM chat_members
		WHERE chat_id = $1
	`
	rows, err := r.db.DB.QueryContext(ctx, query, chatID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []models.ChatMember
	for rows.Next() {
		var member models.ChatMember
		if err := rows.Scan(&member.ChatID, &member.UserID, &member.JoinedAt); err != nil {
			return nil, err
		}
		members = append(members, member)
	}
	return members, rows.Err()
}

// IsMember checks if a user is a member of a chat
func (r *ChatRepository) IsMember(ctx context.Context, chatID, userID uuid.UUID) (bool, error) {
	query := `
		SELECT COUNT(*) > 0
		FROM chat_members
		WHERE chat_id = $1 AND user_id = $2
	`
	var isMember bool
	err := r.db.DB.QueryRowContext(ctx, query, chatID, userID).Scan(&isMember)
	return isMember, err
}
