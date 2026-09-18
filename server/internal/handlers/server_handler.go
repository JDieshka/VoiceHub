package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"voicehub-server/internal/auth"
	"voicehub-server/internal/database"
	"voicehub-server/internal/models"
)

// ServerHandler handles server-related HTTP requests
type ServerHandler struct {
	serverRepo  *database.ServerRepository
	channelRepo *database.ChannelRepository
	messageRepo *database.MessageRepository
	userRepo    *database.UserRepository
}

// NewServerHandler creates a new ServerHandler
func NewServerHandler(
	serverRepo *database.ServerRepository,
	channelRepo *database.ChannelRepository,
	messageRepo *database.MessageRepository,
	userRepo *database.UserRepository,
) *ServerHandler {
	return &ServerHandler{
		serverRepo:  serverRepo,
		channelRepo: channelRepo,
		messageRepo: messageRepo,
		userRepo:    userRepo,
	}
}

// CreateServer creates a new server
func (h *ServerHandler) CreateServer(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user := auth.GetUserFromContext(r.Context())
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req models.CreateServerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "Server name is required", http.StatusBadRequest)
		return
	}

	server := &models.Server{
		ID:        uuid.New(),
		Name:      req.Name,
		Icon:      req.Icon,
		OwnerID:   user.ID,
		CreatedAt: time.Now(),
	}

	if server.Icon == "" {
		server.Icon = "🎮"
	}

	// Create server
	if err := h.serverRepo.Create(r.Context(), server); err != nil {
		http.Error(w, "Failed to create server", http.StatusInternalServerError)
		return
	}

	// Add owner as member
	if err := h.serverRepo.AddMember(r.Context(), server.ID, user.ID, "owner"); err != nil {
		http.Error(w, "Failed to add owner as member", http.StatusInternalServerError)
		return
	}

	// Create default channels
	generalVoice := &models.VoiceChannel{
		ID:        uuid.New(),
		ServerID:  server.ID,
		Name:      "General",
		Bitrate:   64000,
		CreatedAt: time.Now(),
	}
	h.channelRepo.CreateVoiceChannel(r.Context(), generalVoice)

	generalText := &models.TextChannel{
		ID:        uuid.New(),
		ServerID:  server.ID,
		Name:      "general",
		CreatedAt: time.Now(),
	}
	h.channelRepo.CreateTextChannel(r.Context(), generalText)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(server)
}

// GetUserServers retrieves all servers for the current user
func (h *ServerHandler) GetUserServers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user := auth.GetUserFromContext(r.Context())
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	servers, err := h.serverRepo.GetUserServers(r.Context(), user.ID)
	if err != nil {
		http.Error(w, "Failed to get servers", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(servers)
}

// GetServer retrieves a server by ID
func (h *ServerHandler) GetServer(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user := auth.GetUserFromContext(r.Context())
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	serverID := r.URL.Query().Get("id")
	if serverID == "" {
		http.Error(w, "Server ID is required", http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(serverID)
	if err != nil {
		http.Error(w, "Invalid server ID", http.StatusBadRequest)
		return
	}

	// Check if user is member
	isMember, err := h.serverRepo.IsMember(r.Context(), id, user.ID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if !isMember {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	server, err := h.serverRepo.GetByID(r.Context(), id)
	if err != nil {
		http.Error(w, "Failed to get server", http.StatusInternalServerError)
		return
	}
	if server == nil {
		http.Error(w, "Server not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(server)
}

// GetServerChannels retrieves all channels for a server
func (h *ServerHandler) GetServerChannels(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user := auth.GetUserFromContext(r.Context())
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	serverID := r.URL.Query().Get("id")
	if serverID == "" {
		http.Error(w, "Server ID is required", http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(serverID)
	if err != nil {
		http.Error(w, "Invalid server ID", http.StatusBadRequest)
		return
	}

	// Check if user is member
	isMember, err := h.serverRepo.IsMember(r.Context(), id, user.ID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if !isMember {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	voiceChannels, err := h.channelRepo.GetVoiceChannels(r.Context(), id)
	if err != nil {
		http.Error(w, "Failed to get voice channels", http.StatusInternalServerError)
		return
	}

	textChannels, err := h.channelRepo.GetTextChannels(r.Context(), id)
	if err != nil {
		http.Error(w, "Failed to get text channels", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"voice_channels": voiceChannels,
		"text_channels":  textChannels,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetChannelMessages retrieves messages for a channel
func (h *ServerHandler) GetChannelMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user := auth.GetUserFromContext(r.Context())
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	channelID := r.URL.Query().Get("id")
	if channelID == "" {
		http.Error(w, "Channel ID is required", http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(channelID)
	if err != nil {
		http.Error(w, "Invalid channel ID", http.StatusBadRequest)
		return
	}

	messages, err := h.messageRepo.GetByChannel(r.Context(), id, 50, 0)
	if err != nil {
		http.Error(w, "Failed to get messages", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

// SendMessage sends a message to a channel
func (h *ServerHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user := auth.GetUserFromContext(r.Context())
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req models.SendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	channelID := r.URL.Query().Get("channel_id")
	if channelID == "" {
		http.Error(w, "Channel ID is required", http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(channelID)
	if err != nil {
		http.Error(w, "Invalid channel ID", http.StatusBadRequest)
		return
	}

	message := &models.Message{
		ID:        uuid.New(),
		ChannelID: id,
		UserID:    user.ID,
		Content:   req.Content,
		CreatedAt: time.Now(),
	}

	if err := h.messageRepo.Create(r.Context(), message); err != nil {
		http.Error(w, "Failed to send message", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(message)
}
