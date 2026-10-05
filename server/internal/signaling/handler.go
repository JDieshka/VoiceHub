package signaling

import (
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"voicehub-server/internal/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// Handler handles WebSocket upgrade requests
func Handler(hub *ws.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("[HTTP] WebSocket upgrade failed: %v", err)
			return
		}

		// Get user info from query params or generate defaults
		userID := r.URL.Query().Get("userId")
		if userID == "" {
			userID = uuid.New().String()
		}
		userName := r.URL.Query().Get("userName")
		if userName == "" {
			userName = "User-" + userID[:6]
		}
		userAvatar := r.URL.Query().Get("userAvatar")
		if userAvatar == "" {
			userAvatar = "🎮"
		}

		client := ws.NewClient(hub, conn, userID, userName, userAvatar)

		// Register client with hub
		hub.Register(client)

		// Start read/write pumps in goroutines
		go client.WritePump()
		go client.ReadPump()

		log.Printf("[HTTP] New WebSocket connection: %s (%s)", userName, userID)
	}
}

// CORSMiddleware adds CORS headers for development
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
