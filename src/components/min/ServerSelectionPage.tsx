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
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Сервер вернул статус ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== 'ok') {
        throw new Error('Сервер не ответил корректно');
      }

      // Сервер доступен, переходим к авторизации
      onServerSelect(url);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Таймаут подключения. Проверьте адрес сервера.');
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
        </div>
      </div>
    </section>
  );
};
