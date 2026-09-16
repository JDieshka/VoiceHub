import React, { useState, useEffect, useRef } from 'react';
import { webrtcService } from '../../services/webrtc';
import { websocketService } from '../../services/websocket';

interface Server {
  id: string;
  name: string;
  availableSlots: number;
  totalSlots: number;
  rooms: Room[];
}

interface Room {
  id: string;
  name: string;
  participants: Participant[];
}

interface Participant {
  id: string;
  name: string;
  isMuted: boolean;
}

interface VoiceViewProps {
  servers: Server[];
  activeRoomId: string | null;
  onRoomSelect: (roomId: string) => void;
  onCreateChannel: () => void;
  onCreateServer: () => void;
  onLeave: () => void;
  userId: string;
  userName: string;
}

export const VoiceView: React.FC<VoiceViewProps> = ({
  servers,
  activeRoomId,
  onRoomSelect,
  onCreateChannel,
  onCreateServer,
  onLeave,
  userId,
  userName
}) => {
  const [openServers, setOpenServers] = useState<Set<string>>(new Set([servers[0]?.id]));
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; text: string; isOutgoing: boolean; timestamp: Date }>>([]);
  const [inputValue, setInputValue] = useState('');
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Инициализация WebRTC при монтировании
  useEffect(() => {
    const initMedia = async () => {
      try {
        const stream = await webrtcService.initLocalStream();
        setLocalStream(stream);
        setIsCameraOn(true);
        
        // Показать локальное видео
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('[VoiceView] Failed to initialize media:', error);
      }
    };

    initMedia();

    // Настройка обработки удаленных потоков
    webrtcService.setOnRemoteStream((remoteUserId, stream) => {
      console.log('[VoiceView] Remote stream received from', remoteUserId);
      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.set(remoteUserId, stream);
        return next;
      });
    });

    webrtcService.setOnRemoteStreamRemoved((remoteUserId) => {
      console.log('[VoiceView] Remote stream removed from', remoteUserId);
      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.delete(remoteUserId);
        return next;
      });
    });

    return () => {
      webrtcService.leaveRoom();
    };
  }, []);

  // Подключение к комнате при изменении activeRoomId
  useEffect(() => {
    if (activeRoomId) {
      const joinRoom = async () => {
        try {
          // Подключиться к WebSocket если еще не подключен
          if (!websocketService.isConnected()) {
            await websocketService.connect(userId, userName);
          }
          
          // Присоединиться к комнате
          websocketService.joinRoom(activeRoomId);
          console.log('[VoiceView] Joined room:', activeRoomId);
        } catch (error) {
          console.error('[VoiceView] Failed to join room:', error);
        }
      };

      joinRoom();
    } else {
      // Покинуть комнату
      if (websocketService.isConnected()) {
        websocketService.disconnect();
      }
      webrtcService.leaveRoom();
      setRemoteStreams(new Map());
    }
  }, [activeRoomId, userId, userName]);

  const toggleServer = (serverId: string) => {
    const newOpen = new Set(openServers);
    if (newOpen.has(serverId)) {
      newOpen.delete(serverId);
    } else {
      newOpen.add(serverId);
    }
    setOpenServers(newOpen);
  };

  const handleToggleMute = () => {
    const muted = webrtcService.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleCamera = () => {
    const cameraOff = webrtcService.toggleCamera();
    setIsCameraOn(!cameraOff);
  };

  const handleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        await webrtcService.startScreenShare();
        setIsScreenSharing(true);
      } else {
        webrtcService.stopScreenShare();
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('[VoiceView] Screen share failed:', error);
    }
  };

  const handleLeave = () => {
    webrtcService.leaveRoom();
    websocketService.disconnect();
    setRemoteStreams(new Map());
    setMessages([]);
    onLeave();
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      isOutgoing: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const activeRoom = servers.flatMap(s => s.rooms).find(r => r.id === activeRoomId);

  return (
    <div className="view" id="view-voice">
      <aside className="sidebar purple-side">
        <div className="list">
          {servers.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: '9px', opacity: 0.6 }}>
              Нет серверов. Нажмите "Создать" чтобы создать новый сервер.
            </div>
          ) : (
            servers.map(server => (
              <div 
                key={server.id} 
                className={`server ${openServers.has(server.id) ? 'open' : ''}`}
              >
                <div className="server-head" onClick={() => toggleServer(server.id)}>
                  <span className="avatar a34"></span>
                  <div className="title">
                    {server.name}
                    <br/>
                    <small>Доступно {server.availableSlots}/{server.totalSlots}</small>
                  </div>
                  <svg className="ic" viewBox="0 0 24 24" style={{width:'16px',height:'16px'}}>
                    <path d="M4 5c0 8 7 15 15 15l1-4-4-1-1 2a13 13 0 0 1-8-8l2-1-1-4z"/>
                    <path d="M16 4l5 5M21 4l-5 5"/>
                  </svg>
                </div>
                {openServers.has(server.id) && (
                  <div className="server-body">
                    <button className="gear-btn icon-btn">
                      <svg className="ic" viewBox="0 0 24 24" style={{width:'16px',height:'16px'}}>
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>
                      </svg>
                    </button>
                    <div className="rooms">
                      {server.rooms.length === 0 ? (
                        <div style={{ padding: '10px', fontSize: '8px', opacity: 0.6 }}>
                          Нет комнат
                        </div>
                      ) : (
                        server.rooms.map(room => (
                          <div key={room.id}>
                            {room.participants.length > 0 ? (
                              <div className="room-card">
                                <div className="rtitle">{room.name}</div>
                                {room.participants.map(participant => (
                                  <div key={participant.id} className="part">
                                    <span className="avatar a16"></span>
                                    {participant.name}
                                    <svg className="ic" viewBox="0 0 24 24">
                                      <rect x="9" y="3" width="6" height="10" rx="3"/>
                                      <path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>
                                      {!participant.isMuted && (
                                        <path d="M4 4l16 16" style={{stroke:'var(--red)'}}/>
                                      )}
                                    </svg>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <button 
                                className="room-btn"
                                onClick={() => onRoomSelect(room.id)}
                              >
                                {room.name}
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '12px' }}>
          <button className="btn purple" onClick={onCreateServer} style={{ width: '100%' }}>
            Создать сервер
            <svg className="ic" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
          {servers.length > 0 && (
            <button className="btn pink" onClick={onCreateChannel} style={{ width: '100%' }}>
              Создать комнату
              <svg className="ic" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </button>
          )}
        </div>
      </aside>

      <main className="voice-main">
        <div className="stage">
          <div className="video-cards">
            {/* Локальное видео */}
            {localStream && (
              <div className="video-card">
                <video 
                  ref={localVideoRef}
                  autoPlay 
                  playsInline 
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div className="vname">{userName} (Вы)</div>
                <svg className="ic" viewBox="0 0 24 24">
                  <path d="M14 7a4 4 0 0 1 5-4l-3 3 2 2 3-3a4 4 0 0 1-5 5l-8 8-2-2z"/>
                </svg>
              </div>
            )}
            
            {/* Удаленные видео */}
            {Array.from(remoteStreams.entries()).map(([remoteUserId, stream]) => (
              <div key={remoteUserId} className="video-card">
                <video 
                  ref={el => { if (el) el.srcObject = stream; }}
                  autoPlay 
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div className="vname">Пользователь {remoteUserId.slice(0, 8)}</div>
                <svg className="ic" viewBox="0 0 24 24">
                  <path d="M14 7a4 4 0 0 1 5-4l-3 3 2 2 3-3a4 4 0 0 1-5 5l-8 8-2-2z"/>
                </svg>
              </div>
            ))}
            
            {/* Если нет активной комнаты */}
            {!activeRoom && (
              <div style={{ textAlign: 'center', padding: '20px', fontSize: '10px', width: '100%' }}>
                Выберите комнату для подключения
              </div>
            )}
          </div>
          <div className="controls">
            <button className="ctrl red" title="выйти" onClick={handleLeave}>
              <svg className="ic" viewBox="0 0 24 24">
                <path d="M4 5c0 8 7 15 15 15l1-4-4-1-1 2a13 13 0 0 1-8-8l2-1-1-4z"/>
                <path d="M16 4l5 5M21 4l-5 5"/>
              </svg>
            </button>
            <button 
              className={`ctrl ${isScreenSharing ? 'mint' : ''}`} 
              title="экран" 
              onClick={handleScreenShare}
            >
              <svg className="ic" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="12"/>
                <path d="M12 16v4M8 20h8"/>
                <circle className="dot" cx="9" cy="9" r="1"/>
                <circle className="dot" cx="14" cy="9" r="1"/>
                <path d="M9 12h6"/>
              </svg>
            </button>
            <button 
              className={`ctrl ${isMuted ? 'red' : ''}`} 
              title="микрофон" 
              onClick={handleToggleMute}
            >
              <svg className="ic" viewBox="0 0 24 24">
                <rect x="9" y="3" width="6" height="10" rx="3"/>
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>
              </svg>
            </button>
            <button 
              className={`ctrl ${isCameraOn ? 'mint' : ''}`} 
              title="камера" 
              onClick={handleToggleCamera}
            >
              <svg className="ic" viewBox="0 0 24 24">
                <circle cx="12" cy="9" r="6"/>
                <circle cx="12" cy="9" r="2"/>
                <path d="M12 15v4M8 21h8"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="messages">
          {messages.length > 0 ? (
            messages.map(msg => (
              <div key={msg.id} className={`msg ${msg.isOutgoing ? 'out' : ''}`}>
                {!msg.isOutgoing && <span className="avatar a26"></span>}
                <div className="bubble">{msg.text}</div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', fontSize: '10px', opacity: 0.6 }}>
              Нет сообщений. Начните общение!
            </div>
          )}
        </div>
        <div className="chat-input">
          <input 
            type="text" 
            placeholder="..." 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button 
            className="icon-btn" 
            title="отправить"
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
          >
            <svg className="ic" viewBox="0 0 24 24">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
            </svg>
          </button>
          <button className="icon-btn" title="файлы">
            <svg className="ic" viewBox="0 0 24 24">
              <path d="M3 7h6l2 2h10v10H3z"/>
            </svg>
          </button>
        </div>
      </main>
    </div>
  );
};
