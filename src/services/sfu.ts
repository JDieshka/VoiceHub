/**
 * SFU Client - connects to SFU server for media forwarding
 * Uses WebRTC to send/receive media through the SFU
 */

import { audioService } from './audio';

interface SFUConfig {
  serverUrl: string;
  iceServers?: RTCIceServer[];
}

interface PeerStats {
  bitrate: number;
  packetsLost: number;
  jitter: number;
  roundTripTime: number;
  audioLevel: number;
  codec: string;
}

type SFUEventCallback = (...args: any[]) => void;

class SFUClient {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private remoteStreams: Map<string, MediaStream> = new Map();
  private peerId: string;
  private peerName: string;
  private roomId: string | null = null;
  private config: SFUConfig;
  private eventHandlers: Map<string, SFUEventCallback[]> = new Map();
  private statsInterval: ReturnType<typeof setInterval> | null = null;
  private isConnected = false;

  constructor(config: SFUConfig) {
    this.config = config;
    this.peerId = localStorage.getItem('voicehub-peerId') || `peer-${Date.now()}`;
    localStorage.setItem('voicehub-peerId', this.peerId);
    this.peerName = localStorage.getItem('voicehub-peerName') || 'User';
  }

  /**
   * Connect to SFU server
   */
  async connect(roomId: string): Promise<boolean> {
    this.roomId = roomId;

    return new Promise((resolve) => {
      const url = `${this.config.serverUrl}?peerId=${this.peerId}&peerName=${encodeURIComponent(this.peerName)}`;
      
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('[SFU] Connected to SFU server');
          this.isConnected = true;
          this.emit('connected');
          this.joinRoom(roomId);
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            this.handleMessage(msg);
          } catch (err) {
            console.error('[SFU] Failed to parse message:', err);
          }
        };

        this.ws.onclose = () => {
          console.log('[SFU] Disconnected from SFU server');
          this.isConnected = false;
          this.emit('disconnected');
          resolve(false);
        };

        this.ws.onerror = (err) => {
          console.error('[SFU] WebSocket error:', err);
          resolve(false);
        };
      } catch (err) {
        console.error('[SFU] Connection failed:', err);
        resolve(false);
      }
    });
  }

  /**
   * Disconnect from SFU
   */
  disconnect() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }

    this.remoteStreams.clear();
    this.roomId = null;
    this.isConnected = false;
  }

  /**
   * Join a room
   */
  private async joinRoom(roomId: string) {
    this.send({
      type: 'join',
      roomId,
    });

    // Initialize local media
    await this.initLocalMedia();
    
    // Create PeerConnection
    await this.createPeerConnection();
    
    // Create offer
    await this.createOffer();
  }

  /**
   * Initialize local media (microphone)
   */
  private async initLocalMedia() {
    try {
      this.localStream = await audioService.initMicrophone();
      console.log('[SFU] Local media initialized');
    } catch (err) {
      console.error('[SFU] Failed to init local media:', err);
    }
  }

  /**
   * Create PeerConnection
   */
  private async createPeerConnection() {
    const config: RTCConfiguration = {
      iceServers: this.config.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    };

    this.pc = new RTCPeerConnection(config);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.pc!.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming tracks
    this.pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        // Use track ID as peer identifier for SFU
        const peerId = event.track.id;
        this.remoteStreams.set(peerId, stream);
        this.emit('remotestream', peerId, stream);
        console.log(`[SFU] Received remote stream: ${peerId}`);
      }
    };

    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.send({
          type: 'ice-candidate',
          roomId: this.roomId,
          payload: event.candidate.toJSON(),
        });
      }
    };

    // Handle connection state
    this.pc.onconnectionstatechange = () => {
      console.log(`[SFU] Connection state: ${this.pc?.connectionState}`);
      this.emit('connectionstate', this.pc?.connectionState);
    };

    // Start stats collection
    this.startStatsCollection();
  }

  /**
   * Create and send offer
   */
  private async createOffer() {
    if (!this.pc) return;

    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await this.pc.setLocalDescription(offer);

    this.send({
      type: 'offer',
      roomId: this.roomId,
      payload: offer,
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(msg: any) {
    switch (msg.type) {
      case 'answer':
        this.handleAnswer(msg);
        break;
      case 'ice-candidate':
        this.handleICECandidate(msg);
        break;
      case 'peer-joined':
        this.emit('peerjoined', msg.payload);
        break;
      case 'peer-left':
        this.emit('peerleft', msg.from);
        break;
      default:
        console.log('[SFU] Unknown message type:', msg.type);
    }
  }

  /**
   * Handle SDP answer
   */
  private async handleAnswer(msg: any) {
    if (!this.pc) return;

    const answer = new RTCSessionDescription(msg.payload);
    await this.pc.setRemoteDescription(answer);
    console.log('[SFU] Set remote description (answer)');
  }

  /**
   * Handle ICE candidate
   */
  private async handleICECandidate(msg: any) {
    if (!this.pc) return;

    const candidate = new RTCIceCandidate(msg.payload);
    await this.pc.addIceCandidate(candidate);
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<MediaStream> {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      // Add screen tracks to PeerConnection
      if (this.pc) {
        this.screenStream.getTracks().forEach(track => {
          this.pc!.addTrack(track, this.screenStream!);
        });
      }

      this.screenStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };

      console.log('[SFU] Screen share started');
      return this.screenStream;
    } catch (err) {
      console.error('[SFU] Screen share failed:', err);
      throw err;
    }
  }

  /**
   * Stop screen sharing
   */
  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => {
        track.stop();
        // Remove track from PeerConnection
        if (this.pc) {
          const sender = this.pc.getSenders().find(s => s.track === track);
          if (sender) {
            this.pc.removeTrack(sender);
          }
        }
      });
      this.screenStream = null;
      console.log('[SFU] Screen share stopped');
    }
  }

  /**
   * Toggle mute
   */
  toggleMute(): boolean {
    return audioService.toggleMute();
  }

  /**
   * Start stats collection
   */
  private startStatsCollection() {
    this.statsInterval = setInterval(async () => {
      if (!this.pc) return;

      try {
        const stats = await this.pc.getStats();
        const peerStats: PeerStats = {
          bitrate: 0,
          packetsLost: 0,
          jitter: 0,
          roundTripTime: 0,
          audioLevel: 0,
          codec: 'Opus',
        };

        stats.forEach((report) => {
          if (report.type === 'outbound-rtp' && report.kind === 'audio') {
            peerStats.bitrate = Math.round((report.bytesSent * 8) / 1000);
          }
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            peerStats.packetsLost = report.packetsLost || 0;
            peerStats.jitter = report.jitter ? Math.round(report.jitter * 1000) : 0;
            peerStats.audioLevel = report.audioLevel ? Math.round(report.audioLevel * 100) : 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            peerStats.roundTripTime = report.currentRoundTripTime 
              ? Math.round(report.currentRoundTripTime * 1000) 
              : 0;
          }
        });

        this.emit('stats', peerStats);
      } catch (err) {
        // Ignore stats errors
      }
    }, 1000);
  }

  /**
   * Send message to SFU server
   */
  private send(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  /**
   * Event handling
   */
  on(event: string, callback: SFUEventCallback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
  }

  off(event: string, callback: SFUEventCallback) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const idx = handlers.indexOf(callback);
      if (idx !== -1) handlers.splice(idx, 1);
    }
  }

  private emit(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(h => h(...args));
    }
  }

  // Getters
  getIsConnected(): boolean {
    return this.isConnected;
  }

  getPeerId(): string {
    return this.peerId;
  }

  getRemoteStreams(): Map<string, MediaStream> {
    return new Map(this.remoteStreams);
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRoomId(): string | null {
    return this.roomId;
  }
}

// Singleton instance
const sfuUrl = (import.meta as any).env?.VITE_SFU_URL || 'ws://31.77.158.177:8080/sfu';
export const sfuClient = new SFUClient({
  serverUrl: sfuUrl,
});

export default sfuClient;
