import { websocketService } from './websocket';

class WebRTCService {
  private localStream: MediaStream | null = null;
  private peers: Map<string, RTCPeerConnection> = new Map();
  private onRemoteStream?: (userId: string, stream: MediaStream) => void;
  private onRemoteStreamRemoved?: (userId: string) => void;
  
  constructor() {
    this.setupWebSocketHandlers();
  }
  
  private setupWebSocketHandlers() {
    // Handle offer from other peers
    websocketService.on('offer', async (msg: any) => {
      const { from, payload } = msg;
      await this.handleOffer(from, payload);
    });
    
    // Handle answer from other peers
    websocketService.on('answer', async (msg: any) => {
      const { from, payload } = msg;
      await this.handleAnswer(from, payload);
    });
    
    // Handle ICE candidates from other peers
    websocketService.on('ice-candidate', async (msg: any) => {
      const { from, payload } = msg;
      await this.handleICECandidate(from, payload);
    });
    
    // Handle user joined
    websocketService.on('user-joined', async (msg: any) => {
      const { from } = msg;
      // Create offer to new user
      const pc = await this.createPeerConnection(from);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      websocketService.sendOffer(from, offer);
    });
    
    // Handle user left
    websocketService.on('user-left', (msg: any) => {
      const { from } = msg;
      this.removePeer(from);
    });
  }
  
  async initLocalStream(): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      console.log('[WebRTC] Local stream initialized');
      return this.localStream;
    } catch (error) {
      console.error('[WebRTC] Failed to get local stream:', error);
      throw error;
    }
  }
  
  async createPeerConnection(userId: string): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });
    
    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        websocketService.sendICECandidate(userId, event.candidate);
      }
    };
    
    // Handle remote tracks
    pc.ontrack = (event) => {
      if (this.onRemoteStream && event.streams[0]) {
        console.log('[WebRTC] Remote stream received from', userId);
        this.onRemoteStream(userId, event.streams[0]);
      }
    };
    
    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state with', userId, ':', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.removePeer(userId);
      }
    };
    
    this.peers.set(userId, pc);
    console.log('[WebRTC] Peer connection created for', userId);
    return pc;
  }
  
  async handleOffer(userId: string, offer: RTCSessionDescriptionInit) {
    console.log('[WebRTC] Handling offer from', userId);
    const pc = this.peers.get(userId) || await this.createPeerConnection(userId);
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    websocketService.sendAnswer(userId, answer);
  }
  
  async handleAnswer(userId: string, answer: RTCSessionDescriptionInit) {
    console.log('[WebRTC] Handling answer from', userId);
    const pc = this.peers.get(userId);
    if (pc) {
      await pc.setRemoteDescription(answer);
    }
  }
  
  async handleICECandidate(userId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peers.get(userId);
    if (pc) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.error('[WebRTC] Failed to add ICE candidate:', error);
      }
    }
  }
  
  setOnRemoteStream(callback: (userId: string, stream: MediaStream) => void) {
    this.onRemoteStream = callback;
  }
  
  setOnRemoteStreamRemoved(callback: (userId: string) => void) {
    this.onRemoteStreamRemoved = callback;
  }
  
  toggleMute(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        console.log('[WebRTC] Mute toggled:', !audioTrack.enabled);
        return !audioTrack.enabled;
      }
    }
    return false;
  }
  
  toggleCamera(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        console.log('[WebRTC] Camera toggled:', !videoTrack.enabled);
        return !videoTrack.enabled;
      }
    }
    return false;
  }
  
  async startScreenShare(): Promise<MediaStream> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      
      // Replace video track in all peer connections
      const screenTrack = screenStream.getVideoTracks()[0];
      this.peers.forEach((pc, userId) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });
      
      // Handle screen share end
      screenTrack.onended = () => {
        console.log('[WebRTC] Screen share ended');
        this.stopScreenShare();
      };
      
      console.log('[WebRTC] Screen share started');
      return screenStream;
    } catch (error) {
      console.error('[WebRTC] Failed to start screen share:', error);
      throw error;
    }
  }
  
  stopScreenShare() {
    // Restore camera track
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        this.peers.forEach((pc, userId) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
      }
    }
    console.log('[WebRTC] Screen share stopped');
  }
  
  removePeer(userId: string) {
    const pc = this.peers.get(userId);
    if (pc) {
      pc.close();
      this.peers.delete(userId);
      if (this.onRemoteStreamRemoved) {
        this.onRemoteStreamRemoved(userId);
      }
      console.log('[WebRTC] Peer removed:', userId);
    }
  }
  
  leaveRoom() {
    console.log('[WebRTC] Leaving room');
    this.peers.forEach((pc, userId) => {
      pc.close();
    });
    this.peers.clear();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }
  
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }
  
  getPeerCount(): number {
    return this.peers.size;
  }
}

export const webrtcService = new WebRTCService();
export default webrtcService;
