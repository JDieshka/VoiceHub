import React from 'react';

export type ConnectionMode = 'p2p' | 'sfu' | 'auto';

interface ConnectionModeSelectorProps {
  mode: ConnectionMode;
  onModeChange: (mode: ConnectionMode) => void;
  isConnected: boolean;
}

const ConnectionModeSelector: React.FC<ConnectionModeSelectorProps> = ({
  mode,
  onModeChange,
  isConnected,
}) => {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? 'bg-[#23a559]' : 'bg-[#ed4245]'}`}></div>
      <div className="flex gap-1">
        <button
          onClick={() => onModeChange('p2p')}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            mode === 'p2p'
              ? 'bg-[#5865f2] text-white'
              : 'bg-[#1e1f22] text-[#b5bac1] hover:bg-[#35373c]'
          }`}
          title="P2P: Прямое соединение между клиентами (лучше для 2-4 человек)"
        >
          P2P
        </button>
        <button
          onClick={() => onModeChange('sfu')}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            mode === 'sfu'
              ? 'bg-[#5865f2] text-white'
              : 'bg-[#1e1f22] text-[#b5bac1] hover:bg-[#35373c]'
          }`}
          title="SFU: Сервер пересылает медиа (лучше для 5+ человек)"
        >
          SFU
        </button>
        <button
          onClick={() => onModeChange('auto')}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            mode === 'auto'
              ? 'bg-[#5865f2] text-white'
              : 'bg-[#1e1f22] text-[#b5bac1] hover:bg-[#35373c]'
          }`}
          title="Авто: SFU если доступен, иначе P2P"
        >
          Авто
        </button>
      </div>
    </div>
  );
};

export default ConnectionModeSelector;
