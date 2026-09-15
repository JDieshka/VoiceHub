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
    <div className="bg-[#2b2d31] rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-[#949ba4] uppercase tracking-wide">
          Режим соединения
        </h3>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#23a559]' : 'bg-[#ed4245]'}`}></div>
      </div>
      
      <div className="flex gap-1">
        <button
          onClick={() => onModeChange('p2p')}
          className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
            mode === 'p2p'
              ? 'bg-[#5865f2] text-white'
              : 'bg-[#1e1f22] text-[#b5bac1] hover:bg-[#35373c]'
          }`}
          title="P2P: Прямое соединение между клиентами"
        >
          P2P
        </button>
        <button
          onClick={() => onModeChange('sfu')}
          className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
            mode === 'sfu'
              ? 'bg-[#5865f2] text-white'
              : 'bg-[#1e1f22] text-[#b5bac1] hover:bg-[#35373c]'
          }`}
          title="SFU: Сервер пересылает медиа"
        >
          SFU
        </button>
        <button
          onClick={() => onModeChange('auto')}
          className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
            mode === 'auto'
              ? 'bg-[#5865f2] text-white'
              : 'bg-[#1e1f22] text-[#b5bac1] hover:bg-[#35373c]'
          }`}
          title="Авто: SFU если доступен, иначе P2P"
        >
          Авто
        </button>
      </div>
      
      <div className="mt-2 text-[10px] text-[#949ba4]">
        {mode === 'p2p' && '🔗 Каждый подключён ко всем (лучше для 2-4 человек)'}
        {mode === 'sfu' && '🖥️ Сервер пересылает медиа (лучше для 5+ человек)'}
        {mode === 'auto' && '⚡ Автоматический выбор режима'}
      </div>
    </div>
  );
};

export default ConnectionModeSelector;
