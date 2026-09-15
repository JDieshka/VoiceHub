import React, { useState, useEffect, useCallback } from 'react';
import { audioService, AudioDevice, AudioConstraints, AudioStats } from '../services/audio';
import VoiceIndicator from './VoiceIndicator';

interface AudioSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const AudioSettings: React.FC<AudioSettingsProps> = ({ isOpen, onClose }) => {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedOutput, setSelectedOutput] = useState<string>('');
  const [constraints, setConstraints] = useState<AudioConstraints>(audioService.getConstraints());
  const [audioStats, setAudioStats] = useState<AudioStats | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  // Загрузка устройств при открытии
  useEffect(() => {
    if (isOpen) {
      loadDevices();
    }
  }, [isOpen]);

  const loadDevices = async () => {
    const hasPermission = await audioService.requestPermission();
    setPermissionGranted(hasPermission);
    
    if (hasPermission) {
      const inputDevices = await audioService.getDevices();
      const outputDevicesList = await audioService.getOutputDevices();
      setDevices(inputDevices);
      setOutputDevices(outputDevicesList);
      
      if (inputDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(inputDevices[0].deviceId);
      }
    }
  };

  // Запуск мониторинга при выборе устройства
  useEffect(() => {
    if (isOpen && selectedDevice && permissionGranted) {
      startTest(selectedDevice);
    }
    
    return () => {
      audioService.stopMonitoring();
      audioService.stopMicrophone();
    };
  }, [selectedDevice, isOpen, permissionGranted]);

  const startTest = async (deviceId: string) => {
    try {
      setIsTesting(true);
      await audioService.initMicrophone(deviceId);
      audioService.startMonitoring(setAudioStats);
    } catch (err) {
      console.error('[AudioSettings] Failed to start test:', err);
      setIsTesting(false);
    }
  };

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDevice(deviceId);
  };

  const handleConstraintChange = (key: keyof AudioConstraints, value: boolean | number) => {
    const newConstraints = { ...constraints, [key]: value };
    setConstraints(newConstraints);
    audioService.updateConstraints(newConstraints);
    
    // Перезапустить микрофон с новыми настройками
    if (selectedDevice) {
      startTest(selectedDevice);
    }
  };

  const handlePlayTest = async () => {
    setIsPlayingTest(true);
    await audioService.playTestSound(selectedOutput);
    setIsPlayingTest(false);
  };

  const handleSave = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#313338] rounded-lg w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1f2023] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Настройки голоса</h2>
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
          {/* Permission check */}
          {!permissionGranted && (
            <div className="bg-[#ed4245]/10 border border-[#ed4245] rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[#ed4245] flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <div>
                  <h3 className="text-white font-medium mb-1">Требуется разрешение</h3>
                  <p className="text-sm text-[#b5bac1]">
                    Разрешите доступ к микрофону для использования голосовых функций
                  </p>
                  <button
                    onClick={loadDevices}
                    className="mt-3 bg-[#5865f2] hover:bg-[#4752c4] text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                  >
                    Запросить разрешение
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Voice Activity Indicator */}
          {permissionGranted && (
            <div className="bg-[#2b2d31] rounded-lg p-6">
              <h3 className="text-white font-medium mb-4">Проверка микрофона</h3>
              <div className="flex items-center justify-center">
                <VoiceIndicator stats={audioStats} size="lg" showLabel={true} />
              </div>
              {audioStats && (
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-[#b5bac1]">
                    <span>Уровень:</span>
                    <span className="text-white">{Math.round(audioStats.level)}%</span>
                  </div>
                  <div className="flex justify-between text-[#b5bac1]">
                    <span>Пик:</span>
                    <span className="text-white">{Math.round(audioStats.peak)}%</span>
                  </div>
                  <div className="flex justify-between text-[#b5bac1]">
                    <span>Частота:</span>
                    <span className="text-white">{Math.round(audioStats.frequency)} Hz</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input device selection */}
          {permissionGranted && devices.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[#b5bac1] mb-2">
                Микрофон
              </label>
              <select
                value={selectedDevice}
                onChange={(e) => handleDeviceChange(e.target.value)}
                className="w-full bg-[#1e1f22] text-white rounded px-3 py-2 border border-[#3f4147] focus:border-[#5865f2] outline-none"
              >
                {devices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Output device selection */}
          {outputDevices.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[#b5bac1] mb-2">
                Устройство вывода
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedOutput}
                  onChange={(e) => setSelectedOutput(e.target.value)}
                  className="flex-1 bg-[#1e1f22] text-white rounded px-3 py-2 border border-[#3f4147] focus:border-[#5865f2] outline-none"
                >
                  <option value="">По умолчанию</option>
                  {outputDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handlePlayTest}
                  disabled={isPlayingTest}
                  className="bg-[#5865f2] hover:bg-[#4752c4] disabled:bg-[#4752c4] text-white px-4 py-2 rounded font-medium transition-colors flex items-center gap-2"
                >
                  {isPlayingTest ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" strokeWidth="4" strokeDasharray="31.4" strokeDashoffset="10"/>
                      </svg>
                      Тест...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                      Тест
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Audio processing settings */}
          {permissionGranted && (
            <div>
              <h3 className="text-white font-medium mb-3">Обработка звука</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-sm text-white">Подавление эха</div>
                    <div className="text-xs text-[#949ba4]">Убирает эхо от динамиков</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={constraints.echoCancellation}
                    onChange={(e) => handleConstraintChange('echoCancellation', e.target.checked)}
                    className="w-5 h-5 rounded bg-[#1e1f22] border-[#3f4147] text-[#5865f2] focus:ring-[#5865f2]"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-sm text-white">Шумоподавление</div>
                    <div className="text-xs text-[#949ba4]">Убирает фоновый шум</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={constraints.noiseSuppression}
                    onChange={(e) => handleConstraintChange('noiseSuppression', e.target.checked)}
                    className="w-5 h-5 rounded bg-[#1e1f22] border-[#3f4147] text-[#5865f2] focus:ring-[#5865f2]"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-sm text-white">Автоматическая регулировка</div>
                    <div className="text-xs text-[#949ba4]">Нормализует громкость</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={constraints.autoGainControl}
                    onChange={(e) => handleConstraintChange('autoGainControl', e.target.checked)}
                    className="w-5 h-5 rounded bg-[#1e1f22] border-[#3f4147] text-[#5865f2] focus:ring-[#5865f2]"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Input sensitivity */}
          {permissionGranted && (
            <div>
              <label className="block text-sm font-medium text-[#b5bac1] mb-2">
                Чувствительность микрофона
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={constraints.sampleRate === 48000 ? 50 : 100}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  handleConstraintChange('sampleRate', value < 50 ? 44100 : 48000);
                }}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-[#949ba4] mt-1">
                <span>Низкая</span>
                <span>Высокая</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1f2023] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[#b5bac1] hover:text-white transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-4 py-2 rounded font-medium transition-colors"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioSettings;
