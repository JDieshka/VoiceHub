package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v4"
	"voicehub-server/internal/sfu"
	"voicehub-server/internal/signaling"
	"voicehub-server/internal/ws"
)

const (
	defaultPort = "8080"
)

var (
	mode     = flag.String("mode", "hybrid", "Server mode: signaling, sfu, or hybrid")
	port     = flag.String("port", defaultPort, "Server port")
	certFile = flag.String("cert", "", "TLS certificate file")
	keyFile  = flag.String("key", "", "TLS key file")
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

func main() {
	flag.Parse()

	log.Printf("🚀 VoiceHub Server starting in %s mode on port %s", *mode, *port)

	mux := http.NewServeMux()

	switch *mode {
	case "signaling":
		setupSignalingServer(mux)
	case "sfu":
		setupSFUServer(mux)
	case "hybrid":
		setupHybridServer(mux)
	default:
		log.Fatalf("Unknown mode: %s", *mode)
	}

	// Health and info endpoints
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/", infoHandler)

	// Apply CORS middleware
	handler := signaling.CORSMiddleware(mux)

	addr := ":" + *port
	if *certFile != "" && *keyFile != "" {
		log.Printf("🔒 Starting HTTPS server on %s", addr)
		if err := http.ListenAndServeTLS(addr, *certFile, *keyFile, handler); err != nil {
			log.Fatalf("Server failed: %v", err)
		}
	} else {
		log.Printf("📡 Starting HTTP server on %s", addr)
		log.Printf("   WebSocket: ws://localhost:%s/ws", *port)
		log.Printf("   SFU:       ws://localhost:%s/sfu", *port)
		log.Printf("   Health:    http://localhost:%s/health", *port)
		
		if err := http.ListenAndServe(addr, handler); err != nil {
			log.Fatalf("Server failed: %v", err)
		}
	}
}

func setupSignalingServer(mux *http.ServeMux) {
	// P2P signaling mode (mesh topology)
	hub := ws.NewHub()
	go hub.Run()

	mux.HandleFunc("/ws", signaling.Handler(hub))
	log.Printf("📡 Signaling server ready (P2P mesh)")
}

func setupSFUServer(mux *http.ServeMux) {
	// SFU mode
	sfuServer, err := sfu.NewSFU(sfu.SFUConfig{
		ICEServers: []webrtc.ICEServer{
			{URLs: []string{"stun:stun.l.google.com:19302"}},
		},
	})
	if err != nil {
		log.Fatalf("Failed to create SFU: %v", err)
	}

	mux.HandleFunc("/sfu", func(w http.ResponseWriter, r *http.Request) {
		handleSFUConnection(sfuServer, w, r)
	})
	log.Printf("🎥 SFU server ready")
}

func setupHybridServer(mux *http.ServeMux) {
	// Both P2P signaling and SFU
	hub := ws.NewHub()
	go hub.Run()

	sfuServer, err := sfu.NewSFU(sfu.SFUConfig{
		ICEServers: []webrtc.ICEServer{
			{URLs: []string{"stun:stun.l.google.com:19302"}},
		},
	})
	if err != nil {
		log.Fatalf("Failed to create SFU: %v", err)
	}

	mux.HandleFunc("/ws", signaling.Handler(hub))
	mux.HandleFunc("/sfu", func(w http.ResponseWriter, r *http.Request) {
		handleSFUConnection(sfuServer, w, r)
	})

	log.Printf("🔀 Hybrid server ready (P2P + SFU)")
}

func handleSFUConnection(sfuServer *sfu.SFU, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[HTTP] WebSocket upgrade failed: %v", err)
		return
	}

	peerID := r.URL.Query().Get("peerId")
	if peerID == "" {
		peerID = uuid.New().String()
	}
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

// Health check handler
func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	
	hostname, _ := os.Hostname()
	response := map[string]interface{}{
		"status":   "ok",
		"service":  "voicehub-server",
		"mode":     *mode,
		"hostname": hostname,
		"version":  "1.1.0",
	}
	
	json.NewEncoder(w).Encode(response)
}

// Info handler
func infoHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	
	info := map[string]interface{}{
		"service": "VoiceHub Server",
		"version": "1.1.0",
		"mode":    *mode,
		"endpoints": map[string]string{
			"signaling": "/ws?userId=<id>&userName=<name>&userAvatar=<emoji>",
			"sfu":       "/sfu?peerId=<id>&peerName=<name>",
			"health":    "/health",
		},
		"modes": map[string]string{
			"signaling": "P2P mesh - clients connect directly to each other",
			"sfu":       "SFU - server forwards media between clients",
			"hybrid":    "Both P2P and SFU endpoints available",
		},
	}
	
	json.NewEncoder(w).Encode(info)
}
