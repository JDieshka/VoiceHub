package database

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"voicehub-server/internal/models"
)

// ServerRepository handles database operations for servers
type ServerRepository struct {
	db *Database
}

// NewServerRepository creates a new ServerRepository
func NewServerRepository(db *Database) *ServerRepository {
	return &ServerRepository{db: db}
}

// Create creates a new server
func (r *ServerRepository) Create(ctx context.Context, server *models.Server) error {
	query := `
		INSERT INTO servers (id, name, icon, owner_id, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := r.db.DB.ExecContext(ctx, query,
		server.ID, server.Name, server.Icon, server.OwnerID, server.CreatedAt)
	return err
}

// GetByID retrieves a server by ID
func (r *ServerRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Server, error) {
	query := `
		SELECT id, name, icon, owner_id, created_at
		FROM servers WHERE id = $1
	`
	server := &models.Server{}
	err := r.db.DB.QueryRowContext(ctx, query, id).Scan(
		&server.ID, &server.Name, &server.Icon, &server.OwnerID, &server.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return server, err
}

// GetUserServers retrieves all servers for a user
func (r *ServerRepository) GetUserServers(ctx context.Context, userID uuid.UUID) ([]models.Server, error) {
	query := `
		SELECT s.id, s.name, s.icon, s.owner_id, s.created_at
		FROM servers s
		JOIN server_members sm ON s.id = sm.server_id
		WHERE sm.user_id = $1
		ORDER BY s.created_at DESC
	`
	rows, err := r.db.DB.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var servers []models.Server
	for rows.Next() {
		var server models.Server
		if err := rows.Scan(&server.ID, &server.Name, &server.Icon, &server.OwnerID, &server.CreatedAt); err != nil {
			return nil, err
		}
		servers = append(servers, server)
	}
	return servers, rows.Err()
}

// AddMember adds a user to a server
func (r *ServerRepository) AddMember(ctx context.Context, serverID, userID uuid.UUID, role string) error {
	query := `
		INSERT INTO server_members (server_id, user_id, role, joined_at)
		VALUES ($1, $2, $3, $4)
	`
	_, err := r.db.DB.ExecContext(ctx, query, serverID, userID, role, time.Now())
	return err
}

// RemoveMember removes a user from a server
func (r *ServerRepository) RemoveMember(ctx context.Context, serverID, userID uuid.UUID) error {
	query := `DELETE FROM server_members WHERE server_id = $1 AND user_id = $2`
	_, err := r.db.DB.ExecContext(ctx, query, serverID, userID)
	return err
}

// GetMembers retrieves all members of a server
func (r *ServerRepository) GetMembers(ctx context.Context, serverID uuid.UUID) ([]models.ServerMember, error) {
	query := `
		SELECT server_id, user_id, role, joined_at
		FROM server_members
		WHERE server_id = $1
	`
	rows, err := r.db.DB.QueryContext(ctx, query, serverID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []models.ServerMember
	for rows.Next() {
		var member models.ServerMember
		if err := rows.Scan(&member.ServerID, &member.UserID, &member.Role, &member.JoinedAt); err != nil {
			return nil, err
		}
		members = append(members, member)
	}
	return members, rows.Err()
}

// IsMember checks if a user is a member of a server
func (r *ServerRepository) IsMember(ctx context.Context, serverID, userID uuid.UUID) (bool, error) {
	query := `
		SELECT COUNT(*) > 0
		FROM server_members
		WHERE server_id = $1 AND user_id = $2
	`
	var isMember bool
	err := r.db.DB.QueryRowContext(ctx, query, serverID, userID).Scan(&isMember)
	return isMember, err
}
