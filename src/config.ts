/**
 * Конфигурация приложения
 * 
 * Универсальная конфигурация без привязки к конкретному IP/домену
 * 
 * Приоритет определения URL:
 * 1. Переменные окружения (VITE_API_URL и т.д.)
 * 2. Текущий хост (если приложение развернуто на том же сервере)
 * 3. localhost для разработки
 */

// Определяем базовый URL автоматически
const getBaseUrl = () => {
  // 1. Проверяем переменные окружения
  if ((import.meta as any).env?.VITE_API_URL) {
    return (import.meta as any).env.VITE_API_URL;
  }
  
  // 2. Используем текущий хост (для продакшена)
  if (typeof window !== 'undefined' && window.location.hostname) {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const host = window.location.hostname;
    const port = window.location.port || '8080';
    return `${protocol}//${host}:${port}`;
  }
  
  // 3. Дефолтный localhost для разработки
  return 'http://localhost:8080';
};

const BASE_URL = getBaseUrl();

// Определяем WebSocket URL
const getWsUrl = () => {
  if ((import.meta as any).env?.VITE_WS_URL) {
    return (import.meta as any).env.VITE_WS_URL;
  }
  
  if (typeof window !== 'undefined' && window.location.hostname) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port || '8080';
    return `${protocol}//${host}:${port}/ws`;
  }
  
  return 'ws://localhost:8080/ws';
};

const WS_URL = getWsUrl();

export const config = {
  // ============================================
  // API ENDPOINTS
  // ============================================
  
  apiUrl: BASE_URL,
  wsUrl: WS_URL,
  sfuUrl: WS_URL.replace('/ws', '/sfu'),
  
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
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'your-username',
    //   credential: 'your-password'
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
    enableSFU: false, // Отключено, используем только P2P
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
export function getWebSocketUrl(): string {
  return config.wsUrl;
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

/**
 * Получить текущий порт
 */
export function getPort(): string {
  return window.location.port || '8080';
}

export default config;
