/**
 * Tauri HTTP API wrapper
 * Решает проблему WebView2 блокировки fetch запросов
 */

// Типы для Tauri API
declare global {
  interface Window {
    __TAURI__?: {
      http?: {
        fetch: (url: string, options?: any) => Promise<any>;
      };
      invoke: (cmd: string, args?: any) => Promise<any>;
    };
  }
}

/**
 * Проверка, запущено ли приложение в Tauri
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Проверка доступности сервера через Tauri HTTP API
 */
export async function checkServerHealth(url: string): Promise<any> {
  console.log('[Tauri] Checking server health via Tauri HTTP API:', url);
  
  if (!isTauri() || !window.__TAURI__?.http) {
    throw new Error('Tauri HTTP API not available');
  }
  
  try {
    const response = await window.__TAURI__.http.fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10,
    });

    console.log('[Tauri] Response status:', response.status);
    console.log('[Tauri] Response ', response.data);

    if (response.status !== 200) {
      throw new Error(`Сервер вернул статус ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error('[Tauri] HTTP request failed:', error);
    throw error;
  }
}

/**
 * Выполнение HTTP запроса через Tauri API
 */
export async function httpRequest(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
  } = {}
): Promise<any> {
  console.log('[Tauri] HTTP request:', options.method || 'GET', url);
  
  if (!isTauri() || !window.__TAURI__?.http) {
    throw new Error('Tauri HTTP API not available');
  }
  
  try {
    const response = await window.__TAURI__.http.fetch(url, {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body,
      timeout: options.timeout || 10,
    });

    console.log('[Tauri] Response status:', response.status);

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.data;
  } catch (error) {
    console.error('[Tauri] HTTP request failed:', error);
    throw error;
  }
}
