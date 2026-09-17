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
 * Проверка доступности сервера через Rust backend
 */
export async function checkServerHealth(url: string): Promise<any> {
  console.log('[Tauri] Checking server health via Rust backend:', url);
  
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  
  try {
    const response = await (window as any).__TAURI__.invoke('check_server_health', { url });
    
    console.log('[Tauri] Rust backend response:', response);
    
    if (response.status !== 'ok') {
      throw new Error('Сервер не ответил корректно');
    }
    
    return response;
  } catch (error) {
    console.error('[Tauri] Rust backend request failed:', error);
    throw error;
  }
}

/**
 * Выполнение HTTP запроса через Rust backend
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
  console.log('[Tauri] HTTP request via Rust backend:', options.method || 'GET', url);
  
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  
  try {
    const response = await (window as any).__TAURI__.invoke('http_request', {
      url,
      method: options.method || 'GET',
      headers: options.headers ? JSON.stringify(options.headers) : null,
      body: options.body,
    });

    console.log('[Tauri] Rust backend response:', response);

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error('[Tauri] Rust backend request failed:', error);
    throw error;
  }
}
