package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// ============ CONFIG ============
var (
	db        *sql.DB
	jwtSecret = []byte(getEnv("JWT_SECRET", "VoiceHub2024SuperSecretJWTKeyChangeThisInProduction88!"))
	dbURL     = getEnv("DATABASE_URL", "postgres://voicehub:VoiceHub2024SecurePass@localhost:5432/voicehub?sslmode=disable")
	port      = getEnv("PORT", "8080")
)

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// ============ MODELS ============
type User struct {
	ID           uuid.UUID `json:"id"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Avatar       string    `json:"avatar"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
}

type WSClient struct {
	ID     string
	UserID string
	Name   string
	Conn   *websocket.Conn
	Send   chan []byte
	Hub    *WSHub
	RoomID string
}

type WSHub struct {
	clients    map[string]*WSClient
	rooms      map[string]map[string]bool
	register   chan *WSClient
	unregister chan *WSClient
	mu         sync.RWMutex
}

// ============ WEBSOCKET HUB ============
func NewHub() *WSHub {
	return &WSHub{
		clients:    make(map[string]*WSClient),
		rooms:      make(map[string]map[string]bool),
		register:   make(chan *WSClient),
		unregister: make(chan *WSClient),
	}
}

func (h *WSHub) Run() {
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			h.clients[c.ID] = c
			h.mu.Unlock()
			log.Printf("[WS] Client connected: %s (%s)", c.Name, c.ID)

		case c := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[c.ID]; ok {
				delete(h.clients, c.ID)
				close(c.Send)
				if c.RoomID != "" {
					if room, ok := h.rooms[c.RoomID]; ok {
						delete(room, c.ID)
						if len(room) == 0 {
							delete(h.rooms, c.RoomID)
						}
					}
					msg := map[string]string{"type": "user-left", "from": c.ID}
					data, _ := json.Marshal(msg)
					h.broadcastToRoom(c.RoomID, data, c.ID)
				}
			}
			h.mu.Unlock()
		}
	}
}

func (h *WSHub) broadcastToRoom(roomID string, data []byte, excludeID string) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if room, ok := h.rooms[roomID]; ok {
		for clientID := range room {
			if clientID == excludeID {
				continue
			}
			if client, ok := h.clients[clientID]; ok {
				select {
				case client.Send <- data:
				default:
				}
			}
		}
	}
}

func (c *WSClient) ReadPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()
	c.Conn.SetReadLimit(65536)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})
	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}
		var msg map[string]interface{}
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}
		msg["from"] = c.ID
		msg["timestamp"] = time.Now()

		msgType, _ := msg["type"].(string)
		switch msgType {
		case "join":
			roomID, _ := msg["channelId"].(string)
			if roomID == "" {
				roomID, _ = msg["roomId"].(string)
			}
			if roomID != "" {
				c.Hub.mu.Lock()
				if c.RoomID != "" {
					if room, ok := c.Hub.rooms[c.RoomID]; ok {
						delete(room, c.ID)
					}
				}
				c.RoomID = roomID
				if c.Hub.rooms[roomID] == nil {
					c.Hub.rooms[roomID] = make(map[string]bool)
				}
				c.Hub.rooms[roomID][c.ID] = true
				c.Hub.mu.Unlock()

				joinMsg := map[string]interface{}{
					"type": "user-joined",
					"from": c.ID,
				}
				data, _ := json.Marshal(joinMsg)
				c.Hub.broadcastToRoom(roomID, data, c.ID)
			}

		case "leave":
			c.Hub.mu.Lock()
			if c.RoomID != "" {
				if room, ok := c.Hub.rooms[c.RoomID]; ok {
					delete(room, c.ID)
				}
				roomID := c.RoomID
				c.RoomID = ""
				c.Hub.mu.Unlock()
				leaveMsg := map[string]string{"type": "user-left", "from": c.ID}
				data, _ := json.Marshal(leaveMsg)
				c.Hub.broadcastToRoom(roomID, data, c.ID)
			} else {
				c.Hub.mu.Unlock()
			}

		case "offer", "answer", "ice-candidate":
			data, _ := json.Marshal(msg)
			roomID := c.RoomID
			to, _ := msg["to"].(string)
			if to != "" {
				c.Hub.mu.RLock()
				if target, ok := c.Hub.clients[to]; ok {
					select {
					case target.Send <- data:
					default:
					}
				}
				c.Hub.mu.RUnlock()
			} else if roomID != "" {
				c.Hub.broadcastToRoom(roomID, data, c.ID)
			}

		case "text-message":
			if payload, ok := msg["payload"].(map[string]interface{}); ok {
				channelID, _ := msg["channelId"].(string)
				content, _ := payload["content"].(string)
				if channelID != "" && content != "" {
					db.Exec("INSERT INTO messages (id, channel_id, user_id, content, created_at) VALUES ($1, $2, $3, $4, $5)",
						uuid.New(), channelID, c.UserID, content, time.Now())
				}
			}
			data, _ := json.Marshal(msg)
			if c.RoomID != "" {
				c.Hub.broadcastToRoom(c.RoomID, data, "")
			}
		}
	}
}

func (c *WSClient) WritePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.Send:
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			c.Conn.WriteMessage(websocket.TextMessage, message)
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			c.Conn.WriteMessage(websocket.PingMessage, nil)
		}
	}
}

// ============ WEBSOCKET HANDLER ============
var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

func wsHandler(hub *WSHub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("[WS] Upgrade failed: %v", err)
			return
		}
		userID := r.URL.Query().Get("userId")
		if userID == "" {
			userID = uuid.New().String()
		}
		userName := r.URL.Query().Get("userName")
		if userName == "" {
			userName = "User-" + userID[:6]
		}
		client := &WSClient{
			ID:     userID,
			UserID: userID,
			Name:   userName,
			Conn:   conn,
			Send:   make(chan []byte, 256),
			Hub:    hub,
		}
		hub.register <- client
		go client.WritePump()
		go client.ReadPump()
	}
}

// ============ AUTH ============
func generateToken(userID uuid.UUID, username, email string) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  userID.String(),
		"username": username,
		"email":    email,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func verifyToken(tokenStr string) (uuid.UUID, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})
	if err != nil {
		return uuid.Nil, err
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return uuid.Nil, jwt.ErrTokenMalformed
	}
	uid, err := uuid.Parse(claims["user_id"].(string))
	return uid, err
}

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		token := strings.TrimPrefix(auth, "Bearer ")
		userID, err := verifyToken(token)
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), "userID", userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

// ============ AUTH HANDLERS ============
func registerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", 405)
		return
	}
	var req struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Avatar   string `json:"avatar"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", 400)
		return
	}
	if req.Username == "" || req.Email == "" || req.Password == "" {
		http.Error(w, "Missing fields", 400)
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	id := uuid.New()
	avatar := req.Avatar
	if avatar == "" {
		avatar = "🎮"
	}
	_, err := db.Exec(
		"INSERT INTO users (id, username, email, password_hash, avatar, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,'offline',NOW(),NOW())",
		id, req.Username, req.Email, string(hash), avatar,
	)
	if err != nil {
		http.Error(w, "Database error: "+err.Error(), 500)
		return
	}
	token, _ := generateToken(id, req.Username, req.Email)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"access_token":  token,
		"refresh_token": token,
		"user": map[string]interface{}{
			"id": id, "username": req.Username, "email": req.Email,
			"avatar": avatar, "status": "online",
		},
	})
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", 405)
		return
	}
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", 400)
		return
	}
	var user User
	err := db.QueryRow("SELECT id, username, email, password_hash, avatar, status, created_at FROM users WHERE email=$1", req.Email).
		Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.Avatar, &user.Status, &user.CreatedAt)
	if err != nil {
		http.Error(w, "Invalid credentials", 401)
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		http.Error(w, "Invalid credentials", 401)
		return
	}
	token, _ := generateToken(user.ID, user.Username, user.Email)
	db.Exec("UPDATE users SET status='online', updated_at=NOW() WHERE id=$1", user.ID)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"access_token":  token,
		"refresh_token": token,
		"user":          user,
	})
}

func meHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(uuid.UUID)
	var user User
	err := db.QueryRow("SELECT id, username, email, avatar, status, created_at FROM users WHERE id=$1", userID).
		Scan(&user.ID, &user.Username, &user.Email, &user.Avatar, &user.Status, &user.CreatedAt)
	if err != nil {
		http.Error(w, "User not found", 404)
		return
	}
	json.NewEncoder(w).Encode(user)
}

// ============ SERVER HANDLERS ============
func createServerHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(uuid.UUID)
	var req struct {
		Name string `json:"name"`
		Icon string `json:"icon"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.Name == "" {
		http.Error(w, "Name required", 400)
		return
	}
	if req.Icon == "" {
		req.Icon = "🎮"
	}
	serverID := uuid.New()
	_, err := db.Exec("INSERT INTO servers (id, name, icon, owner_id, created_at) VALUES ($1,$2,$3,$4,NOW())",
		serverID, req.Name, req.Icon, userID)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	db.Exec("INSERT INTO server_members (server_id, user_id, role, joined_at) VALUES ($1,$2,'owner',NOW())", serverID, userID)
	db.Exec("INSERT INTO voice_channels (id, server_id, name, bitrate, created_at) VALUES ($1,$2,'General',64000,NOW())", uuid.New(), serverID)
	db.Exec("INSERT INTO text_channels (id, server_id, name, created_at) VALUES ($1,$2,'general',NOW())", uuid.New(), serverID)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id": serverID, "name": req.Name, "icon": req.Icon, "owner_id": userID,
	})
}

func listServersHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(uuid.UUID)
	rows, err := db.Query(`
		SELECT s.id, s.name, s.icon, s.owner_id, s.created_at
		FROM servers s JOIN server_members sm ON s.id = sm.server_id
		WHERE sm.user_id = $1 ORDER BY s.created_at DESC`, userID)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()
	var servers []map[string]interface{}
	for rows.Next() {
		var id uuid.UUID
		var name, icon string
		var ownerID uuid.UUID
		var createdAt time.Time
		rows.Scan(&id, &name, &icon, &ownerID, &createdAt)
		servers = append(servers, map[string]interface{}{
			"id": id, "name": name, "icon": icon, "owner_id": ownerID, "created_at": createdAt,
		})
	}
	json.NewEncoder(w).Encode(servers)
}

// ============ MAIN ============
func main() {
	log.Println("🚀 VoiceHub Server starting...")

	var err error
	db, err = sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("❌ DB connection failed: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("❌ DB ping failed: %v", err)
	}
	log.Println("✅ Database connected")

	migrations := `
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
	);`
	if _, err := db.Exec(migrations); err != nil {
		log.Printf("⚠️  Migration warning: %v", err)
	}
	log.Println("✅ Database migrated")

	hub := NewHub()
	go hub.Run()

	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status": "ok", "service": "voicehub-server", "version": "2.0.0",
		})
	})

	mux.HandleFunc("/api/auth/register", registerHandler)
	mux.HandleFunc("/api/auth/login", loginHandler)
	mux.HandleFunc("/api/auth/refresh", loginHandler)
	mux.HandleFunc("/api/auth/me", authMiddleware(meHandler))
	mux.HandleFunc("/api/auth/logout", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
	})

	mux.HandleFunc("/api/servers", authMiddleware(createServerHandler))
	mux.HandleFunc("/api/servers/list", authMiddleware(listServersHandler))
	mux.HandleFunc("/api/servers/get", authMiddleware(listServersHandler))
	mux.HandleFunc("/api/servers/channels", authMiddleware(listServersHandler))
	mux.HandleFunc("/api/channels/messages", authMiddleware(listServersHandler))
	mux.HandleFunc("/api/messages/send", authMiddleware(listServersHandler))

	mux.HandleFunc("/ws", wsHandler(hub))
	mux.HandleFunc("/sfu", wsHandler(hub))

	distPath := filepath.Join("..", "dist")
	if _, err := os.Stat(filepath.Join(distPath, "index.html")); err == nil {
		log.Printf("📁 Serving frontend from %s", distPath)
		fs := http.FileServer(http.Dir(distPath))
		mux.Handle("/assets/", fs)
	}

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") || strings.HasPrefix(r.URL.Path, "/ws") || strings.HasPrefix(r.URL.Path, "/sfu") {
			http.NotFound(w, r)
			return
		}
		indexPath := filepath.Join(distPath, "index.html")
		if _, err := os.Stat(indexPath); err == nil {
			http.ServeFile(w, r, indexPath)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"service": "VoiceHub Server",
			"version": "2.0.0",
			"status":  "running",
			"endpoints": map[string]string{
				"health": "/health",
				"auth":   "/api/auth/*",
				"ws":     "/ws",
			},
		})
	})

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(200)
			return
		}
		mux.ServeHTTP(w, r)
	})

	addr := ":" + port
	log.Printf("📡 Server running on http://0.0.0.0%s", addr)
	log.Fatal(http.ListenAndServe(addr, handler))
}
