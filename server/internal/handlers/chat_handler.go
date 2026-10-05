package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"voicehub-server/internal/database"
	"voicehub-server/internal/models"
)

// ChatHandler handles chat-related HTTP requests
type ChatHandler struct {
	chatRepo    *database.ChatRepository
	messageRepo *database.MessageRepository
}

// NewChatHandler creates a new ChatHandler
func NewChatHandler(chatRepo *database.ChatRepository, messageRepo *database.MessageRepository) *ChatHandler {
	return &ChatHandler{
		chatRepo:    chatRepo,
		messageRepo: messageRepo,
	}
}

// CreateChat creates a new chat
func (h *ChatHandler) CreateChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value("userID").(uuid.UUID)

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "Chat name is required", http.StatusBadRequest)
		return
	}

	chat := &models.Chat{
		ID:        uuid.New(),
		Name:      req.Name,
		CreatedAt: time.Now(),
	}

	if err := h.chatRepo.Create(r.Context(), chat); err != nil {
		http.Error(w, "Failed to create chat: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Add creator as member
	if err := h.chatRepo.AddMember(r.Context(), chat.ID, userID); err != nil {
		http.Error(w, "Failed to add member: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(chat)
}

// GetUserChats retrieves all chats for the current user
func (h *ChatHandler) GetUserChats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value("userID").(uuid.UUID)

	chats, err := h.chatRepo.GetUserChats(r.Context(), userID)
	if err != nil {
		http.Error(w, "Failed to get chats: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chats)
}

// GetChatMessages retrieves messages for a chat
func (h *ChatHandler) GetChatMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	chatID := r.URL.Query().Get("chatId")
	if chatID == "" {
		http.Error(w, "Chat ID is required", http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(chatID)
	if err != nil {
		http.Error(w, "Invalid chat ID", http.StatusBadRequest)
		return
	}

	messages, err := h.messageRepo.GetByChat(r.Context(), id, 50, 0)
	if err != nil {
		http.Error(w, "Failed to get messages: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

// SendMessage sends a message to a chat
func (h *ChatHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value("userID").(uuid.UUID)

	chatID := r.URL.Query().Get("chatId")
	if chatID == "" {
		http.Error(w, "Chat ID is required", http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(chatID)
	if err != nil {
		http.Error(w, "Invalid chat ID", http.StatusBadRequest)
		return
	}

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.Content == "" {
		http.Error(w, "Message content is required", http.StatusBadRequest)
		return
	}

	message := &models.Message{
		ID:        uuid.New(),
		ChatID:    &id,
		UserID:    userID,
		Content:   req.Content,
		CreatedAt: time.Now(),
	}

	if err := h.messageRepo.Create(r.Context(), message); err != nil {
		http.Error(w, "Failed to send message: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(message)
}
