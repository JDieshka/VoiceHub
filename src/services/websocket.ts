// Динамический WebSocket URL - устанавливается при выборе сервера
let WS_URL = '';

export const setWebSocketUrl = (url: string) => {
  // Преобразуем HTTP URL в WebSocket URL
  WS_URL = url.replace(/^http/, 'ws') + '/ws';
  console.log('[WS] WebSocket URL set to:', WS_URL);
};

export const getWebSocketUrl = () => WS_URL;

type MessageHandler = (msg: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private userId: string = '';
  private userName: string = '';
  
  connect(userId: string, userName: string): Promise<boolean> {
    this.userId = userId;
    this.userName = userName;
    
    return new Promise((resolve) => {
      try {
        const url = `${WS_URL}?userId=${userId}&userName=${encodeURIComponent(userName)}`;
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
          console.log('[WS] Connected to server');
          this.reconnectAttempts = 0;
          resolve(true);
        };
        
        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            this.emit(msg.type, msg);
          } catch (err) {
            console.error('[WS] Failed to parse message:', err);
          }
        };
        
        this.ws.onclose = () => {
          console.log('[WS] Disconnected from server');
          this.attemptReconnect();
        };
        
        this.ws.onerror = (error) => {
          console.error('[WS] Error:', error);
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
    
    setTimeout(() => {
      this.connect(this.userId, this.userName);
    }, delay);
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  send(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
  
  joinRoom(roomId: string) {
    this.send({
      type: 'join',
      roomId: roomId
    });
  }
  
  leaveRoom(roomId: string) {
    this.send({
      type: 'leave',
      roomId: roomId
    });
  }
  
  sendOffer(to: string, offer: RTCSessionDescriptionInit) {
    this.send({
      type: 'offer',
      to: to,
      payload: {
        sdp: offer.sdp,
        type: offer.type
      }
    });
  }
  
  sendAnswer(to: string, answer: RTCSessionDescriptionInit) {
    this.send({
      type: 'answer',
      to: to,
      payload: {
        sdp: answer.sdp,
        type: answer.type
      }
    });
  }
  
  sendICECandidate(to: string, candidate: RTCIceCandidate) {
    this.send({
      type: 'ice-candidate',
      to: to,
      payload: {
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex
      }
    });
  }
  
  sendMessage(roomId: string, content: string) {
    this.send({
      type: 'text-message',
      roomId: roomId,
      payload: {
        id: `msg-${Date.now()}`,
        userId: this.userId,
        userName: this.userName,
        content: content,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }
  
  off(type: string, handler: MessageHandler) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  private emit(type: string, msg: any) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.forEach(handler => handler(msg));
    }
  }
  
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();
export default websocketService;
