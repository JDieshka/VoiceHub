import React, { useState, useCallback, useEffect } from 'react';
import { Server, VoiceChannel, TextChannel } from './types';
import { servers, currentUser, generateMessage } from './store';
import ServerSidebar from './components/ServerSidebar';
import ChannelList from './components/ChannelList';
import Chat from './components/Chat';
import VoiceView from './components/VoiceView';
import MembersList from './components/MembersList';
import AuthPage from './components/AuthPage';
import { wsService } from './services/websocket';
import { webrtcService } from './services/webrtc';
import { sfuClient } from './services/sfu';
import { authService } from './services/auth';
import ConnectionModeSelector, { ConnectionMode } from './components/ConnectionModeSelector';

type ViewMode = 'text' | 'voice' | 'welcome';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [activeServerId, setActiveServerId] = useState(servers[0].id);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('welcome');
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [serverData, setServerData] = useState<Server[]>(servers);
  const [showMembers, setShowMembers] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(() => {
    return (localStorage.getItem('voicehub-connection-mode') as ConnectionMode) || 'auto';
  });

  const activeServer = serverData.find(s => s.id === activeServerId) || serverData[0];

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  // Save connection mode preference
  useEffect(() => {
    localStorage.setItem('voicehub-connection-mode', connectionMode);
  }, [connectionMode]);

  // Initialize connections based on mode
  useEffect(() => {
    const initializeConnections = async () => {
      // Always connect WebSocket for signaling
      const wsConnected = await wsService.connect();
      
      // Connect SFU if mode is sfu or auto
      if (connectionMode === 'sfu' || connectionMode === 'auto') {
        // SFU will be connected when joining a voice channel
        console.log('[App] SFU mode available');
      }
      
      setIsConnected(wsConnected);
    };

    initializeConnections();

    // Setup WebRTC callbacks for P2P mode
    webrtcService.setOnRemoteStream((userId, stream, type) => {
      if (type === 'audio') {
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.set(userId, stream);
          return next;
        });
      }
    });

    webrtcService.setOnRemoteStreamRemoved((userId, type) => {
      if (type === 'audio') {
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
      }
    });

    // Setup SFU callbacks
    sfuClient.on('remotestream', (peerId, stream) => {
      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.set(peerId, stream);
        return next;
      });
    });

    sfuClient.on('peerleft', (peerId) => {
      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.delete(peerId);
        return next;
      });
    });

    return () => {
      wsService.disconnect();
      webrtcService.leaveChannel();
      sfuClient.disconnect();
    };
  }, [connectionMode]);

  const handleSelectServer = (id: string) => {
    setActiveServerId(id);
    setActiveChannelId(null);
    setViewMode('welcome');
  };

  const handleSelectChannel = async (id: string) => {
    setActiveChannelId(id);
    const server = serverData.find(s => s.id === activeServerId);
    if (server) {
      const voiceChannel = server.voiceChannels.find(vc => vc.id === id);
      const textChannel = server.textChannels.find(tc => tc.id === id);
      
      if (voiceChannel) {
        setViewMode('voice');
        
        // Connect based on mode
        if (connectionMode === 'p2p') {
          // P2P mode: use WebSocket signaling + WebRTC mesh
          if (isConnected) {
            wsService.joinChannel(id, { name: currentUser.name, avatar: currentUser.avatar });
            await webrtcService.joinChannel(id);
          }
        } else if (connectionMode === 'sfu') {
          // SFU mode: connect to SFU server
          const connected = await sfuClient.connect(id);
          if (!connected) {
            console.warn('[App] SFU connection failed, falling back to P2P');
            if (isConnected) {
              wsService.joinChannel(id, { name: currentUser.name, avatar: currentUser.avatar });
              await webrtcService.joinChannel(id);
            }
          }
        } else {
          // Auto mode: try SFU first, fallback to P2P
          const sfuConnected = await sfuClient.connect(id);
          if (!sfuConnected && isConnected) {
            wsService.joinChannel(id, { name: currentUser.name, avatar: currentUser.avatar });
            await webrtcService.joinChannel(id);
          }
        }

        // Add current user to channel
        setServerData(prev => prev.map(s => {
          if (s.id === activeServerId) {
            return {
              ...s,
              voiceChannels: s.voiceChannels.map(vc => {
                if (vc.id === id) {
                  if (!vc.users.find(u => u.id === currentUser.id)) {
                    return { ...vc, users: [...vc.users, { ...currentUser, isMuted, isDeafened, isStreaming }] };
                  }
                  return vc;
                }
                return { ...vc, users: vc.users.filter(u => u.id !== currentUser.id) };
              })
            };
          }
          return s;
        }));
      } else if (textChannel) {
        setViewMode('text');
      }
    }
  };

  const handleSendMessage = (content: string) => {
    const newMessage = generateMessage(content);
    
    if (isConnected && activeChannelId) {
      wsService.sendTextMessage(activeChannelId, content);
    }

    setServerData(prev => prev.map(s => {
      if (s.id === activeServerId) {
        return {
          ...s,
          textChannels: s.textChannels.map(tc => {
            if (tc.id === activeChannelId) {
              return { ...tc, messages: [...tc.messages, newMessage] };
            }
            return tc;
          })
        };
      }
      return s;
    }));
  };

  const handleLeaveVoice = () => {
    // Leave based on active connection
    if (sfuClient.getIsConnected()) {
      sfuClient.disconnect();
    }
    
    if (isConnected && activeChannelId) {
      wsService.leaveChannel(activeChannelId);
      webrtcService.leaveChannel();
    }

    setServerData(prev => prev.map(s => {
      if (s.id === activeServerId) {
        return {
          ...s,
          voiceChannels: s.voiceChannels.map(vc => ({
            ...vc,
            users: vc.users.filter(u => u.id !== currentUser.id)
          }))
        };
      }
      return s;
    }));
    setActiveChannelId(null);
    setViewMode('welcome');
    setRemoteStreams(new Map());
  };

  const handleToggleMute = useCallback(async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    // Mute in both services (whichever is active)
    webrtcService.toggleMute();
    sfuClient.toggleMute();
  }, [isMuted]);

  const handleToggleDeafen = useCallback(() => {
    setIsDeafened(prev => !prev);
  }, []);

  const handleStartStream = useCallback(async () => {
    try {
      // Start screen share in active service
      if (sfuClient.getIsConnected()) {
        await sfuClient.startScreenShare();
      } else {
        await webrtcService.startScreenShare();
      }
      setIsStreaming(true);
    } catch (err) {
      console.error('Failed to start screen share:', err);
    }
  }, []);

  const handleStopStream = useCallback(() => {
    if (sfuClient.getIsConnected()) {
      sfuClient.stopScreenShare();
    } else {
      webrtcService.stopScreenShare();
    }
    setIsStreaming(false);
  }, []);

  const handleModeChange = (mode: ConnectionMode) => {
    setConnectionMode(mode);
  };

  const getActiveVoiceChannel = (): VoiceChannel | null => {
    if (viewMode !== 'voice' || !activeChannelId) return null;
    const server = serverData.find(s => s.id === activeServerId);
    return server?.voiceChannels.find(vc => vc.id === activeChannelId) || null;
  };

  const getActiveTextChannel = (): TextChannel | null => {
    if (viewMode !== 'text' || !activeChannelId) return null;
    const server = serverData.find(s => s.id === activeServerId);
    return server?.textChannels.find(tc => tc.id === activeChannelId) || null;
  };

  const activeVoiceChannel = getActiveVoiceChannel();
  const activeTextChannel = getActiveTextChannel();

  // Determine actual connection status
  const isVoiceConnected = sfuClient.getIsConnected() || (isConnected && webrtcService.getPeerCount() >= 0);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#313338]">
      <ServerSidebar
        servers={serverData}
        activeServer={activeServerId}
        onSelectServer={handleSelectServer}
      />

      <ChannelList
        server={activeServer}
        activeChannel={activeChannelId}
        onSelectChannel={handleSelectChannel}
        onToggleMute={handleToggleMute}
        onToggleDeafen={handleToggleDeafen}
        onStartStream={handleStartStream}
        isMuted={isMuted}
        isDeafened={isDeafened}
        isStreaming={isStreaming}
      />

      {viewMode === 'welcome' && (
        <div className="flex-1 flex flex-col bg-[#313338]">
          <div className="h-12 px-4 flex items-center border-b border-[#1f2023] shadow-sm">
            <h3 className="font-semibold text-white">{activeServer.name}</h3>
            <div className="ml-auto flex items-center gap-4">
              <ConnectionModeSelector
                mode={connectionMode}
                onModeChange={handleModeChange}
                isConnected={isConnected}
              />
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-2xl">
              <div className="w-20 h-20 rounded-full bg-[#5865f2] flex items-center justify-center text-4xl mx-auto mb-6">
                {activeServer.icon}
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Добро пожаловать в {activeServer.name}!</h2>
              <p className="text-[#949ba4] mb-6">
                Выберите голосовой или текстовый канал из списка слева.
              </p>
              
              {/* Architecture info */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-[#2b2d31] rounded-lg p-4 text-left">
                  <div className="text-2xl mb-2">🔗</div>
                  <h4 className="text-white font-medium text-sm mb-1">P2P Mesh</h4>
                  <p className="text-xs text-[#949ba4]">Прямое соединение между клиентами. Минимальная задержка.</p>
                </div>
                <div className="bg-[#2b2d31] rounded-lg p-4 text-left">
                  <div className="text-2xl mb-2">🖥️</div>
                  <h4 className="text-white font-medium text-sm mb-1">SFU</h4>
                  <p className="text-xs text-[#949ba4]">Сервер пересылает медиа. Масштабируется до 100+ участников.</p>
                </div>
                <div className="bg-[#2b2d31] rounded-lg p-4 text-left">
                  <div className="text-2xl mb-2">⚡</div>
                  <h4 className="text-white font-medium text-sm mb-1">Гибрид</h4>
                  <p className="text-xs text-[#949ba4]">Автоматический выбор режима в зависимости от доступности.</p>
                </div>
              </div>

              <div className="bg-[#2b2d31] rounded-lg p-4 text-left">
                <h4 className="text-white font-medium text-sm mb-2">Текущий режим: <span className="text-[#5865f2]">{connectionMode.toUpperCase()}</span></h4>
                <div className="text-xs text-[#949ba4] space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#23a559]' : 'bg-[#ed4245]'}`}></div>
                    <span>WebSocket: {isConnected ? 'Подключен' : 'Отключен'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${sfuClient.getIsConnected() ? 'bg-[#23a559]' : 'bg-[#80848e]'}`}></div>
                    <span>SFU: {sfuClient.getIsConnected() ? 'Активен' : 'Не подключен'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'text' && activeTextChannel && (
        <div className="flex-1 flex">
          <Chat channel={activeTextChannel} onSendMessage={handleSendMessage} />
          {showMembers && <MembersList />}
        </div>
      )}

      {viewMode === 'voice' && activeVoiceChannel && (
        <VoiceView
          channel={activeVoiceChannel}
          currentUser={{ ...currentUser, isMuted, isDeafened, isStreaming }}
          isMuted={isMuted}
          isDeafened={isDeafened}
          isStreaming={isStreaming}
          onLeave={handleLeaveVoice}
          onToggleMute={handleToggleMute}
          onToggleDeafen={handleToggleDeafen}
          onStartStream={handleStartStream}
          onStopStream={handleStopStream}
          remoteStreams={remoteStreams}
          isConnected={isVoiceConnected}
          connectionMode={connectionMode}
        />
      )}
    </div>
  );
}

export default App;
