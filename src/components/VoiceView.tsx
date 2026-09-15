import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VoiceChannel, User } from '../types';
import { audioService, AudioStats } from '../services/audio';
import VoiceIndicator from './VoiceIndicator';
import AudioSettings from './AudioSettings';
import ConnectionStats from './ConnectionStats';
import PushToTalk from './PushToTalk';

import { ConnectionMode } from './ConnectionModeSelector';

interface VoiceViewProps {
  channel: VoiceChannel;
  currentUser: User;
  isMuted: boolean;
  isDeafened: boolean;
  isStreaming: boolean;
  onLeave: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onStartStream: () => void;
  onStopStream: () => void;
  remoteStreams?: Map<string, MediaStream>;
  isConnected?: boolean;
  connectionMode?: ConnectionMode;
}

const VoiceView: React.FC<VoiceViewProps> = ({
  channel,
  currentUser,
  isMuted,
  isDeafened,
  isStreaming,
  onLeave,
  onToggleMute,
  onToggleDeafen,
  onStartStream,
  onStopStream,
  remoteStreams = new Map(),
  isConnected = false,
  connectionMode = 'auto',
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [connectionTime, setConnectionTime] = useState(0);
  const [audioStats, setAudioStats] = useState<AudioStats | null>(null);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showConnectionStats, setShowConnectionStats] = useState(false);
  const [pushToTalkEnabled, setPushToTalkEnabled] = useState(false);
  const [pttActive, setPttActive] = useState(false);
  const [micInitialized, setMicInitialized] = useState(false);

  // Инициализация микрофона при входе в канал
  useEffect(() => {
    const initMic = async () => {
      try {
        await audioService.initMicrophone();
        audioService.startMonitoring(setAudioStats);
        setMicInitialized(true);
      } catch (err) {
        console.error('[VoiceView] Failed to init mic:', err);
        // Показать пользователю ошибку
        console.warn('[VoiceView] Microphone not available. Voice chat will not work.');
        // Продолжить работу без микрофона
        setMicInitialized(false);
      }
    };
    
    initMic();
    
    return () => {
      audioService.stopMonitoring();
      audioService.stopMicrophone();
      setMicInitialized(false);
    };
  }, [channel.id]);

  // Обработка mute через audioService
  useEffect(() => {
    if (micInitialized) {
      audioService.setMuted(isMuted || (pushToTalkEnabled && !pttActive));
    }
  }, [isMuted, pushToTalkEnabled, pttActive, micInitialized]);

  // Connection timer
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Attach remote streams to video elements
  useEffect(() => {
    remoteStreams.forEach((stream, userId) => {
      const videoEl = remoteVideoRefs.current.get(userId);
      if (videoEl && videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  const formatConnectionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleScreenShare = useCallback(async () => {
    try {
      await onStartStream();
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: true,
      });
      setScreenStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      stream.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        onStopStream();
      };
    } catch (err) {
      console.log('Screen share cancelled:', err);
      onStopStream();
    }
  }, [onStartStream, onStopStream]);

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      onStopStream();
    }
  };

  const handlePttToggle = (enabled: boolean) => {
    setPushToTalkEnabled(enabled);
    if (!enabled) {
      setPttActive(false);
    }
  };

  const handlePttActivate = () => {
    setPttActive(true);
  };

  const handlePttDeactivate = () => {
    setPttActive(false);
  };

  const allUsers = [currentUser, ...channel.users];
  const effectiveMuted = isMuted || (pushToTalkEnabled && !pttActive);

  return (
    <div className="flex-1 flex flex-col bg-[#1e1f22] h-full">
      {/* Voice channel header */}
      <div className="h-12 px-4 flex items-center border-b border-[#1f2023] shadow-sm">
        <svg className="w-5 h-5 mr-2 text-[#80848e]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3c-1.66 0-3 1.34-3 3v6c0 1.66 1.34 3 3 3s3-1.34 3-3V6c0-1.66-1.34-3-3-3zm5 3c0 3.42-2.72 6.23-6 6.72V16h3v3H10v-3h3v-3.28c-3.28-.49-6-3.3-6-6.72H5c0 4.08 3.06 7.44 7 7.93V20H8v2h8v-2h-4v-3.28c3.94-.49 7-3.85 7-7.93V6h-2z"/>
        </svg>
        <h3 className="font-semibold text-white">{channel.name}</h3>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center text-xs text-[#23a559]">
            <div className="w-2 h-2 rounded-full bg-[#23a559] mr-1.5 animate-pulse"></div>
            Подключено • {formatConnectionTime(connectionTime)}
          </div>
          {isConnected && (
            <button
              onClick={() => setShowConnectionStats(!showConnectionStats)}
              className="flex items-center text-xs text-[#949ba4] hover:text-white transition-colors"
              title="Статистика соединения"
            >
              <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              {connectionMode === 'sfu' ? 'SFU' : connectionMode === 'p2p' ? 'P2P' : 'WebRTC'}
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Video/Stream area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {(screenStream || remoteStreams.size > 0) ? (
              <div className="flex-1 relative bg-black flex items-center justify-center p-4 overflow-auto">
                <div className="grid gap-3 w-full h-full max-w-6xl mx-auto" style={{
                  gridTemplateColumns: `repeat(${Math.min(Math.ceil(Math.sqrt(1 + remoteStreams.size)), 3)}, minmax(0, 1fr))`,
                  gridAutoRows: 'minmax(200px, 1fr)',
                }}>
                  {screenStream && (
                    <div className="relative bg-[#1e1f22] rounded-lg overflow-hidden flex items-center justify-center">
                      <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                      <div className="absolute top-2 left-2 bg-[#1e1f22]/90 px-2 py-1 rounded flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#ed4245] animate-pulse"></div>
                        <span className="text-xs text-white">Ваш экран</span>
                      </div>
                    </div>
                  )}
                  {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
                    const hasVideo = stream.getVideoTracks().length > 0;
                    const user = channel.users.find(u => u.id === userId) || { name: 'User', avatar: '👤' };
                    return (
                      <div key={userId} className="relative bg-[#1e1f22] rounded-lg overflow-hidden flex items-center justify-center">
                        {hasVideo ? (
                          <video ref={(el) => { if (el) remoteVideoRefs.current.set(userId, el); }} autoPlay playsInline className="w-full h-full object-contain" />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4">
                            <div className="w-16 h-16 rounded-full bg-[#5865f2] flex items-center justify-center text-2xl">{user.avatar}</div>
                            <span className="text-white text-sm mt-3">{user.name}</span>
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-[#1e1f22]/90 px-2 py-1 rounded">
                          <span className="text-xs text-white">{hasVideo ? '📺 Трансляция' : '🎙️ Аудио'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {screenStream && (
                  <button onClick={stopScreenShare} className="absolute bottom-4 right-4 bg-[#ed4245] hover:bg-[#c13538] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Остановить трансляцию
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎙️</div>
                  <h3 className="text-xl font-semibold text-white mb-2">Голосовой канал</h3>
                  <p className="text-[#949ba4] mb-2">Вы подключены к каналу "{channel.name}"</p>
                  <p className="text-xs text-[#949ba4] mb-4">
                    {isConnected ? 'WebRTC активен — аудио передаётся через P2P' : 'Демо-режим — запустите Go-сервер для реального аудио'}
                  </p>
                  <button onClick={handleScreenShare} className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 12l-6-3.5 6-3.5v7z"/>
                    </svg>
                    Начать трансляцию экрана
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom panel with audio settings */}
          <div className="flex-shrink-0 bg-[#232428] border-t border-[#1f2023] p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {/* Voice Activity */}
              <div className="bg-[#2b2d31] rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <VoiceIndicator stats={audioStats} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[#949ba4] mb-1">Уровень голоса</div>
                    <div className="w-full h-2 bg-[#1e1f22] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#23a559] transition-all duration-100"
                        style={{ width: `${audioStats?.level || 0}%` }}
                      />
                    </div>
                    <div className="text-xs text-[#949ba4] mt-1">
                      {audioStats?.isSpeaking ? (
                        <span className="text-[#23a559]">🎤 Говорит</span>
                      ) : effectiveMuted ? (
                        <span className="text-[#ed4245]">🔇 Отключён</span>
                      ) : (
                        <span>Тишина</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Push to Talk */}
              <div>
                <PushToTalk
                  enabled={pushToTalkEnabled}
                  onToggle={handlePttToggle}
                  onActivate={handlePttActivate}
                  onDeactivate={handlePttDeactivate}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-60 flex-shrink-0 bg-[#2b2d31] border-l border-[#1f2023] flex flex-col overflow-y-auto">
          {/* Participants */}
          <div className="p-4 border-b border-[#1f2023]">
            <h4 className="text-xs font-semibold text-[#949ba4] uppercase tracking-wide">
              Участники — {allUsers.length}
            </h4>
          </div>
          <div className="p-2 space-y-0.5">
            {allUsers.map((user) => (
              <div key={user.id} className="flex items-center px-2 py-1.5 rounded hover:bg-[#35373c]">
                <div className="relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg bg-[#5865f2] ${
                    !effectiveMuted && user.id === currentUser.id && (audioStats?.isSpeaking || false)
                      ? 'ring-2 ring-[#23a559]' : ''
                  }`}>
                    {user.avatar}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2b2d31] ${
                    user.status === 'online' ? 'bg-[#23a559]' :
                    user.status === 'idle' ? 'bg-[#f0b232]' :
                    user.status === 'dnd' ? 'bg-[#ed4245]' : 'bg-[#80848e]'
                  }`}></div>
                </div>
                <div className="ml-2 flex-1 min-w-0">
                  <div className="text-sm text-[#dbdee1] truncate">
                    {user.name}
                    {user.id === currentUser.id && <span className="text-[#949ba4] text-xs ml-1">(Вы)</span>}
                  </div>
                  {remoteStreams.has(user.id) && (
                    <div className="text-xs text-[#23a559]">🔊 Говорит</div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {user.isStreaming && (
                    <svg className="w-4 h-4 text-[#5865f2]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 12l-6-3.5 6-3.5v7z"/>
                    </svg>
                  )}
                  {user.isMuted && (
                    <svg className="w-4 h-4 text-[#ed4245]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.7 11H5c0 3.42 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.3 6-6.72h-1.7c0 2.76-2.24 5-5 5s-5-2.24-5-5zm5.3-1l2 2h1l-3-3V5.5c0-.83-.67-1.5-1.5-1.5S9 4.67 9 5.5v5.69L4.41 6.59 3 8l9 9 .59-.59L6.7 10z"/>
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Connection Stats */}
          {showConnectionStats && (
            <div className="p-3">
              <ConnectionStats peerConnection={null} isVisible={showConnectionStats} />
            </div>
          )}

          {/* Connection info */}
          <div className="mt-auto p-3 border-t border-[#1f2023]">
            <div className="text-xs text-[#949ba4] space-y-1">
              <div className="flex justify-between">
                <span>Сервер:</span>
                <span className={isConnected ? 'text-[#23a559]' : 'text-[#ed4245]'}>
                  {isConnected ? 'Подключен' : 'Оффлайн'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Микрофон:</span>
                <span className={micInitialized ? 'text-[#23a559]' : 'text-[#ed4245]'}>
                  {micInitialized ? 'Активен' : 'Нет доступа'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>WebRTC peers:</span>
                <span className="text-white">{remoteStreams.size}</span>
              </div>
              <div className="flex justify-between">
                <span>Битрейт:</span>
                <span className="text-white">{channel.bitrate / 1000} kbps</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voice controls */}
      <div className="flex-shrink-0 h-16 bg-[#232428] border-t border-[#1f2023] flex items-center justify-center gap-3 px-4">
        <button
          onClick={onToggleMute}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            effectiveMuted ? 'bg-[#ed4245] text-white' : 'bg-[#313338] text-[#b5bac1] hover:bg-[#3b3d44]'
          }`}
          title={effectiveMuted ? 'Включить микрофон' : 'Выключить микрофон'}
        >
          {effectiveMuted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.7 11H5c0 3.42 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.3 6-6.72h-1.7c0 2.76-2.24 5-5 5s-5-2.24-5-5zm5.3-1l2 2h1l-3-3V5.5c0-.83-.67-1.5-1.5-1.5S9 4.67 9 5.5v5.69L4.41 6.59 3 8l9 9 .59-.59L6.7 10z"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 3.42-2.72 6.23-6 6.72V21h-2v-3.28c-3.28-.49-6-3.3-6-6.72H5c0 4.08 3.06 7.44 7 7.93V21h2v-2.07c3.94-.49 7-3.85 7-7.93h-2z"/>
            </svg>
          )}
        </button>
        
        <button
          onClick={onToggleDeafen}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            isDeafened ? 'bg-[#ed4245] text-white' : 'bg-[#313338] text-[#b5bac1] hover:bg-[#3b3d44]'
          }`}
          title={isDeafened ? 'Включить звук' : 'Выключить звук'}
        >
          {isDeafened ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.27 3L3 4.27l9 9v.28c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4v-1.73L19.73 21 21 19.73 4.27 3zM14 7h-1.59L14 8.59V7zm0-4c-3.94 0-7.14 2.88-7.68 6.63l1.46 1.46C8.08 8.26 9.9 6 12.34 6c.23 0 .45.02.66.05V4.07c-.22-.02-.44-.07-.66-.07h.66z"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"/>
            </svg>
          )}
        </button>
        
        <button
          onClick={screenStream ? stopScreenShare : handleScreenShare}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            screenStream ? 'bg-[#5865f2] text-white' : 'bg-[#313338] text-[#b5bac1] hover:bg-[#3b3d44]'
          }`}
          title={screenStream ? 'Остановить трансляцию' : 'Начать трансляцию'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 12l-6-3.5 6-3.5v7z"/>
          </svg>
        </button>

        <div className="w-px h-6 bg-[#3f4147] mx-1"></div>

        {/* Audio settings button */}
        <button
          onClick={() => setShowAudioSettings(true)}
          className="w-10 h-10 rounded-full bg-[#313338] text-[#b5bac1] hover:bg-[#3b3d44] flex items-center justify-center transition-all"
          title="Настройки голоса"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        </button>

        <div className="w-px h-6 bg-[#3f4147] mx-1"></div>

        <button
          onClick={onLeave}
          className="w-10 h-10 rounded-full bg-[#ed4245] hover:bg-[#c13538] text-white flex items-center justify-center transition-all"
          title="Отключиться"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 9c-1.6 1.2-3 5.2-3 5.2V18h2v3l4-3.5L11 14v-5h1c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7c0 2.15 1.36 3.98 3.26 4.67L12 9z"/>
          </svg>
        </button>
      </div>

      {/* Audio Settings Modal */}
      <AudioSettings isOpen={showAudioSettings} onClose={() => setShowAudioSettings(false)} />
    </div>
  );
};

export default VoiceView;
