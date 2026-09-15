import React, { useState } from 'react';
import { Server, VoiceChannel } from '../types';
import CreateChannelModal from './CreateChannelModal';

interface ChannelListProps {
  server: Server;
  activeChannel: string | null;
  onSelectChannel: (id: string) => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onStartStream: () => void;
  onCreateChannel: (name: string, type: 'text' | 'voice') => void;
  isMuted: boolean;
  isDeafened: boolean;
  isStreaming: boolean;
}

const ChannelList: React.FC<ChannelListProps> = ({
  server,
  activeChannel,
  onSelectChannel,
  onToggleMute,
  onToggleDeafen,
  onStartStream,
  onCreateChannel,
  isMuted,
  isDeafened,
  isStreaming,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text');

  const handleCreateClick = (type: 'text' | 'voice') => {
    setNewChannelType(type);
    setShowCreateModal(true);
  };

  const handleCreateChannel = (name: string, type: 'text' | 'voice') => {
    onCreateChannel(name, type);
  };

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col h-full">
      {/* Server header */}
      <div className="h-12 px-4 flex items-center border-b border-[#1f2023] shadow-md hover:bg-[#35373c] transition-colors cursor-pointer">
        <h2 className="font-bold text-white truncate text-[15px]">{server.name}</h2>
        <svg className="ml-auto w-4 h-4 text-[#b5bac1]" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
        </svg>
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
        {/* Text channels */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2 group">
            <div className="flex items-center">
              <span className="text-sm mr-1.5">💬</span>
              <span className="text-[11px] font-bold text-[#949ba4] uppercase tracking-wider">Текстовые каналы</span>
            </div>
            <button
              onClick={() => handleCreateClick('text')}
              className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-[#b5bac1] hover:text-white hover:bg-[#35373c] transition-all"
              title="Создать текстовый канал"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
              </svg>
            </button>
          </div>
          <div className="space-y-0.5">
            {server.textChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel.id)}
                className={`w-full flex items-center px-2 py-1.5 rounded-md transition-all group ${
                  activeChannel === channel.id
                    ? 'bg-[#404249] text-white shadow-sm'
                    : 'text-[#949ba4] hover:text-[#dbdee1] hover:bg-[#35373c]'
                }`}
              >
                <span className="mr-2 text-[#80848e] text-base font-normal">#</span>
                <span className="text-[15px] truncate font-medium">{channel.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Voice channels */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2 group">
            <div className="flex items-center">
              <span className="text-sm mr-1.5">🔊</span>
              <span className="text-[11px] font-bold text-[#949ba4] uppercase tracking-wider">Голосовые каналы</span>
            </div>
            <button
              onClick={() => handleCreateClick('voice')}
              className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-[#b5bac1] hover:text-white hover:bg-[#35373c] transition-all"
              title="Создать голосовой канал"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
              </svg>
            </button>
          </div>
          <div className="space-y-0.5">
            {server.voiceChannels.map((channel) => (
              <VoiceChannelItem
                key={channel.id}
                channel={channel}
                isActive={activeChannel === channel.id}
                onSelect={() => onSelectChannel(channel.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Create Channel Modal */}
      <CreateChannelModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        channelType={newChannelType}
        onCreate={handleCreateChannel}
      />

      {/* User panel */}
      <div className="h-[52px] bg-[#232428] px-2 flex items-center border-t border-[#1f2023]">
        <div className="flex items-center flex-1 min-w-0">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-sm shadow-md">
              🎮
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#23a559] border-[3px] border-[#232428]"></div>
          </div>
          <div className="ml-2 min-w-0 flex-1">
            <div className="text-sm font-semibold text-white truncate">Вы</div>
            <div className="text-[11px] text-[#949ba4]">В сети</div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onToggleMute}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
              isMuted ? 'text-[#ed4245] bg-[#ed4245]/10 hover:bg-[#ed4245]/20' : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-white'
            }`}
            title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
          >
            {isMuted ? (
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
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
              isDeafened ? 'text-[#ed4245] bg-[#ed4245]/10 hover:bg-[#ed4245]/20' : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-white'
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
            onClick={onStartStream}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
              isStreaming ? 'text-[#ed4245] bg-[#ed4245]/10 hover:bg-[#ed4245]/20' : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-white'
            }`}
            title={isStreaming ? 'Остановить трансляцию' : 'Начать трансляцию'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 12l-6-3.5 6-3.5v7z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Create Channel Modal */}
      <CreateChannelModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        channelType={newChannelType}
        onCreate={handleCreateChannel}
      />
    </div>
  );
};

interface VoiceChannelItemProps {
  channel: VoiceChannel;
  isActive: boolean;
  onSelect: () => void;
}

const VoiceChannelItem: React.FC<VoiceChannelItemProps> = ({ channel, isActive, onSelect }) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  return (
    <div>
      <button
        onClick={onSelect}
        className={`w-full flex items-center px-2 py-1.5 rounded-md transition-all group ${
          isActive ? 'text-white bg-[#404249] shadow-sm' : 'text-[#949ba4] hover:text-[#dbdee1] hover:bg-[#35373c]'
        }`}
      >
        {channel.type === 'stage' ? (
          <span className="mr-2 text-base">🎭</span>
        ) : (
          <span className="mr-2 text-base">🔊</span>
        )}
        <span className="text-[15px] truncate font-medium flex-1 text-left">{channel.name}</span>
        {channel.users.length > 0 && (
          <span className="ml-2 text-xs text-[#949ba4] bg-[#1e1f22] px-1.5 py-0.5 rounded-full">
            {channel.users.length}
          </span>
        )}
      </button>
      
      {/* Users in channel */}
      {isExpanded && channel.users.length > 0 && (
        <div className="ml-6 mt-0.5 space-y-0.5">
          {channel.users.map((user) => (
            <div key={user.id} className="flex items-center px-2 py-1 rounded hover:bg-[#35373c] cursor-pointer group">
              <div className="relative">
                <div className="w-6 h-6 rounded-full bg-[#5865f2] flex items-center justify-center text-xs">
                  {user.avatar}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#2b2d31] ${
                  user.status === 'online' ? 'bg-[#23a559]' :
                  user.status === 'idle' ? 'bg-[#f0b232]' :
                  user.status === 'dnd' ? 'bg-[#ed4245]' : 'bg-[#80848e]'
                }`}></div>
              </div>
              <span className="ml-2 text-sm text-[#949ba4] group-hover:text-[#dbdee1] truncate">
                {user.name}
              </span>
              {user.isStreaming && (
                <svg className="ml-auto w-3.5 h-3.5 text-[#5865f2]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 12l-6-3.5 6-3.5v7z"/>
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChannelList;
