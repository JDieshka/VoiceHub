import React, { useState } from 'react';

interface ServerSelectionPageProps {
  onServerSelect: (serverUrl: string) => void;
  lastServerUrl?: string;
}

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let url = serverUrl.trim();
    
    // Добавляем http:// если не указан протокол
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }

    // Убираем trailing slash
    url = url.replace(/\/$/, '');

    if (!validateUrl(url)) {
      setError('Неверный формат URL. Пример: http://your-server:8080');
      return;
    }

    setIsChecking(true);

    try {
      // Проверяем доступность сервера
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      console.log('[ServerSelection] Checking server:', `${url}/health`);

      const response = await fetch(`${url}/health`, {
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

      const data = await response.json();
      console.log('[ServerSelection] Response data:', data);
      
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
            placeholder="http://your-server:8080"
            required
            autoFocus
          />
          
          {error && (
            <p style={{ 
              color: '#F08080', 
              fontSize: '8px', 
              marginTop: '10px',
              textAlign: 'center'
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
          <p>• http://localhost:8080 (локальный сервер)</p>
          <p>• http://your-server-ip:8080 (IP адрес)</p>
          <p>• https://your-domain.com (домен)</p>
          <p style={{ marginTop: '10px', color: '#666' }}>
            💡 Если не подключается, проверьте:
          </p>
          <p style={{ color: '#666' }}>
            • Сервер запущен на указанном адресе
          </p>
          <p style={{ color: '#666' }}>
            • Порт 8080 открыт в firewall
          </p>
          <p style={{ color: '#666' }}>
            • Откройте консоль браузера (F12) для подробностей
          </p>
        </div>
      </div>
    </section>
  );
};
