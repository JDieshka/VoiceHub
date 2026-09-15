import React, { useState, useCallback, useEffect } from 'react';
import { Server, VoiceChannel, TextChannel } from './types';
import { servers, currentUser, generateMessage } from './store';
import ServerSidebar from './components/ServerSidebar';
import ChannelList from './components/ChannelList';
import Chat from './components/Chat';
import VoiceView from './components/VoiceView';
import MembersList from './components/MembersList';
import { wsService } from './services/websocket';
import { webrtcService } from './services/webrtc';

type ViewMode = 'text' | 'voice' | 'welcome';

function App() {
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

  const activeServer = serverData.find(s => s.id === activeServerId) || serverData[0];

  // Initialize WebSocket connection
  useEffect(() => {
    const connect = async () => {
      const connected = await wsService.connect();
      setIsConnected(connected);

      if (connected) {
        console.log('[App] Connected to VoiceHub server');
      } else {
        console.log('[App] Running in offline/demo mode');
      }
    };

    connect();

    // Setup WebRTC callbacks
    webrtcService.setOnRemoteStream((userId, stream) => {
      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.set(userId, stream);
        return next;
      });
    });

    webrtcService.setOnRemoteStreamRemoved((userId) => {
      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    });

    return () => {
      wsService.disconnect();
      webrtcService.leaveChannel();
    };
  }, []);

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
        
        // Connect to server if available
        if (isConnected) {
          wsService.joinChannel(id, { name: currentUser.name, avatar: currentUser.avatar });
          await webrtcService.joinChannel(id);
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
                // Remove user from other channels
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
    
    // Send to server if connected
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
    // Leave on server
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
    
    if (isConnected) {
      webrtcService.toggleMute();
    }
  }, [isMuted, isConnected]);

  const handleToggleDeafen = useCallback(() => {
    setIsDeafened(prev => !prev);
  }, []);

  const handleStartStream = useCallback(async () => {
    try {
      await webrtcService.startScreenShare();
      setIsStreaming(true);
    } catch (err) {
      console.error('Failed to start screen share:', err);
    }
  }, []);

  const handleStopStream = useCallback(() => {
    webrtcService.stopScreenShare();
    setIsStreaming(false);
  }, []);

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

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#313338]">
      {/* Server sidebar */}
      <ServerSidebar
        servers={serverData}
        activeServer={activeServerId}
        onSelectServer={handleSelectServer}
      />

      {/* Channel list */}
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

      {/* Main content */}
      {viewMode === 'welcome' && (
        <div className="flex-1 flex flex-col bg-[#313338]">
          <div className="h-12 px-4 flex items-center border-b border-[#1f2023] shadow-sm">
            <h3 className="font-semibold text-white">{activeServer.name}</h3>
            <div className="ml-auto flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#23a559]' : 'bg-[#ed4245]'}`}></div>
              <span className="text-xs text-[#949ba4]">
                {isConnected ? 'Сервер подключен' : 'Демо-режим'}
              </span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-full bg-[#5865f2] flex items-center justify-center text-4xl mx-auto mb-6">
                {activeServer.icon}
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Добро пожаловать в {activeServer.name}!</h2>
              <p className="text-[#949ba4] mb-6">
                Выберите голосовой или текстовый канал из списка слева, чтобы начать общение.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#2b2d31] rounded-lg p-4 text-left">
                  <div className="text-2xl mb-2">🎙️</div>
                  <h4 className="text-white font-medium text-sm mb-1">Голосовые каналы</h4>
                  <p className="text-xs text-[#949ba4]">Общайтесь голосом в реальном времени</p>
                </div>
                <div className="bg-[#2b2d31] rounded-lg p-4 text-left">
                  <div className="text-2xl mb-2">📺</div>
                  <h4 className="text-white font-medium text-sm mb-1">Трансляции</h4>
                  <p className="text-xs text-[#949ba4]">Делитесь экраном с друзьями</p>
                </div>
                <div className="bg-[#2b2d31] rounded-lg p-4 text-left">
                  <div className="text-2xl mb-2">💬</div>
                  <h4 className="text-white font-medium text-sm mb-1">Текстовые каналы</h4>
                  <p className="text-xs text-[#949ba4]">Обменивайтесь сообщениями</p>
                </div>
                <div className="bg-[#2b2d31] rounded-lg p-4 text-left">
                  <div className="text-2xl mb-2">🔗</div>
                  <h4 className="text-white font-medium text-sm mb-1">WebRTC P2P</h4>
                  <p className="text-xs text-[#949ba4]">Прямое соединение между клиентами</p>
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
          isConnected={isConnected}
        />
      )}
    </div>
  );
}

export default App;
