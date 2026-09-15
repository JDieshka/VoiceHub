package sfu

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/pion/interceptor"
	"github.com/pion/interceptor/pkg/intervalpacer"
	"github.com/pion/interceptor/pkg/report"
	"github.com/pion/rtp"
	"github.com/pion/webrtc/v4"
)

// SFU represents the Selective Forwarding Unit
type SFU struct {
	mu          sync.RWMutex
	rooms       map[string]*Room
	api         *webrtc.API
	config      SFUConfig
}

// Room represents a voice channel room
type Room struct {
	mu        sync.RWMutex
	id        string
	peers     map[string]*Peer
	onClose   func()
}

// Peer represents a connected client in a room
type Peer struct {
	mu           sync.RWMutex
	id           string
	name         string
	room         *Room
	conn         *webrtc.PeerConnection
	wsConn       *websocket.Conn
	tracks       map[string]*webrtc.TrackLocalStaticRTP
	subscribers  map[string]*webrtc.TrackLocalStaticRTP
	closed       bool
	onClose      func()
}

// SFUConfig holds SFU configuration
type SFUConfig struct {
	ICEServers []webrtc.ICEServer
}

// SignalMessage for WebSocket communication
type SignalMessage struct {
	Type      string          `json:"type"`
	RoomID    string          `json:"roomId,omitempty"`
	PeerID    string          `json:"peerId,omitempty"`
	From      string          `json:"from,omitempty"`
	To        string          `json:"to,omitempty"`
	Payload   json.RawMessage `json:"payload,omitempty"`
	Timestamp time.Time       `json:"timestamp"`
}

// NewSFU creates a new SFU instance
func NewSFU(config SFUConfig) (*SFU, error) {
	// Create MediaEngine
	m := &webrtc.MediaEngine{}
	if err := m.RegisterDefaultCodecs(); err != nil {
		return nil, fmt.Errorf("failed to register codecs: %w", err)
	}

	// Create InterceptorRegistry
	i := &interceptor.Registry{}
	
	// Add interval pacer
	pacer, err := intervalpacer.New()
	if err != nil {
		return nil, fmt.Errorf("failed to create pacer: %w", err)
	}
	i.Add(pacer)
	
	// Add report interceptor for stats
	reportInterceptor, err := report.NewSenderInterceptor()
	if err != nil {
		return nil, fmt.Errorf("failed to create report interceptor: %w", err)
	}
	i.Add(reportInterceptor)

	// Create API
	api := webrtc.NewAPI(
		webrtc.WithMediaEngine(m),
		webrtc.WithInterceptorRegistry(i),
	)

	return &SFU{
		rooms:  make(map[string]*Room),
		api:    api,
		config: config,
	}, nil
}

// HandleWebSocket handles a new WebSocket connection
func (s *SFU) HandleWebSocket(wsConn *websocket.Conn, peerID, peerName string) error {
	peer := &Peer{
		id:          peerID,
		name:        peerName,
		wsConn:      wsConn,
		tracks:      make(map[string]*webrtc.TrackLocalStaticRTP),
		subscribers: make(map[string]*webrtc.TrackLocalStaticRTP),
	}

	// Start WebSocket read loop
	go s.readPump(peer)

	return nil
}

// readPump reads messages from WebSocket
func (s *SFU) readPump(peer *Peer) {
	defer func() {
		peer.wsConn.Close()
		s.removePeer(peer)
	}()

	peer.wsConn.SetReadLimit(65536)
	peer.wsConn.SetReadDeadline(time.Now().Add(60 * time.Second))
	peer.wsConn.SetPongHandler(func(string) error {
		peer.wsConn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := peer.wsConn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("[SFU] WebSocket error from %s: %v", peer.id, err)
			}
			break
		}

		var msg SignalMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("[SFU] Invalid message from %s: %v", peer.id, err)
			continue
		}

		msg.From = peer.id
		msg.Timestamp = time.Now()

		s.handleMessage(peer, msg)
	}
}

// handleMessage processes incoming messages
func (s *SFU) handleMessage(peer *Peer, msg SignalMessage) {
	switch msg.Type {
	case "join":
		s.handleJoin(peer, msg)
	case "leave":
		s.handleLeave(peer, msg)
	case "offer":
		s.handleOffer(peer, msg)
	case "answer":
		s.handleAnswer(peer, msg)
	case "ice-candidate":
		s.handleICECandidate(peer, msg)
	default:
		log.Printf("[SFU] Unknown message type: %s", msg.Type)
	}
}

// handleJoin handles peer joining a room
func (s *SFU) handleJoin(peer *Peer, msg SignalMessage) {
	roomID := msg.RoomID
	if roomID == "" {
		return
	}

	// Create or get room
	s.mu.Lock()
	room, exists := s.rooms[roomID]
	if !exists {
		room = &Room{
			id:    roomID,
			peers: make(map[string]*Peer),
		}
		s.rooms[roomID] = room
		log.Printf("[SFU] Created room %s", roomID)
	}
	s.mu.Unlock()

	// Add peer to room
	room.mu.Lock()
	peer.room = room
	room.peers[peer.id] = peer
	room.mu.Unlock()

	// Create PeerConnection
	pc, err := s.createPeerConnection(peer)
	if err != nil {
		log.Printf("[SFU] Failed to create PeerConnection for %s: %v", peer.id, err)
		return
	}

	peer.mu.Lock()
	peer.conn = pc
	peer.mu.Unlock()

	// Notify room about new peer
	s.broadcastToRoom(room, SignalMessage{
		Type:      "peer-joined",
		RoomID:    roomID,
		From:      peer.id,
		Payload:   mustMarshal(map[string]string{"peerId": peer.id, "name": peer.name}),
		Timestamp: time.Now(),
	}, peer.id)

	log.Printf("[SFU] Peer %s (%s) joined room %s", peer.id, peer.name, roomID)
}

// handleLeave handles peer leaving a room
func (s *SFU) handleLeave(peer *Peer, msg SignalMessage) {
	s.removePeer(peer)
}

// handleOffer handles SDP offer
func (s *SFU) handleOffer(peer *Peer, msg SignalMessage) {
	peer.mu.RLock()
	pc := peer.conn
	peer.mu.RUnlock()

	if pc == nil {
		log.Printf("[SFU] No PeerConnection for peer %s", peer.id)
		return
	}

	var offer webrtc.SessionDescription
	if err := json.Unmarshal(msg.Payload, &offer); err != nil {
		log.Printf("[SFU] Failed to unmarshal offer: %v", err)
		return
	}

	if err := pc.SetRemoteDescription(offer); err != nil {
		log.Printf("[SFU] Failed to set remote description: %v", err)
		return
	}

	answer, err := pc.CreateAnswer(nil)
	if err != nil {
		log.Printf("[SFU] Failed to create answer: %v", err)
		return
	}

	if err := pc.SetLocalDescription(answer); err != nil {
		log.Printf("[SFU] Failed to set local description: %v", err)
		return
	}

	// Send answer back to peer
	s.sendToPeer(peer, SignalMessage{
		Type:      "answer",
		RoomID:    peer.room.id,
		From:      "sfu",
		Payload:   mustMarshal(answer),
		Timestamp: time.Now(),
	})
}

// handleAnswer handles SDP answer
func (s *SFU) handleAnswer(peer *Peer, msg SignalMessage) {
	peer.mu.RLock()
	pc := peer.conn
	peer.mu.RUnlock()

	if pc == nil {
		return
	}

	var answer webrtc.SessionDescription
	if err := json.Unmarshal(msg.Payload, &answer); err != nil {
		log.Printf("[SFU] Failed to unmarshal answer: %v", err)
		return
	}

	if err := pc.SetRemoteDescription(answer); err != nil {
		log.Printf("[SFU] Failed to set remote description: %v", err)
	}
}

// handleICECandidate handles ICE candidate
func (s *SFU) handleICECandidate(peer *Peer, msg SignalMessage) {
	peer.mu.RLock()
	pc := peer.conn
	peer.mu.RUnlock()

	if pc == nil {
		return
	}

	var candidate webrtc.ICECandidateInit
	if err := json.Unmarshal(msg.Payload, &candidate); err != nil {
		log.Printf("[SFU] Failed to unmarshal ICE candidate: %v", err)
		return
	}

	if err := pc.AddICECandidate(candidate); err != nil {
		log.Printf("[SFU] Failed to add ICE candidate: %v", err)
	}
}

// createPeerConnection creates a new PeerConnection for a peer
func (s *SFU) createPeerConnection(peer *Peer) (*webrtc.PeerConnection, error) {
	config := webrtc.Configuration{
		ICEServers: s.config.ICEServers,
	}

	pc, err := s.api.NewPeerConnection(config)
	if err != nil {
		return nil, err
	}

	// Handle incoming tracks
	pc.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		log.Printf("[SFU] Peer %s sent track: %s (%s)", peer.id, track.ID(), track.Codec().MimeType)

		// Create local track for forwarding
		localTrack, err := webrtc.NewTrackLocalStaticRTP(
			track.Codec().RTPCodecCapability,
			track.ID(),
			track.StreamID(),
		)
		if err != nil {
			log.Printf("[SFU] Failed to create local track: %v", err)
			return
		}

		// Store track
		peer.mu.Lock()
		peer.tracks[track.ID()] = localTrack
		peer.mu.Unlock()

		// Forward to all other peers in room
		peer.room.mu.RLock()
		for _, otherPeer := range peer.room.peers {
			if otherPeer.id == peer.id {
				continue
			}

			sender, err := otherPeer.conn.AddTrack(localTrack)
			if err != nil {
				log.Printf("[SFU] Failed to add track to peer %s: %v", otherPeer.id, err)
				continue
			}

			// Read RTCP to allow sender to send PLI/FIR
			go s.readRTCP(otherPeer, sender)

			// Store subscriber track
			otherPeer.mu.Lock()
			otherPeer.subscribers[peer.id] = localTrack
			otherPeer.mu.Unlock()
		}
		peer.room.mu.RUnlock()

		// Read RTP packets and write to local track
		go s.forwardRTP(peer, track, localTrack)
	})

	// Handle ICE candidates
	pc.OnICECandidate(func(c *webrtc.ICECandidate) {
		if c == nil {
			return
		}

		candidate := c.ToJSON()
		s.sendToPeer(peer, SignalMessage{
			Type:      "ice-candidate",
			RoomID:    peer.room.id,
			From:      "sfu",
			Payload:   mustMarshal(candidate),
			Timestamp: time.Now(),
		})
	})

	// Handle connection state
	pc.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		log.Printf("[SFU] Peer %s connection state: %s", peer.id, state)
		
		if state == webrtc.PeerConnectionStateFailed || state == webrtc.PeerConnectionStateClosed {
			s.removePeer(peer)
		}
	})

	return pc, nil
}

// forwardRTP forwards RTP packets from remote track to local track
func (s *SFU) forwardRTP(peer *Peer, remoteTrack *webrtc.TrackRemote, localTrack *webrtc.TrackLocalStaticRTP) {
	buf := make([]byte, 1500)
	for {
		n, _, err := remoteTrack.Read(buf)
		if err != nil {
			if err == webrtc.ErrClosedPipe {
				return
			}
			log.Printf("[SFU] Error reading RTP from %s: %v", peer.id, err)
			return
		}

		if _, err := localTrack.Write(buf[:n]); err != nil {
			log.Printf("[SFU] Error writing RTP: %v", err)
		}
	}
}

// readRTCP reads RTCP packets for sender
func (s *SFU) readRTCP(peer *Peer, sender *webrtc.RTPSender) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[SFU] Panic in readRTCP: %v", r)
		}
	}()

	for {
		_, _, err := sender.ReadRTCP()
		if err != nil {
			return
		}
	}
}

// removePeer removes a peer from the system
func (s *SFU) removePeer(peer *Peer) {
	peer.mu.Lock()
	if peer.closed {
		peer.mu.Unlock()
		return
	}
	peer.closed = true
	
	if peer.conn != nil {
		peer.conn.Close()
	}
	if peer.wsConn != nil {
		peer.wsConn.Close()
	}
	peer.mu.Unlock()

	if peer.room != nil {
		peer.room.mu.Lock()
		delete(peer.room.peers, peer.id)
		
		// Notify room about peer leaving
		s.broadcastToRoom(peer.room, SignalMessage{
			Type:      "peer-left",
			RoomID:    peer.room.id,
			From:      peer.id,
			Timestamp: time.Now(),
		}, peer.id)
		
		// Clean up if room is empty
		if len(peer.room.peers) == 0 {
			s.mu.Lock()
			delete(s.rooms, peer.room.id)
			s.mu.Unlock()
			log.Printf("[SFU] Room %s closed (empty)", peer.room.id)
		}
		peer.room.mu.Unlock()
	}

	log.Printf("[SFU] Peer %s removed", peer.id)
}

// broadcastToRoom sends a message to all peers in a room
func (s *SFU) broadcastToRoom(room *Room, msg SignalMessage, excludePeerID string) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	room.mu.RLock()
	defer room.mu.RUnlock()

	for _, peer := range room.peers {
		if peer.id == excludePeerID {
			continue
		}
		s.sendToPeer(peer, msg)
	}
}

// sendToPeer sends a message to a specific peer
func (s *SFU) sendToPeer(peer *Peer, msg SignalMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	peer.mu.RLock()
	wsConn := peer.wsConn
	peer.mu.RUnlock()

	if wsConn == nil {
		return
	}

	wsConn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	if err := wsConn.WriteMessage(websocket.TextMessage, data); err != nil {
		log.Printf("[SFU] Failed to send to peer %s: %v", peer.id, err)
	}
}

// GetRoomStats returns statistics about a room
func (s *SFU) GetRoomStats(roomID string) map[string]interface{} {
	s.mu.RLock()
	room, exists := s.rooms[roomID]
	s.mu.RUnlock()

	if !exists {
		return nil
	}

	room.mu.RLock()
	defer room.mu.RUnlock()

	peers := make([]map[string]interface{}, 0, len(room.peers))
	for _, peer := range room.peers {
		peers = append(peers, map[string]interface{}{
			"id":   peer.id,
			"name": peer.name,
		})
	}

	return map[string]interface{}{
		"roomId":    roomID,
		"peerCount": len(room.peers),
		"peers":     peers,
	}
}

// mustMarshal marshals to JSON or panics
func mustMarshal(v interface{}) json.RawMessage {
	data, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return data
}
