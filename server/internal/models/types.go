package models

import (
	"encoding/json"
	"time"
)

// WSUser represents a connected user in WebSocket
type WSUser struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Avatar   string `json:"avatar"`
	IsMuted  bool   `json:"isMuted"`
	IsDeaf   bool   `json:"isDeaf"`
	IsStream bool   `json:"isStreaming"`
}

// ChannelState represents the current state of a voice channel
type ChannelState struct {
	ID    string   `json:"id"`
	Name  string   `json:"name"`
	Users []WSUser `json:"users"`
}

// SignalMessage is the envelope for all WebSocket messages
type SignalMessage struct {
	Type      string          `json:"type"`
	ChannelID string          `json:"channelId,omitempty"`
	From      string          `json:"from,omitempty"`
	To        string          `json:"to,omitempty"`
	Payload   json.RawMessage `json:"payload,omitempty"`
	Timestamp time.Time       `json:"timestamp"`
}

// Message types
const (
	// Client -> Server
	MsgJoin            = "join"
	MsgLeave           = "leave"
	MsgOffer           = "offer"
	MsgAnswer          = "answer"
	MsgICECandidate    = "ice-candidate"
	MsgMuteToggle      = "mute-toggle"
	MsgDeafToggle      = "deaf-toggle"
	MsgStreamToggle    = "stream-toggle"
	MsgTextMessage     = "text-message"

	// Server -> Client
	MsgChannelUpdate   = "channel-update"
	MsgUserJoined      = "user-joined"
	MsgUserLeft        = "user-left"
	MsgError           = "error"
	MsgWelcome         = "welcome"
)

// JoinPayload is sent when a user joins a voice channel
type JoinPayload struct {
	User WSUser `json:"user"`
}

// LeavePayload is sent when a user leaves
type LeavePayload struct {
	UserID string `json:"userId"`
}

// SDPPayload carries WebRTC session description
type SDPPayload struct {
	SDP  string `json:"sdp"`
	Type string `json:"type"` // "offer" or "answer"
}

// ICEPayload carries an ICE candidate
type ICEPayload struct {
	Candidate     string `json:"candidate"`
	SDPMLineIndex int    `json:"sdpMLineIndex"`
	SDPMid        string `json:"sdpMid"`
}

// TextMessagePayload for text chat
type TextMessagePayload struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	UserName  string    `json:"userName"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
}

// ErrorResponse for error messages
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
