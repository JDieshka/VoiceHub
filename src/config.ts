/**
 * Конфигурация приложения
 * 
 * Для продакшн-деплоя измените URL на ваш домен:
 * - apiUrl: 'https://voicehub.example.com'
 * - wsUrl: 'wss://voicehub.example.com/ws'
 * - sfuUrl: 'wss://voicehub.example.com/sfu'
 */

export const config = {
  // ============================================
  // API ENDPOINTS
  // ============================================
  
  // Локальная разработка
  apiUrl: (import.meta as any).env?.VITE_API_URL || 'http://localhost:8080',
  wsUrl: (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:8080/ws',
  sfuUrl: (import.meta as any).env?.VITE_SFU_URL || 'ws://localhost:8080/sfu',
  
  // ============================================
  // WEBRTC ICE SERVERS
  // ============================================
  
  iceServers: [
    // Публичные STUN серверы (бесплатные)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    
    // TURN сервер (ОБЯЗАТЕЛЬНО для продакшна!)
    // Без TURN многие пользователи не смогут подключиться из-за NAT
    // Раскомментируйте и настройте для продакшн-деплоя:
    // {
    //   urls: 'turn:voicehub.example.com:3478',
    //   username: 'voicehub',
    //   credential: 'YourStrongTurnPassword'
    // }
  ],
  
  // ============================================
  // AUDIO SETTINGS
  // ============================================
  
  audio: {
    sampleRate: 48000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  
  // ============================================
  // JWT SETTINGS
  // ============================================
  
  jwt: {
    // Обновлять токен за 5 минут до истечения
    refreshThreshold: 5 * 60 * 1000,
    // Минимальный интервал между обновлениями (1 минута)
    minRefreshInterval: 60 * 1000,
  },
  
  // ============================================
  // UI SETTINGS
  // ============================================
  
  ui: {
    // Максимум сообщений в чате
    maxMessages: 100,
    // Максимум участников в голосовом канале
    maxVoiceUsers: 50,
    // Таймаут переподключения WebSocket (мс)
    reconnectTimeout: 5000,
    // Максимум попыток переподключения
    maxReconnectAttempts: 5,
  },
  
  // ============================================
  // FEATURES
  // ============================================
  
  features: {
    // Включить SFU режим
    enableSFU: true,
    // Включить push-to-talk
    enablePushToTalk: true,
    // Включить трансляцию экрана
    enableScreenShare: true,
    // Включить нативные уведомления (Tauri)
    enableNativeNotifications: true,
  },
};

// ============================================
// ENVIRONMENT DETECTION
// ============================================

export const isDevelopment = (import.meta as any).env?.DEV || false;
export const isProduction = (import.meta as any).env?.PROD || false;
export const isDesktop = !!(window as any).__TAURI__;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Получить полный URL для API запроса
 */
export function getApiUrl(path: string): string {
  return `${config.apiUrl}${path}`;
}

/**
 * Получить URL для WebSocket соединения
 */
export function getWsUrl(): string {
  return config.wsUrl;
}

/**
 * Получить URL для SFU соединения
 */
export function getSfuUrl(): string {
  return config.sfuUrl;
}

/**
 * Получить ICE серверы для WebRTC
 */
export function getIceServers(): RTCIceServer[] {
  return config.iceServers;
}

/**
 * Проверить, используется ли HTTPS
 */
export function isSecure(): boolean {
  return window.location.protocol === 'https:';
}

/**
 * Получить текущий домен
 */
export function getDomain(): string {
  return window.location.hostname;
}

export default config;
