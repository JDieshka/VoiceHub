import React, { useState } from 'react';

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
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onScreenShare: () => void;
  onLeave: () => void;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
}

export const VoiceView: React.FC<VoiceViewProps> = ({
  servers,
  activeRoomId,
  onRoomSelect,
  onCreateChannel,
  onToggleMute,
  onToggleCamera,
  onScreenShare,
  onLeave,
  isMuted,
  isCameraOn,
  isScreenSharing
}) => {
  const [openServers, setOpenServers] = useState<Set<string>>(new Set([servers[0]?.id]));

  const toggleServer = (serverId: string) => {
    const newOpen = new Set(openServers);
    if (newOpen.has(serverId)) {
      newOpen.delete(serverId);
    } else {
      newOpen.add(serverId);
    }
    setOpenServers(newOpen);
  };

  const activeRoom = servers.flatMap(s => s.rooms).find(r => r.id === activeRoomId);

  return (
    <div className="view" id="view-voice">
      <aside className="sidebar purple-side">
        <div className="list">
          {servers.map(server => (
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
                    {server.rooms.map(room => (
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
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <button className="btn pink side-btn" onClick={onCreateChannel}>
          Создать
          <svg className="ic" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </aside>

      <main className="voice-main">
        <div className="stage">
          <div className="video-cards">
            {activeRoom ? (
              activeRoom.participants.map(participant => (
                <div key={participant.id} className="video-card">
                  <span className="avatar a90"></span>
                  <div className="vname">{participant.name}</div>
                  <svg className="ic" viewBox="0 0 24 24">
                    <path d="M14 7a4 4 0 0 1 5-4l-3 3 2 2 3-3a4 4 0 0 1-5 5l-8 8-2-2z"/>
                  </svg>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', fontSize: '10px', width: '100%' }}>
                Выберите комнату для подключения
              </div>
            )}
          </div>
          <div className="controls">
            <button className="ctrl red" title="выйти" onClick={onLeave}>
              <svg className="ic" viewBox="0 0 24 24">
                <path d="M4 5c0 8 7 15 15 15l1-4-4-1-1 2a13 13 0 0 1-8-8l2-1-1-4z"/>
                <path d="M16 4l5 5M21 4l-5 5"/>
              </svg>
            </button>
            <button 
              className={`ctrl ${isScreenSharing ? 'mint' : ''}`} 
              title="экран" 
              onClick={onScreenShare}
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
              onClick={onToggleMute}
            >
              <svg className="ic" viewBox="0 0 24 24">
                <rect x="9" y="3" width="6" height="10" rx="3"/>
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>
              </svg>
            </button>
            <button 
              className={`ctrl ${isCameraOn ? 'mint' : ''}`} 
              title="камера" 
              onClick={onToggleCamera}
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
          <div className="msg">
            <span className="avatar a26"></span>
            <div className="bubble">Привет!<br/>Как дела?</div>
          </div>
          <div className="msg out">
            <div className="bubble">)))</div>
          </div>
        </div>
        <div className="chat-input">
          <input type="text" placeholder="..." />
          <button className="icon-btn">
            <svg className="ic" viewBox="0 0 24 24">
              <path d="M3 7h6l2 2h10v10H3z"/>
            </svg>
          </button>
          <button className="icon-btn">
            <svg className="ic" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"/>
              <circle className="dot" cx="9" cy="9" r="1.4"/>
              <circle className="dot" cx="14" cy="8" r="1.4"/>
              <circle className="dot" cx="16" cy="12" r="1.4"/>
            </svg>
          </button>
        </div>
      </main>
    </div>
  );
};
