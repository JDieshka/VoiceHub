import React, { useState } from 'react';
import { checkServerHealth } from '../../services/tauri';

interface ServerSelectionPageProps {
  onServerSelect: (serverUrl: string) => void;
  lastServerUrl?: string;
}

// Определяем, запущены ли мы в Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

export const ServerSelectionPage: React.FC<ServerSelectionPageProps> = ({ 
  onServerSelect, 
  lastServerUrl 
}) => {
  const [serverUrl, setServerUrl] = useState(lastServerUrl || '');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const validateUrl = (url: string): boolean => {
    try {
      // Проверяем что URL валидный
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const normalizeUrl = (input: string): string => {
    let url = input.trim();
    
    // Убираем trailing slash
    url = url.replace(/\/$/, '');
    
    // Если уже есть протокол - возвращаем как есть
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Определяем тип ввода
    const isIPAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(url);
    const isIPWithPort = /^(\d{1,3}\.){3}\d{1,3}:\d+$/.test(url);
    const isDomain = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*(\.[a-zA-Z]{2,})+$/.test(url);
    const isDomainWithPort = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*(\.[a-zA-Z]{2,})+:\d+$/.test(url);
    
    // Если это IP или домен без порта - добавляем порт 8080
    if (isIPAddress || isDomain) {
      url = url + ':8080';
    }
    
    // Добавляем протокол
    // Для доменов используем https, для IP - http
    if (isDomain || isDomainWithPort) {
      url = 'https://' + url;
    } else {
      url = 'http://' + url;
    }
    
    return url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!serverUrl.trim()) {
      setError('Введите адрес сервера');
      return;
    }

    // Нормализуем URL
    const url = normalizeUrl(serverUrl);

    if (!validateUrl(url)) {
      setError('Неверный формат. Примеры: 192.168.1.100, voicehub.com, http://server:8080');
      return;
    }

    setIsChecking(true);

    try {
      console.log('[ServerSelection] Input:', serverUrl);
      console.log('[ServerSelection] Normalized URL:', url);
      console.log('[ServerSelection] Checking server:', `${url}/health`);
      console.log('[ServerSelection] Is Tauri:', isTauri());

      let data: any;

      // Используем Tauri HTTP API если в desktop режиме
      if (isTauri()) {
        console.log('[ServerSelection] Using Tauri HTTP API');
        try {
          data = await checkServerHealth(`${url}/health`);
        } catch (tauriError) {
          console.error('[ServerSelection] Tauri HTTP error:', tauriError);
          // Fallback на обычный fetch если Tauri API не работает
          console.log('[ServerSelection] Falling back to fetch API');
          data = await fetchWithTimeout(`${url}/health`);
        }
      } else {
        console.log('[ServerSelection] Using fetch API');
        data = await fetchWithTimeout(`${url}/health`);
      }

      console.log('[ServerSelection] Response ', data);
      
      if (data.status !== 'ok') {
        throw new Error('Сервер не ответил корректно');
      }

      // Сервер доступен, переходим к авторизации
      console.log('[ServerSelection] Server is available, proceeding to auth');
      onServerSelect(url);
    } catch (err) {
      console.error('[ServerSelection] Connection error:', err);
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Таймаут подключения (10 секунд). Проверьте адрес сервера и убедитесь, что сервер запущен.');
        } else if (err.message.includes('Failed to fetch')) {
          setError('Не удалось подключиться к серверу. Возможные причины:\n• Сервер не запущен\n• Неверный адрес\n• Проблемы с сетью\n• CORS не настроен на сервере');
        } else if (err.message.includes('CORS')) {
          setError('Ошибка CORS. Сервер не разрешает запросы с этого домена.');
        } else {
          setError(`Не удалось подключиться к серверу: ${err.message}`);
        }
      } else {
        setError('Неизвестная ошибка подключения');
      }
    } finally {
      setIsChecking(false);
    }
  };

  // Функция для fetch с таймаутом
  const fetchWithTimeout = async (url: string): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      console.log('[ServerSelection] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Сервер вернул статус ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="logo">MIN</div>
        <p style={{ 
          textAlign: 'center', 
          fontSize: '9px', 
          marginBottom: '20px',
          color: '#666'
        }}>
          Введите адрес сервера для подключения
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>адрес сервера</label>
          <input 
            className="field" 
            type="text" 
            value={serverUrl}
            onChange={(e) => {
              setServerUrl(e.target.value);
              setError('');
            }}
            placeholder="192.168.1.100 или voicehub.com"
            required
            autoFocus
          />
          
          {error && (
            <p style={{ 
              color: '#F08080', 
              fontSize: '8px', 
              marginTop: '10px',
              textAlign: 'center',
              whiteSpace: 'pre-line'
            }}>
              {error}
            </p>
          )}

          {lastServerUrl && (
            <p style={{ 
              fontSize: '8px', 
              marginTop: '10px',
              textAlign: 'center',
              color: '#999'
            }}>
              Последний сервер: {lastServerUrl}
            </p>
          )}

          <button 
            className="btn pink" 
            type="submit"
            disabled={isChecking}
            style={{ 
              marginTop: '20px',
              opacity: isChecking ? 0.6 : 1
            }}
          >
            {isChecking ? 'ПРОВЕРКА...' : 'ПОДКЛЮЧИТЬСЯ'}
          </button>
        </form>

        <div style={{ 
          marginTop: '20px',
          padding: '15px',
          background: '#f0f0f0',
          borderRadius: '4px',
          fontSize: '7px',
          lineHeight: '1.6'
        }}>
          <p style={{ marginBottom: '8px', fontWeight: 'bold' }}>Примеры:</p>
          <p>• 192.168.1.100 (IP → http://192.168.1.100:8080)</p>
          <p>• voicehub.com (домен → https://voicehub.com:8080)</p>
          <p>• localhost (локально → http://localhost:8080)</p>
          <p>• http://server:9000 (полный URL с портом)</p>
          <p style={{ marginTop: '10px', color: '#666' }}>
            💡 Порт 8080 добавляется автоматически
          </p>
          <p style={{ color: '#666' }}>
            💡 Для доменов используется HTTPS
          </p>
          <p style={{ color: '#666' }}>
            💡 Для IP адресов используется HTTP
          </p>
        </div>
      </div>
    </section>
  );
};
