import React, { useState, useEffect, useCallback } from 'react';

interface PushToTalkProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onActivate: () => void;
  onDeactivate: () => void;
}

const PushToTalk: React.FC<PushToTalkProps> = ({ 
  enabled, 
  onToggle, 
  onActivate, 
  onDeactivate 
}) => {
  const [hotkey, setHotkey] = useState<string>(() => {
    return localStorage.getItem('voicehub-ptt-key') || 'Space';
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // Сохранить горячую клавишу
  useEffect(() => {
    localStorage.setItem('voicehub-ptt-key', hotkey);
  }, [hotkey]);

  // Обработка нажатий клавиш
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    const key = getKeyName(e);
    if (key === hotkey && !isPressed) {
      e.preventDefault();
      setIsPressed(true);
      onActivate();
    }
  }, [enabled, hotkey, isPressed, onActivate]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    const key = getKeyName(e);
    if (key === hotkey && isPressed) {
      e.preventDefault();
      setIsPressed(false);
      onDeactivate();
    }
  }, [enabled, hotkey, isPressed, onDeactivate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const handleRecordHotkey = () => {
    setIsRecording(true);
    
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const key = getKeyName(e);
      setHotkey(key);
      setIsRecording(false);
      window.removeEventListener('keydown', handler);
    };
    
    window.addEventListener('keydown', handler);
    
    // Таймаут на случай если пользователь передумает
    setTimeout(() => {
      if (isRecording) {
        setIsRecording(false);
        window.removeEventListener('keydown', handler);
      }
    }, 5000);
  };

  return (
    <div className="bg-[#2b2d31] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-white font-medium text-sm">Push-to-Talk</h3>
          <p className="text-xs text-[#949ba4]">Передача голоса только при нажатии клавиши</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-[#1e1f22] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#23a559]"></div>
        </label>
      </div>

      {enabled && (
        <div className="mt-3 pt-3 border-t border-[#3f4147]">
          <label className="block text-xs text-[#949ba4] mb-2">Горячая клавиша</label>
          <button
            onClick={handleRecordHotkey}
            className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
              isRecording
                ? 'bg-[#ed4245] text-white animate-pulse'
                : 'bg-[#1e1f22] text-white hover:bg-[#35373c] border border-[#3f4147]'
            }`}
          >
            {isRecording ? 'Нажмите клавишу...' : hotkey}
          </button>
          
          {isPressed && (
            <div className="mt-2 flex items-center gap-2 text-xs text-[#23a559]">
              <div className="w-2 h-2 rounded-full bg-[#23a559] animate-pulse"></div>
              Передача активна
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function getKeyName(e: KeyboardEvent): string {
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    'Control': 'Ctrl',
    'Meta': 'Cmd',
    'OS': 'Cmd',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
  };
  
  return keyMap[e.key] || e.key.length === 1 ? e.key.toUpperCase() : e.key;
}

export default PushToTalk;
