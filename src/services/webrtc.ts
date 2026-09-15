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
  ],
};

interface PeerConnection {
  pc: RTCPeerConnection;
  userId: string;
  stream?: MediaStream;
}

class WebRTCService {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  private channelId: string | null = null;
  private isMuted = false;
  private isDeafened = false;
  private onRemoteStream?: (userId: string, stream: MediaStream) => void;
  private onRemoteStreamRemoved?: (userId: string) => void;
  private onScreenStream?: (userId: string, stream: MediaStream) => void;

  constructor() {
    this.setupSignalHandlers();
  }

  private setupSignalHandlers() {
    wsService.on('offer', (msg) => this.handleOffer(msg));
    wsService.on('answer', (msg) => this.handleAnswer(msg));
    wsService.on('ice-candidate', (msg) => this.handleICECandidate(msg));
    wsService.on('user-joined', (msg) => this.handleUserJoined(msg));
    wsService.on('user-left', (msg) => this.handleUserLeft(msg));
  }

  // Initialize local audio stream using AudioService
  async initLocalStream(): Promise<MediaStream> {
    if (this.localStream) return this.localStream;

    try {
      // Use AudioService for microphone capture with full processing
      this.localStream = await audioService.initMicrophone();
      console.log('[WebRTC] Local audio stream acquired via AudioService');
      return this.localStream;
    } catch (err) {
      console.error('[WebRTC] Failed to get local audio:', err);
      // Create silent stream as fallback
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const dst = ctx.createMediaStreamDestination();
      oscillator.connect(dst);
      oscillator.start();
      this.localStream = dst.stream;
      return this.localStream;
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

      // Add screen tracks to all peers
      this.screenStream.getTracks().forEach(track => {
        this.peers.forEach(peer => {
          peer.pc.addTrack(track, this.screenStream!);
        });
      });

      // Handle stream end
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
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
      console.log('[WebRTC] Screen share stopped');
    }
  }

  // Join a voice channel
  async joinChannel(channelId: string) {
    this.channelId = channelId;
    await this.initLocalStream();
    console.log(`[WebRTC] Joined channel ${channelId}`);
  }

  // Leave current channel
  leaveChannel() {
    // Close all peer connections
    this.peers.forEach((peer, userId) => {
      peer.pc.close();
      this.onRemoteStreamRemoved?.(userId);
    });
    this.peers.clear();

    // Stop AudioService monitoring and microphone
    audioService.stopMonitoring();
    audioService.stopMicrophone();
    this.localStream = null;

    this.stopScreenShare();
    this.channelId = null;
    console.log('[WebRTC] Left channel');
  }

  // Create a peer connection for a new user
  private async createPeerConnection(userId: string): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
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

    // Handle incoming tracks
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        const isVideo = stream.getVideoTracks().length > 0;
        if (isVideo) {
          this.onScreenStream?.(userId, stream);
        } else {
          this.onRemoteStream?.(userId, stream);
        }
      }
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state with ${userId}: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.removePeer(userId);
      }
    };

    // Store peer
    this.peers.set(userId, { pc, userId });

    return pc;
  }

  // Handle new user joining - create offer
  private async handleUserJoined(msg: any) {
    if (!this.channelId) return;
    const userId = msg.from;
    if (!userId || userId === wsService.getUserId()) return;

    console.log(`[WebRTC] User joined: ${userId}, creating offer`);

    const pc = await this.createPeerConnection(userId);

    // Create and send offer
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pc.setLocalDescription(offer);
    wsService.sendOffer(this.channelId, userId, offer);
  }

  // Handle incoming offer - create answer
  private async handleOffer(msg: any) {
    if (!this.channelId) return;
    const userId = msg.from;
    if (!userId) return;

    console.log(`[WebRTC] Received offer from ${userId}`);

    let peer = this.peers.get(userId);
    if (!peer) {
      const pc = await this.createPeerConnection(userId);
      peer = { pc, userId };
    }

    const { sdp, type } = msg.payload;
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

  private removePeer(userId: string) {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.pc.close();
      this.peers.delete(userId);
      this.onRemoteStreamRemoved?.(userId);
      console.log(`[WebRTC] Removed peer ${userId}`);
    }
  }

  // Toggle mute using AudioService
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    audioService.setMuted(this.isMuted);
    return this.isMuted;
  }

  // Get mute state
  getIsMuted(): boolean {
    return this.isMuted;
  }

  // Callbacks
  setOnRemoteStream(cb: (userId: string, stream: MediaStream) => void) {
    this.onRemoteStream = cb;
  }

  setOnRemoteStreamRemoved(cb: (userId: string) => void) {
    this.onRemoteStreamRemoved = cb;
  }

  setOnScreenStream(cb: (userId: string, stream: MediaStream) => void) {
    this.onScreenStream = cb;
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
}

// Singleton
export const webrtcService = new WebRTCService();
export default webrtcService;
