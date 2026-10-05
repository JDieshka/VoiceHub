# SFU Server Guide

## Overview

VoiceHub supports two modes of operation:
- **P2P Mesh**: Direct client-to-client connections (best for 2-4 users)
- **SFU**: Server forwards media between clients (best for 5+ users)

## Running the Server

### Prerequisites

```bash
# Install Go 1.21+
# Install dependencies
cd server
go mod tidy
```

### Start Server

```bash
# P2P signaling mode (default)
go run main.go -mode=signaling

# SFU mode
go run main.go -mode=sfu

# Hybrid mode (both P2P and SFU)
go run main.go -mode=hybrid

# Custom port
go run main.go -mode=hybrid -port=9090

# With TLS
go run main.go -mode=hybrid -cert=cert.pem -key=key.pem
```

### Endpoints

- **WebSocket (P2P)**: `ws://localhost:8080/ws`
- **WebSocket (SFU)**: `ws://localhost:8080/sfu`
- **Health Check**: `http://localhost:8080/health`
- **Info**: `http://localhost:8080/`

## Architecture

### P2P Mesh (Signaling Server)

```
┌─────────┐         ┌─────────┐
│ Client A│◄───────►│ Client B│
└────┬────┘         └────┬────┘
     │                   │
     │    ┌─────────┐    │
     └───►│ Client C│◄───┘
          └─────────┘

Each client sends media to ALL other clients directly.
Signaling server only exchanges SDP/ICE, not media.
```

**Pros:**
- Lowest latency (no server in media path)
- No server bandwidth costs
- Works even if server goes down (after connection established)

**Cons:**
- O(n²) connections
- High upload bandwidth per client
- Doesn't scale beyond ~6 users

### SFU (Selective Forwarding Unit)

```
┌─────────┐      ┌─────────┐
│ Client A│─────►│         │─────►│ Client B│
└─────────┘      │   SFU   │      └─────────┘
                 │  Server │
┌─────────┐      │         │─────►│ Client C│
│ Client D│─────►│         │      └─────────┘
└─────────┘      └─────────┘

Each client sends ONE stream to server.
Server forwards it to all other clients.
```

**Pros:**
- O(n) connections
- Lower upload bandwidth per client
- Scales to 100+ users
- Server can add features (recording, moderation)

**Cons:**
- Additional latency (server in media path)
- Server bandwidth costs
- Single point of failure

## SFU Implementation Details

### Go SFU Server

Built with [Pion WebRTC](https://github.com/pion/webrtc):

```go
// Key components:
- MediaEngine: Registers codecs (Opus, VP8, H264)
- PeerConnection: WebRTC connection per client
- TrackLocalStaticRTP: Local track for forwarding
- RTP forwarding: Read from remote, write to local
```

### Media Flow

1. Client connects via WebSocket
2. Client creates PeerConnection and sends offer
3. SFU creates PeerConnection and sends answer
4. Client sends RTP packets to SFU
5. SFU reads RTP packets and writes to local tracks
6. Local tracks send RTP to other clients

### Room Management

```go
type Room struct {
    id    string
    peers map[string]*Peer
}

// Rooms are created automatically when first peer joins
// Rooms are destroyed when last peer leaves
```

## Testing

### Test P2P Mode

1. Start server: `go run main.go -mode=signaling`
2. Open frontend in 2 browser tabs
3. Join same voice channel in both tabs
4. Allow microphone access
5. Speak - audio should be heard in other tab

### Test SFU Mode

1. Start server: `go run main.go -mode=sfu`
2. Open frontend in 2 browser tabs
3. Select "SFU" mode in UI
4. Join same voice channel
5. Allow microphone access
6. Speak - audio should be heard in other tab

### Test Hybrid Mode

1. Start server: `go run main.go -mode=hybrid`
2. Open frontend
3. Select "Auto" mode
4. Join voice channel
5. System will try SFU first, fallback to P2P

## Configuration

### ICE Servers

Edit `server/main.go`:

```go
sfuServer, err := sfu.NewSFU(sfu.SFUConfig{
    ICEServers: []webrtc.ICEServer{
        {URLs: []string{"stun:stun.l.google.com:19302"}},
        // Add TURN servers for NAT traversal:
        // {
        //     URLs: []string{"turn:your-turn-server.com:3478"},
        //     Username: "username",
        //     Credential: "password",
        // },
    },
})
```

### Frontend Configuration

Edit `src/services/sfu.ts`:

```typescript
export const sfuClient = new SFUClient({
  serverUrl: `ws://${window.location.hostname}:8080/sfu`,
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // Add TURN servers here
  ],
});
```

## Monitoring

### Server Logs

```
[SFU] Peer peer-123 (User-abc) joined room vc-1
[SFU] Peer peer-123 sent track: audio-1 (audio/opus)
[SFU] Peer peer-123 connection state: connected
[SFU] Peer peer-123 removed
```

### Health Check

```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "ok",
  "service": "voicehub-server",
  "mode": "hybrid",
  "hostname": "server",
  "version": "1.1.0"
}
```

### Room Stats

```bash
curl http://localhost:8080/rooms/vc-1/stats
```

Response:
```json
{
  "roomId": "vc-1",
  "peerCount": 3,
  "peers": [
    {"id": "peer-123", "name": "Alice"},
    {"id": "peer-456", "name": "Bob"},
    {"id": "peer-789", "name": "Charlie"}
  ]
}
```

## Troubleshooting

### No Audio

1. Check browser console for WebRTC errors
2. Verify microphone permissions
3. Check server logs for peer connection state
4. Verify ICE candidates are being exchanged

### Connection Fails

1. Check if server is running: `curl http://localhost:8080/health`
2. Verify WebSocket URL is correct
3. Check firewall rules (ports 8080, 3478 for TURN)
4. Try with TURN server if behind strict NAT

### High Latency

**P2P Mode:**
- Check network quality between peers
- Consider switching to SFU for better routing

**SFU Mode:**
- Check server location (should be close to users)
- Monitor server CPU/memory usage
- Consider adding more SFU instances

### Audio Quality Issues

1. Check packet loss in connection stats
2. Verify bitrate is sufficient (32-128 kbps for Opus)
3. Check for network congestion
4. Enable/disable noise suppression in audio settings

## Production Deployment

### Docker

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o voicehub-server main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/voicehub-server .
EXPOSE 8080
CMD ["./voicehub-server", "-mode=hybrid"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: voicehub-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: voicehub
  template:
    metadata:
      labels:
        app: voicehub
    spec:
      containers:
      - name: voicehub
        image: voicehub-server:latest
        ports:
        - containerPort: 8080
        env:
        - name: MODE
          value: "hybrid"
---
apiVersion: v1
kind: Service
metadata:
  name: voicehub-service
spec:
  type: LoadBalancer
  ports:
  - port: 8080
    targetPort: 8080
  selector:
    app: voicehub
```

### Scaling

For large deployments:
- Use multiple SFU instances with load balancing
- Implement room affinity (same room → same SFU)
- Add Redis for cross-SFU room state
- Use TURN servers for NAT traversal

## Performance Benchmarks

### P2P Mesh (4 users)
- Connections: 6 (n*(n-1)/2)
- Upload per user: ~150 kbps × 3 = 450 kbps
- Latency: ~20-50ms (direct)

### SFU (4 users)
- Connections: 4 (n)
- Upload per user: ~150 kbps × 1 = 150 kbps
- Latency: ~30-70ms (via server)

### SFU (50 users)
- Connections: 50 (n)
- Upload per user: ~150 kbps × 1 = 150 kbps
- Server bandwidth: ~7.5 Mbps
- Latency: ~40-100ms (via server)

## Resources

- [Pion WebRTC Documentation](https://github.com/pion/webrtc)
- [WebRTC Basics](https://webRTC.org)
- [RFC 8825 - Overview: Real-Time Protocols for Browser-Based Applications](https://tools.ietf.org/html/rfc8825)
- [RFC 8834 - Media Transport and Use of RTP in WebRTC](https://tools.ietf.org/html/rfc8834)
