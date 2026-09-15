package main

import (
	"fmt"
	"log"
	"net/http"

	"voicehub-server/internal/signaling"
	"voicehub-server/internal/ws"
)

const (
	defaultPort = "8080"
)

func main() {
	port := defaultPort

	// Create WebSocket hub
	hub := ws.NewHub()
	go hub.Run()

	// Setup HTTP routes
	mux := http.NewServeMux()

	// WebSocket endpoint
	mux.HandleFunc("/ws", signaling.Handler(hub))

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"status":"ok","service":"voicehub-server"}`)
	})

	// Info endpoint
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{
			"service": "VoiceHub Server",
			"version": "1.0.0",
			"endpoints": {
				"websocket": "/ws?userId=<id>&userName=<name>&userAvatar=<emoji>",
				"health": "/health"
			},
			"protocol": {
				"messages": [
					"join - Join a voice channel",
					"leave - Leave current channel",
					"offer - WebRTC SDP offer",
					"answer - WebRTC SDP answer",
					"ice-candidate - WebRTC ICE candidate",
					"channel-update - Server: channel state changed",
					"user-joined - Server: user joined channel",
					"user-left - Server: user left channel"
				]
			}
		}`)
	})

	// Apply CORS middleware
	handler := signaling.CORSMiddleware(mux)

	log.Printf("🚀 VoiceHub Server starting on port %s", port)
	log.Printf("📡 WebSocket endpoint: ws://localhost:%s/ws", port)
	log.Printf("🏥 Health check: http://localhost:%s/health", port)

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
