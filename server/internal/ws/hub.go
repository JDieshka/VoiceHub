package ws

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"voicehub-server/internal/models"
)

// Client represents a single WebSocket connection
type Client struct {
	ID       string
	Name     string
	Avatar   string
	Conn     *websocket.Conn
	Send     chan []byte
	Hub      *Hub
	ChannelID string
	mu       sync.RWMutex
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	// Registered clients
	clients map[string]*Client

	// Channel -> set of client IDs
	channels map[string]map[string]bool

	// Register requests from the clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Broadcast messages to specific channels
	broadcast chan BroadcastMessage

	mu sync.RWMutex
}

// BroadcastMessage represents a message to be sent to specific recipients
type BroadcastMessage struct {
	ChannelID  string
	Data       []byte
	ExcludeIDs []string // client IDs to exclude
	TargetIDs  []string // if set, only send to these IDs
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]*Client),
		channels:   make(map[string]map[string]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan BroadcastMessage, 256),
	}
}

// Register registers a client with the hub (non-blocking)
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.ID] = client
			h.mu.Unlock()
			log.Printf("[Hub] Client registered: %s (%s)", client.Name, client.ID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.ID]; ok {
				delete(h.clients, client.ID)
				close(client.Send)

				// Remove from channel if in one
				client.mu.RLock()
				channelID := client.ChannelID
				client.mu.RUnlock()

				if channelID != "" {
					h.removeFromChannel(channelID, client.ID)
					h.broadcastChannelUpdate(channelID)
				}
			}
			h.mu.Unlock()
			log.Printf("[Hub] Client unregistered: %s", client.ID)

		case msg := <-h.broadcast:
			h.mu.RLock()
			if msg.TargetIDs != nil {
				// Send to specific targets
				for _, id := range msg.TargetIDs {
					if client, ok := h.clients[id]; ok {
						select {
						case client.Send <- msg.Data:
						default:
							// Client buffer full, skip
						}
					}
				}
			} else {
				// Broadcast to channel
				if channelClients, ok := h.channels[msg.ChannelID]; ok {
					excludeSet := make(map[string]bool)
					for _, id := range msg.ExcludeIDs {
						excludeSet[id] = true
					}

					for clientID := range channelClients {
						if excludeSet[clientID] {
							continue
						}
						if client, ok := h.clients[clientID]; ok {
							select {
							case client.Send <- msg.Data:
							default:
								// Client buffer full, skip
							}
						}
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// JoinChannel adds a client to a voice channel
func (h *Hub) JoinChannel(channelID string, client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Remove from previous channel if any
	client.mu.Lock()
	prevChannel := client.ChannelID
	client.ChannelID = channelID
	client.mu.Unlock()

	if prevChannel != "" && prevChannel != channelID {
		h.removeFromChannelLocked(prevChannel, client.ID)
	}

	// Add to new channel
	if h.channels[channelID] == nil {
		h.channels[channelID] = make(map[string]bool)
	}
	h.channels[channelID][client.ID] = true

	log.Printf("[Hub] Client %s joined channel %s", client.ID, channelID)
}

// LeaveChannel removes a client from a voice channel
func (h *Hub) LeaveChannel(channelID string, clientID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.removeFromChannelLocked(channelID, clientID)
}

func (h *Hub) removeFromChannel(channelID string, clientID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.removeFromChannelLocked(channelID, clientID)
}

func (h *Hub) removeFromChannelLocked(channelID string, clientID string) {
	if channelClients, ok := h.channels[channelID]; ok {
		delete(channelClients, clientID)
		if len(channelClients) == 0 {
			delete(h.channels, channelID)
		}
	}
	log.Printf("[Hub] Client %s left channel %s", clientID, channelID)
}

// GetChannelUsers returns all users in a channel
func (h *Hub) GetChannelUsers(channelID string) []models.User {
	h.mu.RLock()
	defer h.mu.RUnlock()

	var users []models.User
	if channelClients, ok := h.channels[channelID]; ok {
		for clientID := range channelClients {
			if client, ok := h.clients[clientID]; ok {
				users = append(users, models.User{
					ID:     client.ID,
					Name:   client.Name,
					Avatar: client.Avatar,
				})
			}
		}
	}
	return users
}

// GetChannelClientIDs returns all client IDs in a channel
func (h *Hub) GetChannelClientIDs(channelID string) []string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	var ids []string
	if channelClients, ok := h.channels[channelID]; ok {
		for id := range channelClients {
			ids = append(ids, id)
		}
	}
	return ids
}

// broadcastChannelUpdate sends the updated channel state to all channel members
func (h *Hub) broadcastChannelUpdate(channelID string) {
	users := h.GetChannelUsers(channelID)

	update := models.SignalMessage{
		Type:      models.MsgChannelUpdate,
		ChannelID: channelID,
		Timestamp: time.Now(),
	}

	payload, _ := json.Marshal(users)
	update.Payload = payload

	data, _ := json.Marshal(update)

	h.broadcast <- BroadcastMessage{
		ChannelID: channelID,
		Data:      data,
	}
}

// BroadcastToChannel sends a message to all clients in a channel
func (h *Hub) BroadcastToChannel(channelID string, data []byte, excludeID string) {
	h.broadcast <- BroadcastMessage{
		ChannelID:  channelID,
		Data:       data,
		ExcludeIDs: []string{excludeID},
	}
}

// SendToClient sends a message to a specific client
func (h *Hub) SendToClient(clientID string, data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if client, ok := h.clients[clientID]; ok {
		select {
		case client.Send <- data:
		default:
			log.Printf("[Hub] Failed to send to client %s: buffer full", clientID)
		}
	}
}

// RelaySignal relays a WebRTC signal from one client to another
func (h *Hub) RelaySignal(msg models.SignalMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("[Hub] Failed to marshal signal: %v", err)
		return
	}

	if msg.To != "" {
		h.SendToClient(msg.To, data)
	} else if msg.ChannelID != "" {
		h.BroadcastToChannel(msg.ChannelID, data, msg.From)
	}
}

// NewClient creates a new client
func NewClient(hub *Hub, conn *websocket.Conn, id, name, avatar string) *Client {
	return &Client{
		ID:     id,
		Name:   name,
		Avatar: avatar,
		Conn:   conn,
		Send:   make(chan []byte, 256),
		Hub:    hub,
	}
}

// ReadPump pumps messages from the WebSocket connection to the hub
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(65536) // 64KB max message size
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("[WS] Read error from %s: %v", c.ID, err)
			}
			break
		}

		var msg models.SignalMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("[WS] Invalid message from %s: %v", c.ID, err)
			continue
		}

		msg.From = c.ID
		msg.Timestamp = time.Now()

		c.Hub.HandleMessage(c, msg)
	}
}

// WritePump pumps messages from the hub to the WebSocket connection
func (c *Client) WritePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// HandleMessage processes incoming messages from clients
func (h *Hub) HandleMessage(client *Client, msg models.SignalMessage) {
	switch msg.Type {
	case models.MsgJoin:
		h.handleJoin(client, msg)
	case models.MsgLeave:
		h.handleLeave(client, msg)
	case models.MsgOffer, models.MsgAnswer, models.MsgICECandidate:
		h.RelaySignal(msg)
	case models.MsgMuteToggle, models.MsgDeafToggle, models.MsgStreamToggle:
		h.broadcastChannelUpdate(msg.ChannelID)
	case models.MsgTextMessage:
		// Relay text messages to all in channel
		data, _ := json.Marshal(msg)
		h.BroadcastToChannel(msg.ChannelID, data, "")
	default:
		log.Printf("[Hub] Unknown message type: %s", msg.Type)
	}
}

func (h *Hub) handleJoin(client *Client, msg models.SignalMessage) {
	if msg.ChannelID == "" {
		return
	}

	var payload models.JoinPayload
	if msg.Payload != nil {
		json.Unmarshal(msg.Payload, &payload)
	}

	// Update client info
	if payload.User.Name != "" {
		client.Name = payload.User.Name
	}
	if payload.User.Avatar != "" {
		client.Avatar = payload.User.Avatar
	}

	h.JoinChannel(msg.ChannelID, client)

	// Send welcome with current channel state
	users := h.GetChannelUsers(msg.ChannelID)
	welcome := models.SignalMessage{
		Type:      models.MsgWelcome,
		ChannelID: msg.ChannelID,
		Timestamp: time.Now(),
	}
	payloadData, _ := json.Marshal(users)
	welcome.Payload = payloadData
	data, _ := json.Marshal(welcome)
	h.SendToClient(client.ID, data)

	// Notify others about new user
	joinMsg := models.SignalMessage{
		Type:      models.MsgUserJoined,
		ChannelID: msg.ChannelID,
		From:      client.ID,
		Timestamp: time.Now(),
	}
	userData, _ := json.Marshal(models.User{
		ID:     client.ID,
		Name:   client.Name,
		Avatar: client.Avatar,
	})
	joinMsg.Payload = userData
	joinData, _ := json.Marshal(joinMsg)
	h.BroadcastToChannel(msg.ChannelID, joinData, client.ID)

	// Broadcast updated channel state
	h.broadcastChannelUpdate(msg.ChannelID)
}

func (h *Hub) handleLeave(client *Client, msg models.SignalMessage) {
	client.mu.RLock()
	channelID := client.ChannelID
	client.mu.RUnlock()

	if channelID == "" {
		if msg.ChannelID != "" {
			channelID = msg.ChannelID
		} else {
			return
		}
	}

	h.LeaveChannel(channelID, client.ID)

	client.mu.Lock()
	client.ChannelID = ""
	client.mu.Unlock()

	// Notify others
	leaveMsg := models.SignalMessage{
		Type:      models.MsgUserLeft,
		ChannelID: channelID,
		From:      client.ID,
		Timestamp: time.Now(),
	}
	leaveData, _ := json.Marshal(leaveMsg)
	h.BroadcastToChannel(channelID, leaveData, client.ID)

	// Broadcast updated channel state
	h.broadcastChannelUpdate(channelID)
}
