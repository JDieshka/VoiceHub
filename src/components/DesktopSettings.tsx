import React, { useState, useEffect } from 'react';
import { desktopAPI } from '../services/tauri';

interface DesktopSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const DesktopSettings: React.FC<DesktopSettingsProps> = ({ isOpen, onClose }) => {
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [autostart, setAutostart] = useState(false);
  const [serverUrl, setServerUrl] = useState('http://localhost:8080');
  const [pushToTalkKey, setPushToTalkKey] = useState('Space');
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (isOpen && desktopAPI.isDesktop()) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const [info, autostartStatus, url, key] = await Promise.all([
        desktopAPI.getSystemInfo(),
        desktopAPI.getAutostart(),
        desktopAPI.getServerUrl(),
        desktopAPI.getPushToTalkKey(),
      ]);
      
      setSystemInfo(info);
      setAutostart(autostartStatus);
      setServerUrl(url);
      setPushToTalkKey(key);
    } catch (err) {
      console.error('[DesktopSettings] Failed to load settings:', err);
    }
  };

  const handleAutostartChange = async (enabled: boolean) => {
    try {
      await desktopAPI.setAutostart(enabled);
      setAutostart(enabled);
    } catch (err) {
      console.error('[DesktopSettings] Failed to set autostart:', err);
    }
  };

  const handleServerUrlChange = async (url: string) => {
    setServerUrl(url);
    try {
      await desktopAPI.setServerUrl(url);
    } catch (err) {
      console.error('[DesktopSettings] Failed to set server URL:', err);
    }
  };

  const handleRecordPushToTalkKey = () => {
    setIsRecording(true);
    
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const key = e.key === ' ' ? 'Space' : e.key.toUpperCase();
      setPushToTalkKey(key);
      desktopAPI.setPushToTalkKey(key);
      setIsRecording(false);
      window.removeEventListener('keydown', handler);
    };
    
    window.addEventListener('keydown', handler);
    
    setTimeout(() => {
      if (isRecording) {
        setIsRecording(false);
        window.removeEventListener('keydown', handler);
      }
    }, 5000);
  };

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#313338] rounded-lg w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1f2023] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Настройки рабочего стола</h2>
          <button
            onClick={onClose}
            className="text-[#b5bac1] hover:text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.4 4L12 10.4 5.6 4 4 5.6 10.4 12 4 18.4 5.6 20 12 13.6 18.4 20 20 18.4 13.6 12 20 5.6z"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* System Information */}
          {systemInfo && (
            <div className="bg-[#2b2d31] rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">Системная информация</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#949ba4]">ОС:</span>
                  <span className="text-white">{systemInfo.os_name} {systemInfo.os_version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#949ba4]">Процессор:</span>
                  <span className="text-white">{systemInfo.cpu_count} ядер</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#949ba4]">Использование CPU:</span>
                  <span className="text-white">{systemInfo.cpu_usage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#949ba4]">Память:</span>
                  <span className="text-white">
                    {formatBytes(systemInfo.used_memory)} / {formatBytes(systemInfo.total_memory)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#949ba4]">Версия приложения:</span>
                  <span className="text-white">{systemInfo.app_version}</span>
                </div>
              </div>
            </div>
          )}

          {/* Autostart */}
          <div className="bg-[#2b2d31] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Автозапуск</h3>
                <p className="text-xs text-[#949ba4] mt-1">Запускать VoiceHub при старте системы</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autostart}
                  onChange={(e) => handleAutostartChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#1e1f22] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#23a559]"></div>
              </label>
            </div>
          </div>

          {/* Server URL */}
          <div className="bg-[#2b2d31] rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">URL сервера</h3>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => handleServerUrlChange(e.target.value)}
              className="w-full bg-[#1e1f22] text-white rounded px-3 py-2 border border-[#3f4147] focus:border-[#5865f2] outline-none"
              placeholder="http://localhost:8080"
            />
            <p className="text-xs text-[#949ba4] mt-2">
              Адрес Go-сервера для WebSocket и SFU соединений
            </p>
          </div>

          {/* Push to Talk */}
          <div className="bg-[#2b2d31] rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">Глобальная горячая клавиша</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRecordPushToTalkKey}
                className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                  isRecording
                    ? 'bg-[#ed4245] text-white animate-pulse'
                    : 'bg-[#1e1f22] text-white hover:bg-[#35373c] border border-[#3f4147]'
                }`}
              >
                {isRecording ? 'Нажмите клавишу...' : pushToTalkKey}
              </button>
            </div>
            <p className="text-xs text-[#949ba4] mt-2">
              Глобальная клавиша работает даже когда окно не в фокусе
            </p>
          </div>

          {/* Minimize to tray */}
          <div className="bg-[#2b2d31] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Сворачивать в трей</h3>
                <p className="text-xs text-[#949ba4] mt-1">
                  При закрытии окна приложение продолжает работать в трее
                </p>
              </div>
              <button
                onClick={() => desktopAPI.minimizeToTray()}
                className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                Свернуть
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-[#2b2d31] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Тест уведомления</h3>
                <p className="text-xs text-[#949ba4] mt-1">
                  Показать тестовое системное уведомление
                </p>
              </div>
              <button
                onClick={() => desktopAPI.showNotification('VoiceHub', 'Это тестовое уведомление!')}
                className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                Показать
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1f2023] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-4 py-2 rounded font-medium transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesktopSettings;
