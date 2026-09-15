import { wsService } from './websocket';
import { audioService } from './audio';

// ICE servers for NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // TURN серверы для случаев когда STUN не работает
    // { urls: 'turn:openrelay.metered.ca:80', username: '...', credential: '...' },
  ],
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

interface PeerConnection {
  pc: RTCPeerConnection;
  userId: string;
  userName?: string;
  audioStream?: MediaStream;
  videoStream?: MediaStream;
  stats?: PeerStats;
  createdAt: number;
}

interface PeerStats {
  bitrate: number;
  packetsLost: number;
  jitter: number;
  roundTripTime: number;
  audioLevel: number;
  codec: string;
  bytesSent: number;
  bytesReceived: number;
}

type PeerEventCallback = (userId: string, peer: PeerConnection) => void;

class WebRTCService {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  private channelId: string | null = null;
  private isMuted = false;
  private isDeafened = false;
  
  // Callbacks
  private onRemoteStream?: (userId: string, stream: MediaStream, type: 'audio' | 'video') => void;
  private onRemoteStreamRemoved?: (userId: string, type: 'audio' | 'video') => void;
  private onPeerConnected?: (userId: string) => void;
  private onPeerDisconnected?: (userId: string) => void;
  private onStatsUpdate?: (userId: string, stats: PeerStats) => void;
  private onConnectionStateChange?: (userId: string, state: RTCPeerConnectionState) => void;
  
  // Stats collection
  private statsInterval: ReturnType<typeof setInterval> | null = null;
  private lastBytesSent: Map<string, number> = new Map();
  private lastBytesReceived: Map<string, number> = new Map();

  constructor() {
    this.setupSignalHandlers();
  }

  private setupSignalHandlers() {
    wsService.on('offer', (msg) => this.handleOffer(msg));
    wsService.on('answer', (msg) => this.handleAnswer(msg));
    wsService.on('ice-candidate', (msg) => this.handleICECandidate(msg));
    wsService.on('user-joined', (msg) => this.handleUserJoined(msg));
    wsService.on('user-left', (msg) => this.handleUserLeft(msg));
    wsService.on('channel-update', (msg) => this.handleChannelUpdate(msg));
  }

  // Initialize local audio stream using AudioService
  async initLocalStream(): Promise<MediaStream> {
    if (this.localStream) return this.localStream;

    try {
      this.localStream = await audioService.initMicrophone();
      console.log('[WebRTC] Local audio stream acquired via AudioService');
      return this.localStream;
    } catch (err) {
      console.error('[WebRTC] Failed to get local audio:', err);
      console.warn('[WebRTC] Microphone not available. Creating silent stream as fallback.');
      // Create silent stream as fallback
      try {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const dst = ctx.createMediaStreamDestination();
        oscillator.connect(dst);
        oscillator.start();
        this.localStream = dst.stream;
        return this.localStream;
      } catch (fallbackErr) {
        console.error('[WebRTC] Failed to create fallback stream:', fallbackErr);
        // Не выбрасываем ошибку, продолжаем без микрофона
        this.localStream = null;
        return null as any;
      }
    }
  }

  // Start screen sharing
  async startScreenShare(): Promise<MediaStream> {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
        } as any,
        audio: true,
      });

      // Add screen tracks to all peers via replaceTrack or addTrack
      this.screenStream.getTracks().forEach(track => {
        this.peers.forEach(peer => {
          const sender = peer.pc.getSenders().find(s => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          } else {
            peer.pc.addTrack(track, this.screenStream!);
          }
        });
      });

      this.screenStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };

      console.log('[WebRTC] Screen share started');
      return this.screenStream;
    } catch (err) {
      console.error('[WebRTC] Screen share failed:', err);
      throw err;
    }
  }

  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => {
        track.stop();
        // Restore audio track on peers
        this.peers.forEach(peer => {
          const sender = peer.pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            peer.pc.removeTrack(sender);
          }
        });
      });
      this.screenStream = null;
      console.log('[WebRTC] Screen share stopped');
    }
  }

  // Join a voice channel
  async joinChannel(channelId: string) {
    this.channelId = channelId;
    await this.initLocalStream();
    this.startStatsCollection();
    console.log(`[WebRTC] Joined channel ${channelId}`);
  }

  // Leave current channel
  leaveChannel() {
    this.stopStatsCollection();
    
    // Close all peer connections
    this.peers.forEach((peer, userId) => {
      peer.pc.close();
      this.onRemoteStreamRemoved?.(userId, 'audio');
      if (peer.videoStream) {
        this.onRemoteStreamRemoved?.(userId, 'video');
      }
    });
    this.peers.clear();
    this.lastBytesSent.clear();
    this.lastBytesReceived.clear();

    // Stop AudioService
    audioService.stopMonitoring();
    audioService.stopMicrophone();
    this.localStream = null;

    this.stopScreenShare();
    this.channelId = null;
    console.log('[WebRTC] Left channel');
  }

  // Create a peer connection for a new user
  private async createPeerConnection(userId: string, userName?: string): Promise<RTCPeerConnection> {
    // Close existing if any
    const existing = this.peers.get(userId);
    if (existing) {
      existing.pc.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local audio tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Add screen tracks if sharing
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => {
        pc.addTrack(track, this.screenStream!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.channelId) {
        wsService.sendICECandidate(this.channelId, userId, event.candidate);
      }
    };

    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE state with ${userId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'failed') {
        pc.restartIce();
      }
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state with ${userId}: ${pc.connectionState}`);
      this.onConnectionStateChange?.(userId, pc.connectionState);
      
      if (pc.connectionState === 'connected') {
        this.onPeerConnected?.(userId);
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.onPeerDisconnected?.(userId);
        if (pc.connectionState === 'failed') {
          this.removePeer(userId);
        }
      }
    };

    // Handle incoming tracks (audio + video)
    pc.ontrack = (event) => {
      const [track] = event.track ? [event.track] : [];
      const stream = event.streams[0];
      
      if (!track || !stream) return;

      const peer = this.peers.get(userId);
      if (!peer) return;

      if (track.kind === 'audio') {
        peer.audioStream = stream;
        this.onRemoteStream?.(userId, stream, 'audio');
        console.log(`[WebRTC] Received audio stream from ${userId}`);
      } else if (track.kind === 'video') {
        peer.videoStream = stream;
        this.onRemoteStream?.(userId, stream, 'video');
        console.log(`[WebRTC] Received video stream from ${userId}`);
      }

      // Monitor track ended
      track.onended = () => {
        console.log(`[WebRTC] Track ended from ${userId}: ${track.kind}`);
        if (track.kind === 'video') {
          peer.videoStream = undefined;
          this.onRemoteStreamRemoved?.(userId, 'video');
        }
      };
    };

    // Store peer
    this.peers.set(userId, {
      pc,
      userId,
      userName,
      createdAt: Date.now(),
    });

    return pc;
  }

  // Handle new user joining - create offer (mesh)
  private async handleUserJoined(msg: any) {
    if (!this.channelId) return;
    const userId = msg.from;
    if (!userId || userId === wsService.getUserId()) return;

    // Don't create offer if we already have a connection
    if (this.peers.has(userId)) return;

    console.log(`[WebRTC] User joined: ${userId}, creating offer`);

    const pc = await this.createPeerConnection(userId, msg.payload?.user?.name);

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pc.setLocalDescription(offer);
    wsService.sendOffer(this.channelId, userId, offer);
  }

  // Handle incoming offer
  private async handleOffer(msg: any) {
    if (!this.channelId) return;
    const userId = msg.from;
    if (!userId) return;

    console.log(`[WebRTC] Received offer from ${userId}`);

    let peer = this.peers.get(userId);
    if (!peer) {
      const pc = await this.createPeerConnection(userId);
      peer = this.peers.get(userId)!;
    }

    const { sdp, type } = msg.payload;
    
    // Handle re-offer
    if (peer.pc.signalingState === 'have-local-offer') {
      console.log(`[WebRTC] Already have local offer from ${userId}, skipping`);
      return;
    }

    await peer.pc.setRemoteDescription(new RTCSessionDescription({ sdp, type }));

    const answer = await peer.pc.createAnswer();
    await peer.pc.setLocalDescription(answer);
    wsService.sendAnswer(this.channelId, userId, answer);
  }

  // Handle incoming answer
  private async handleAnswer(msg: any) {
    const userId = msg.from;
    if (!userId) return;

    const peer = this.peers.get(userId);
    if (!peer) return;

    console.log(`[WebRTC] Received answer from ${userId}`);

    const { sdp, type } = msg.payload;
    
    if (peer.pc.signalingState !== 'have-local-offer') {
      console.log(`[WebRTC] Unexpected answer from ${userId}, state: ${peer.pc.signalingState}`);
      return;
    }
    
    await peer.pc.setRemoteDescription(new RTCSessionDescription({ sdp, type }));
  }

  // Handle ICE candidate
  private async handleICECandidate(msg: any) {
    const userId = msg.from;
    if (!userId) return;

    const peer = this.peers.get(userId);
    if (!peer) return;

    try {
      const { candidate, sdpMLineIndex, sdpMid } = msg.payload;
      if (!candidate) return;
      
      await peer.pc.addIceCandidate(
        new RTCIceCandidate({ candidate, sdpMLineIndex, sdpMid })
      );
    } catch (err) {
      console.error(`[WebRTC] Failed to add ICE candidate from ${userId}:`, err);
    }
  }

  // Handle user leaving
  private handleUserLeft(msg: any) {
    const userId = msg.from;
    if (!userId) return;
    this.removePeer(userId);
  }

  // Handle channel update
  private handleChannelUpdate(msg: any) {
    // Sync peer list with server state
    if (!msg.payload) return;
    const users: Array<{id: string; name: string}> = msg.payload;
    const currentUserId = wsService.getUserId();
    
    // Remove peers that are no longer in channel
    this.peers.forEach((peer, userId) => {
      if (userId === currentUserId) return;
      if (!users.find(u => u.id === userId)) {
        this.removePeer(userId);
      }
    });
  }

  private removePeer(userId: string) {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.pc.close();
      this.peers.delete(userId);
      this.lastBytesSent.delete(userId);
      this.lastBytesReceived.delete(userId);
      this.onRemoteStreamRemoved?.(userId, 'audio');
      if (peer.videoStream) {
        this.onRemoteStreamRemoved?.(userId, 'video');
      }
      this.onPeerDisconnected?.(userId);
      console.log(`[WebRTC] Removed peer ${userId}`);
    }
  }

  // Stats collection
  private startStatsCollection() {
    this.stopStatsCollection();
    this.statsInterval = setInterval(() => this.collectStats(), 1000);
  }

  private stopStatsCollection() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  private async collectStats() {
    for (const [userId, peer] of this.peers) {
      try {
        const report = await peer.pc.getStats();
        const stats: PeerStats = {
          bitrate: 0,
          packetsLost: 0,
          jitter: 0,
          roundTripTime: 0,
          audioLevel: 0,
          codec: 'Opus',
          bytesSent: 0,
          bytesReceived: 0,
        };

        report.forEach((stat) => {
          // Outbound audio stats
          if (stat.type === 'outbound-rtp' && stat.kind === 'audio') {
            const bytesSent = stat.bytesSent || 0;
            const lastSent = this.lastBytesSent.get(userId) || 0;
            stats.bitrate = Math.round(((bytesSent - lastSent) * 8) / 1000);
            this.lastBytesSent.set(userId, bytesSent);
            stats.bytesSent = bytesSent;
          }
          
          // Inbound audio stats
          if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
            stats.packetsLost = stat.packetsLost || 0;
            stats.jitter = stat.jitter ? Math.round(stat.jitter * 1000) : 0;
            stats.audioLevel = stat.audioLevel ? Math.round(stat.audioLevel * 100) : 0;
            
            const bytesReceived = stat.bytesReceived || 0;
            const lastReceived = this.lastBytesReceived.get(userId) || 0;
            const receiveBitrate = Math.round(((bytesReceived - lastReceived) * 8) / 1000);
            stats.bitrate = Math.max(stats.bitrate, receiveBitrate);
            this.lastBytesReceived.set(userId, bytesReceived);
            stats.bytesReceived = bytesReceived;
          }
          
          // RTT from candidate pair
          if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
            stats.roundTripTime = stat.currentRoundTripTime 
              ? Math.round(stat.currentRoundTripTime * 1000) 
              : 0;
          }

          // Codec info
          if (stat.type === 'codec' && stat.mimeType?.toLowerCase().includes('opus')) {
            stats.codec = 'Opus';
          }
        });

        peer.stats = stats;
        this.onStatsUpdate?.(userId, stats);
      } catch (err) {
        // Ignore stats errors
      }
    }
  }

  // Public API
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    audioService.setMuted(this.isMuted);
    return this.isMuted;
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  setDeafened(deafened: boolean) {
    this.isDeafened = deafened;
    // Mute all remote audio when deafened
    this.peers.forEach(peer => {
      if (peer.audioStream) {
        peer.audioStream.getAudioTracks().forEach(track => {
          // We can't directly mute remote tracks, but we can set volume to 0
        });
      }
    });
  }

  getIsDeafened(): boolean {
    return this.isDeafened;
  }

  // Callbacks
  setOnRemoteStream(cb: (userId: string, stream: MediaStream, type: 'audio' | 'video') => void) {
    this.onRemoteStream = cb;
  }

  setOnRemoteStreamRemoved(cb: (userId: string, type: 'audio' | 'video') => void) {
    this.onRemoteStreamRemoved = cb;
  }

  setOnPeerConnected(cb: (userId: string) => void) {
    this.onPeerConnected = cb;
  }

  setOnPeerDisconnected(cb: (userId: string) => void) {
    this.onPeerDisconnected = cb;
  }

  setOnStatsUpdate(cb: (userId: string, stats: PeerStats) => void) {
    this.onStatsUpdate = cb;
  }

  setOnConnectionStateChange(cb: (userId: string, state: RTCPeerConnectionState) => void) {
    this.onConnectionStateChange = cb;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  getPeerCount(): number {
    return this.peers.size;
  }

  getChannelId(): string | null {
    return this.channelId;
  }

  getPeerStats(userId: string): PeerStats | undefined {
    return this.peers.get(userId)?.stats;
  }

  getPeerConnectionState(userId: string): RTCPeerConnectionState | null {
    return this.peers.get(userId)?.pc.connectionState || null;
  }

  getAllPeers(): Map<string, PeerConnection> {
    return new Map(this.peers);
  }
}

// Singleton
export const webrtcService = new WebRTCService();
export type { PeerStats, PeerConnection };
export default webrtcService;
