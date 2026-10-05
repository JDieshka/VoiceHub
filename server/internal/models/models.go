package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user in the system
type User struct {
	ID           uuid.UUID `json:"id" db:"id"`
	Username     string    `json:"username" db:"username"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	Avatar       string    `json:"avatar" db:"avatar"`
	Status       string    `json:"status" db:"status"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

// Server represents a Discord-like server
type Server struct {
	ID        uuid.UUID `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Icon      string    `json:"icon" db:"icon"`
	OwnerID   uuid.UUID `json:"owner_id" db:"owner_id"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// ServerMember represents a user's membership in a server
type ServerMember struct {
	ServerID uuid.UUID `json:"server_id" db:"server_id"`
	UserID   uuid.UUID `json:"user_id" db:"user_id"`
	Role     string    `json:"role" db:"role"`
	JoinedAt time.Time `json:"joined_at" db:"joined_at"`
}

// VoiceChannel represents a voice channel in a server
type VoiceChannel struct {
	ID        uuid.UUID `json:"id" db:"id"`
	ServerID  uuid.UUID `json:"server_id" db:"server_id"`
	Name      string    `json:"name" db:"name"`
	Bitrate   int       `json:"bitrate" db:"bitrate"`
	UserLimit *int      `json:"user_limit,omitempty" db:"user_limit"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// TextChannel represents a text channel in a server
type TextChannel struct {
	ID        uuid.UUID `json:"id" db:"id"`
	ServerID  uuid.UUID `json:"server_id" db:"server_id"`
	Name      string    `json:"name" db:"name"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// Message represents a message in a text channel
type Message struct {
	ID        uuid.UUID `json:"id" db:"id"`
	ChannelID uuid.UUID `json:"channel_id" db:"channel_id"`
	UserID    uuid.UUID `json:"user_id" db:"user_id"`
	Content   string    `json:"content" db:"content"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// RefreshToken represents a refresh token for JWT authentication
type RefreshToken struct {
	ID        uuid.UUID `json:"id" db:"id"`
	UserID    uuid.UUID `json:"user_id" db:"user_id"`
	Token     string    `json:"token" db:"token"`
	ExpiresAt time.Time `json:"expires_at" db:"expires_at"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// CreateUserRequest represents a request to create a new user
type CreateUserRequest struct {
	Username string `json:"username" validate:"required,min=3,max=50"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Avatar   string `json:"avatar"`
}

// LoginRequest represents a login request
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// AuthResponse represents the response after successful authentication
type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	User         *User  `json:"user"`
}

// TokenClaims represents the claims in a JWT token
type TokenClaims struct {
	UserID   uuid.UUID `json:"user_id"`
	Username string    `json:"username"`
	Email    string    `json:"email"`
}

// CreateServerRequest represents a request to create a new server
type CreateServerRequest struct {
	Name string `json:"name" validate:"required,min=1,max=100"`
	Icon string `json:"icon"`
}

// CreateChannelRequest represents a request to create a new channel
type CreateChannelRequest struct {
	Name      string `json:"name" validate:"required,min=1,max=100"`
	Type      string `json:"type" validate:"required,oneof=voice text"`
	Bitrate   int    `json:"bitrate,omitempty"`
	UserLimit *int   `json:"user_limit,omitempty"`
}

// SendMessageRequest represents a request to send a message
type SendMessageRequest struct {
	Content string `json:"content" validate:"required,min=1,max=2000"`
}
