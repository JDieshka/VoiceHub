/**
 * AudioService — управление микрофоном и анализ аудио
 * Использует Web Audio API для анализа уровня голоса в реальном времени
 */

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export interface AudioConstraints {
  deviceId?: string;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  sampleRate: number;
  channelCount: number;
}

export interface AudioStats {
  level: number;         // 0-100, текущий уровень голоса
  peak: number;          // 0-100, пиковый уровень
  isSpeaking: boolean;   // говорит ли пользователь
  volume: number;        // RMS громкость
  frequency: number;     // доминирующая частота
}

type StatsCallback = (stats: AudioStats) => void;

class AudioService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private dataArray: Uint8Array | null = null;
  private frequencyArray: Uint8Array | null = null;
  private animationFrameId: number | null = null;
  private statsCallback: StatsCallback | null = null;
  
  // Settings
  private constraints: AudioConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1,
  };
  
  // Voice activity detection
  private speakingThreshold = 15; // Порог для определения речи
  private speakingFrames = 0;
  private silenceFrames = 0;
  private isSpeaking = false;
  
  // Peak hold
  private peakLevel = 0;
  private peakDecay = 0.95;

  constructor() {
    // Load saved settings
    const saved = localStorage.getItem('voicehub-audio-settings');
    if (saved) {
      try {
        this.constraints = { ...this.constraints, ...JSON.parse(saved) };
      } catch (e) {
        console.error('[Audio] Failed to load settings:', e);
      }
    }
  }

  /**
   * Запросить разрешения и получить список устройств
   */
  async requestPermission(): Promise<boolean> {
    try {
      // Сначала запрашиваем разрешение
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach(t => t.stop());
      return true;
    } catch (err) {
      console.error('[Audio] Permission denied:', err);
      return false;
    }
  }

  /**
   * Получить список доступных микрофонов
   */
  async getDevices(): Promise<AudioDevice[]> {
    try {
      // Нужно разрешение для получения label
      const hasPermission = await this.requestPermission();
      if (!hasPermission) return [];

      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Микрофон ${d.deviceId.slice(0, 8)}`,
          kind: d.kind,
        }));
    } catch (err) {
      console.error('[Audio] Failed to enumerate devices:', err);
      return [];
    }
  }

  /**
   * Получить список устройств вывода
   */
  async getOutputDevices(): Promise<AudioDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(d => d.kind === 'audiooutput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Динамик ${d.deviceId.slice(0, 8)}`,
          kind: d.kind,
        }));
    } catch (err) {
      return [];
    }
  }

  /**
   * Инициализировать микрофон с анализом
   */
  async initMicrophone(deviceId?: string): Promise<MediaStream> {
    // Остановить предыдущий стрим
    this.stopMicrophone();

    // Проверка доступности mediaDevices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('[Audio] mediaDevices API not available - trying Tauri API');
      
      // Пробуем использовать Tauri API для проверки доступности
      try {
        const { desktopAPI } = await import('./tauri');
        
        // Получаем детальную информацию о микрофоне
        const micInfo = await desktopAPI.getMicrophoneInfo();
        console.log('[Audio] Microphone info:', micInfo);
        
        if (!micInfo.available) {
          console.warn('[Audio] No microphone available via Tauri API - creating silent fallback stream');
          return this.createFallbackStream();
        }
        
        console.log('[Audio] Microphone available via Tauri API');
        console.log('[Audio] Available devices:', micInfo.devices);
        console.log('[Audio] Default device:', micInfo.default_device);
      } catch (e) {
        console.warn('[Audio] Tauri API not available - creating silent fallback stream');
      }
      
      // Создаем silent fallback stream для Tauri когда mediaDevices недоступен
      return this.createFallbackStream();
    }

    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: this.constraints.echoCancellation,
        noiseSuppression: this.constraints.noiseSuppression,
        autoGainControl: this.constraints.autoGainControl,
        sampleRate: this.constraints.sampleRate,
        channelCount: this.constraints.channelCount,
      } as any,
      video: false,
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Создаём AudioContext
      this.audioContext = new AudioContext({
        sampleRate: this.constraints.sampleRate,
      });
      
      // Создаём анализатор
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      
      // Подключаем источник
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);
      
      // Массивы для данных
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.frequencyArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      console.log('[Audio] Microphone initialized');
      return this.stream;
    } catch (err) {
      console.warn('[Audio] Failed to init microphone, using fallback:', err);
      // Вместо выбрасывания ошибки, создаем fallback stream
      return this.createFallbackStream();
    }
  }

  /**
   * Создать fallback silent stream для случаев когда микрофон недоступен
   */
  private createFallbackStream(): MediaStream {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const destination = audioContext.createMediaStreamDestination();
    
    // Настраиваем на очень тихий звук (почти тишина)
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    
    oscillator.connect(gainNode);
    gainNode.connect(destination);
    oscillator.start();
    
    console.log('[Audio] Fallback silent stream created');
    return destination.stream;
  }

  /**
   * Начать мониторинг уровня голоса
   */
  startMonitoring(callback: StatsCallback) {
    this.statsCallback = callback;
    this.analyze();
  }

  /**
   * Остановить мониторинг
   */
  stopMonitoring() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.statsCallback = null;
  }

  /**
   * Анализ аудио (вызывается каждый кадр)
   */
  private analyze = () => {
    if (!this.analyser || !this.dataArray || !this.frequencyArray) {
      return;
    }

    // Получаем временные данные (waveform)
    this.analyser.getByteTimeDomainData(this.dataArray as any);
    
    // Получаем частотные данные
    this.analyser.getByteFrequencyData(this.frequencyArray as any);

    // Вычисляем RMS (среднеквадратичное значение)
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const value = (this.dataArray[i] - 128) / 128;
      sum += value * value;
    }
    const rms = Math.sqrt(sum / this.dataArray.length);
    const volume = Math.min(100, rms * 300); // Нормализуем до 0-100

    // Находим доминирующую частоту
    let maxFreqIndex = 0;
    let maxFreqValue = 0;
    for (let i = 0; i < this.frequencyArray.length; i++) {
      if (this.frequencyArray[i] > maxFreqValue) {
        maxFreqValue = this.frequencyArray[i];
        maxFreqIndex = i;
      }
    }
    const nyquist = this.audioContext?.sampleRate ? this.audioContext.sampleRate / 2 : 24000;
    const frequency = (maxFreqIndex / this.frequencyArray.length) * nyquist;

    // Voice Activity Detection
    if (volume > this.speakingThreshold) {
      this.speakingFrames++;
      this.silenceFrames = 0;
      if (this.speakingFrames >= 3 && !this.isSpeaking) {
        this.isSpeaking = true;
      }
    } else {
      this.silenceFrames++;
      this.speakingFrames = 0;
      if (this.silenceFrames >= 15 && this.isSpeaking) {
        this.isSpeaking = false;
      }
    }

    // Peak hold
    if (volume > this.peakLevel) {
      this.peakLevel = volume;
    } else {
      this.peakLevel *= this.peakDecay;
    }

    // Отправляем статистику
    if (this.statsCallback) {
      this.statsCallback({
        level: volume,
        peak: this.peakLevel,
        isSpeaking: this.isSpeaking,
        volume,
        frequency,
      });
    }

    this.animationFrameId = requestAnimationFrame(this.analyze);
  };

  /**
   * Установить громкость (mute/unmute)
   */
  setMuted(muted: boolean) {
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  /**
   * Переключить mute
   */
  toggleMute(): boolean {
    if (this.stream) {
      const track = this.stream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        return !track.enabled;
      }
    }
    return false;
  }

  /**
   * Остановить микрофон
   */
  stopMicrophone() {
    this.stopMonitoring();
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.dataArray = null;
    this.frequencyArray = null;
    this.isSpeaking = false;
    this.peakLevel = 0;
  }

  /**
   * Обновить настройки
   */
  updateConstraints(newConstraints: Partial<AudioConstraints>) {
    this.constraints = { ...this.constraints, ...newConstraints };
    localStorage.setItem('voicehub-audio-settings', JSON.stringify(this.constraints));
  }

  /**
   * Получить текущие настройки
   */
  getConstraints(): AudioConstraints {
    return { ...this.constraints };
  }

  /**
   * Получить текущий стрим
   */
  getStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * Проверить, активен ли микрофон
   */
  isActive(): boolean {
    return this.stream !== null && this.stream.active;
  }

  /**
   * Воспроизвести тестовый звук
   */
  async playTestSound(outputDeviceId?: string): Promise<void> {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
    
    oscillator.connect(gainNode);
    
    // Если указан device output, пытаемся направить туда
    if (outputDeviceId && (gainNode as any).setSinkId) {
      try {
        await (ctx as any).setSinkId(outputDeviceId);
      } catch (e) {
        console.log('[Audio] setSinkId not supported');
      }
    }
    
    gainNode.connect(ctx.destination);
    oscillator.start();
    
    return new Promise(resolve => {
      setTimeout(() => {
        oscillator.stop();
        ctx.close();
        resolve();
      }, 1000);
    });
  }
}

export const audioService = new AudioService();
export default audioService;
