package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v4"
	"voicehub-server/internal/auth"
	"voicehub-server/internal/config"
	"voicehub-server/internal/database"
	"voicehub-server/internal/handlers"
	"voicehub-server/internal/signaling"
	"voicehub-server/internal/sfu"
	"voicehub-server/internal/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

func main() {
	// Load configuration
	cfg := config.Load()

	log.Printf("🚀 VoiceHub Server starting in %s mode on port %s", cfg.Mode, cfg.Port)

	// Initialize database
	db, err := database.New(cfg)
	if err != nil {
		log.Printf("⚠️  Database connection failed: %v", err)
		log.Printf("⚠️  Running without database (auth disabled)")
	} else {
		defer db.Close()
		
		// Run migrations
		if err := db.RunMigrations(); err != nil {
			log.Printf("⚠️  Database migrations failed: %v", err)
		} else {
			log.Printf("✅ Database connected and migrated")
		}
	}

	// Initialize repositories
	var userRepo *database.UserRepository
	var tokenRepo *database.RefreshTokenRepository
	var serverRepo *database.ServerRepository
	var channelRepo *database.ChannelRepository
	var messageRepo *database.MessageRepository

	if db != nil {
		userRepo = database.NewUserRepository(db)
		tokenRepo = database.NewRefreshTokenRepository(db)
		serverRepo = database.NewServerRepository(db)
		channelRepo = database.NewChannelRepository(db)
		messageRepo = database.NewMessageRepository(db)
	}

	// Initialize JWT manager
	jwtManager := auth.NewJWTManager(cfg)

	// Initialize handlers
	var authHandler *handlers.AuthHandler
	var serverHandler *handlers.ServerHandler

	if db != nil {
		authHandler = handlers.NewAuthHandler(userRepo, tokenRepo, jwtManager, cfg.RefreshExpiration)
		serverHandler = handlers.NewServerHandler(serverRepo, channelRepo, messageRepo, userRepo)
	}

	// Initialize WebSocket hub
	hub := ws.NewHub()
	go hub.Run()

	// Initialize SFU
	sfuServer, err := sfu.NewSFU(sfu.SFUConfig{
		ICEServers: []webrtc.ICEServer{
			{URLs: []string{"stun:stun.l.google.com:19302"}},
		},
	})
	if err != nil {
		log.Printf("⚠️  SFU initialization failed: %v", err)
	}

	// Setup HTTP routes
	mux := http.NewServeMux()

	// Public routes (no auth required)
	mux.HandleFunc("/health", healthHandler)
	
	// Frontend static files (if dist/ exists)
	distPath := filepath.Join("..", "dist")
	if _, err := os.Stat(distPath); err == nil {
		log.Printf("📁 Serving frontend from %s", distPath)
		fs := http.FileServer(http.Dir(distPath))
		mux.Handle("/assets/", fs)
		mux.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
			http.ServeFile(w, r, filepath.Join(distPath, "favicon.ico"))
		})
	} else {
		log.Printf("⚠️  Frontend dist/ not found, using info handler")
	}
	
	mux.HandleFunc("/", rootHandler)

	// Auth routes
	if authHandler != nil {
		mux.HandleFunc("/api/auth/register", authHandler.Register)
		mux.HandleFunc("/api/auth/login", authHandler.Login)
		mux.HandleFunc("/api/auth/refresh", authHandler.Refresh)
	}

	// Protected routes (auth required)
	if authHandler != nil && serverHandler != nil {
		authMiddleware := auth.Middleware(jwtManager)
		
		// Wrap protected handlers with middleware
		mux.Handle("/api/auth/logout", authMiddleware(http.HandlerFunc(authHandler.Logout)))
		mux.Handle("/api/auth/me", authMiddleware(http.HandlerFunc(authHandler.Me)))
		
		mux.Handle("/api/servers", authMiddleware(http.HandlerFunc(serverHandler.CreateServer)))
		mux.Handle("/api/servers/list", authMiddleware(http.HandlerFunc(serverHandler.GetUserServers)))
		mux.Handle("/api/servers/get", authMiddleware(http.HandlerFunc(serverHandler.GetServer)))
		mux.Handle("/api/servers/channels", authMiddleware(http.HandlerFunc(serverHandler.GetServerChannels)))
		mux.Handle("/api/channels/messages", authMiddleware(http.HandlerFunc(serverHandler.GetChannelMessages)))
		mux.Handle("/api/messages/send", authMiddleware(http.HandlerFunc(serverHandler.SendMessage)))
	}

	// WebSocket routes (can work with or without auth)
	mux.HandleFunc("/ws", signaling.Handler(hub))
	if sfuServer != nil {
		mux.HandleFunc("/sfu", func(w http.ResponseWriter, r *http.Request) {
			handleSFUConnection(sfuServer, w, r)
		})
	}

	// Apply CORS middleware
	handler := corsMiddleware(mux)

	// Start server
	addr := ":" + cfg.Port
	log.Printf("📡 Starting HTTP server on %s", addr)
	log.Printf("   Endpoints:")
	log.Printf("     Health:    http://localhost:%s/health", cfg.Port)
	log.Printf("     Auth:      http://localhost:%s/api/auth/*", cfg.Port)
	log.Printf("     Servers:   http://localhost:%s/api/servers/*", cfg.Port)
	log.Printf("     WebSocket: ws://localhost:%s/ws", cfg.Port)
	if sfuServer != nil {
		log.Printf("     SFU:       ws://localhost:%s/sfu", cfg.Port)
	}

	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func handleSFUConnection(sfuServer *sfu.SFU, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[HTTP] WebSocket upgrade failed: %v", err)
		return
	}

	peerID := r.URL.Query().Get("peerId")
	peerName := r.URL.Query().Get("peerName")
	if peerName == "" {
		peerName = "User-" + peerID[:6]
	}

	log.Printf("[SFU] New connection: %s (%s)", peerName, peerID)

	if err := sfuServer.HandleWebSocket(conn, peerID, peerName); err != nil {
		log.Printf("[SFU] Failed to handle connection: %v", err)
		conn.Close()
		return
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("[Health] Health check from %s", r.RemoteAddr)
	
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(http.StatusOK)
	
	response := map[string]interface{}{
		"status":  "ok",
		"service": "voicehub-server",
		"version": "2.0.0",
		"time":    time.Now().Format(time.RFC3339),
	}
	
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("[Health] Error encoding response: %v", err)
	}
}

func rootHandler(w http.ResponseWriter, r *http.Request) {
	// Если это API запрос - возвращаем JSON
	if len(r.URL.Path) > 1 && (r.URL.Path[:4] == "/api" || r.URL.Path[:3] == "/ws" || r.URL.Path[:4] == "/sfu") {
		http.NotFound(w, r)
		return
	}
	
	// Пытаемся отдать index.html из dist/
	distPath := filepath.Join("..", "dist")
	indexPath := filepath.Join(distPath, "index.html")
	
	if _, err := os.Stat(indexPath); err == nil {
		// Отдаём index.html для SPA
		http.ServeFile(w, r, indexPath)
		return
	}
	
	// Если dist/ нет - возвращаем JSON информацию
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{
		"service": "VoiceHub Server",
		"version": "2.0.0",
		"status": "running",
		"frontend": "not built",
		"message": "Frontend not found. Run 'npm run build' in project root.",
		"endpoints": {
			"health": "/health",
			"auth": "/api/auth/*",
			"servers": "/api/servers/*",
			"websocket": "/ws",
			"sfu": "/sfu"
		}
	}`))
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Логируем все запросы для отладки
		log.Printf("[CORS] %s %s from %s", r.Method, r.URL.Path, r.Header.Get("Origin"))
		
		// Устанавливаем CORS заголовки
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "86400")

		// Обрабатываем preflight запросы
		if r.Method == "OPTIONS" {
			log.Printf("[CORS] Preflight request from %s", origin)
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
