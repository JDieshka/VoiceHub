export type MessageType =
  | 'join'
  | 'leave'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'mute-toggle'
  | 'deaf-toggle'
  | 'stream-toggle'
  | 'text-message'
  | 'channel-update'
  | 'user-joined'
  | 'user-left'
  | 'welcome'
  | 'error';

export interface SignalMessage {
  type: MessageType;
  channelId?: string;
  from?: string;
  to?: string;
  payload?: any;
  timestamp?: string;
}

export interface UserInfo {
  id: string;
  name: string;
  avatar: string;
  isMuted?: boolean;
  isDeaf?: boolean;
  isStreaming?: boolean;
}

type MessageHandler = (msg: SignalMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private userId: string;
  private userName: string;
  private userAvatar: string;
  private handlers: Map<MessageType, MessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isConnected = false;
  private messageQueue: string[] = [];

  constructor() {
    // Generate persistent user ID
    this.userId = localStorage.getItem('voicehub-userId') || `user-${Date.now()}`;
    localStorage.setItem('voicehub-userId', this.userId);
    this.userName = localStorage.getItem('voicehub-userName') || 'Вы';
    this.userAvatar = localStorage.getItem('voicehub-userAvatar') || '🎮';

    // Determine server URL from config
    const wsUrl = (import.meta as any).env?.VITE_WS_URL || 'ws://31.77.158.177:8080/ws';
    this.url = `${wsUrl}?userId=${this.userId}&userName=${encodeURIComponent(this.userName)}&userAvatar=${encodeURIComponent(this.userAvatar)}`;
  }

  connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WS] Connected to server');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('welcome', { type: 'welcome' });

          // Flush queued messages
          while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift()!;
            this.ws?.send(msg);
          }

          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const msg: SignalMessage = JSON.parse(event.data);
            this.emit(msg.type, msg);
          } catch (err) {
            console.error('[WS] Failed to parse message:', err);
          }
        };

        this.ws.onclose = (event) => {
          console.log('[WS] Disconnected:', event.code, event.reason);
          this.isConnected = false;
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('[WS] Error:', error);
          this.isConnected = false;
          resolve(false);
        };
      } catch (err) {
        console.error('[WS] Connection failed:', err);
        resolve(false);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WS] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.maxReconnectAttempts = 0;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(msg: SignalMessage) {
    const data = JSON.stringify(msg);
    if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(data);
    }
  }

  joinChannel(channelId: string, user?: Partial<UserInfo>) {
    this.send({
      type: 'join',
      channelId,
      payload: {
        user: {
          id: this.userId,
          name: user?.name || this.userName,
          avatar: user?.avatar || this.userAvatar,
        }
      }
    });
  }

  leaveChannel(channelId: string) {
    this.send({
      type: 'leave',
      channelId,
    });
  }

  sendOffer(channelId: string, to: string, sdp: RTCSessionDescriptionInit) {
    this.send({
      type: 'offer',
      channelId,
      to,
      payload: {
        sdp: sdp.sdp,
        type: sdp.type,
      }
    });
  }

  sendAnswer(channelId: string, to: string, sdp: RTCSessionDescriptionInit) {
    this.send({
      type: 'answer',
      channelId,
      to,
      payload: {
        sdp: sdp.sdp,
        type: sdp.type,
      }
    });
  }

  sendICECandidate(channelId: string, to: string, candidate: RTCIceCandidate) {
    this.send({
      type: 'ice-candidate',
      channelId,
      to,
      payload: {
        candidate: candidate.candidate,
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid,
      }
    });
  }

  sendTextMessage(channelId: string, content: string) {
    this.send({
      type: 'text-message',
      channelId,
      payload: {
        id: `msg-${Date.now()}`,
        userId: this.userId,
        userName: this.userName,
        content,
        timestamp: new Date().toISOString(),
      }
    });
  }

  on(type: MessageType, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  off(type: MessageType, handler: MessageHandler) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx !== -1) handlers.splice(idx, 1);
    }
  }

  private emit(type: MessageType, msg: SignalMessage) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.forEach(h => h(msg));
    }
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  getUserId(): string {
    return this.userId;
  }

  getUserName(): string {
    return this.userName;
  }

  setUserName(name: string) {
    this.userName = name;
    localStorage.setItem('voicehub-userName', name);
  }
}

// Singleton instance
export const wsService = new WebSocketService();
export default wsService;
