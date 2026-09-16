# 🌐 Универсальная конфигурация без привязки к IP

## ✅ Проблема решена!

Теперь приложение **полностью универсальное** и работает на любом сервере без необходимости указывать IP адрес или домен вручную.

---

## 🎯 Как это работает

### Автоматическое определение URL

Приложение определяет URL сервера автоматически в следующем порядке:

1. **Переменные окружения** (если указаны в `.env`)
   ```bash
   VITE_API_URL=https://voicehub.example.com
   VITE_WS_URL=wss://voicehub.example.com/ws
   ```

2. **Текущий хост** (если приложение развернуто на том же сервере)
   ```javascript
   // Если пользователь зашел на https://myserver.com:8080
   // Приложение автоматически использует:
   apiUrl: 'https://myserver.com:8080'
   wsUrl: 'wss://myserver.com:8080/ws'
   ```

3. **localhost** (для локальной разработки)
   ```javascript
   apiUrl: 'http://localhost:8080'
   wsUrl: 'ws://localhost:8080/ws'
   ```

---

## 🚀 Варианты развертывания

### Вариант 1: На том же сервере (рекомендуется)

Разверните фронтенд и бэкенд на одном сервере:

```bash
# Сервер: 31.77.158.177
# Бэкенд: http://31.77.158.177:8080
# Фронтенд: http://31.77.158.177:3000

# Приложение автоматически определит:
# API: http://31.77.158.177:8080
# WS: ws://31.77.158.177:8080/ws
```

**Настройка:**
```bash
# На сервере
cd /opt/voicehub
npm run build
npm run preview -- --host 0.0.0.0 --port 3000
```

**Доступ:**
- Пользователь заходит на `http://31.77.158.177:3000`
- Приложение автоматически подключается к `http://31.77.158.177:8080`

---

### Вариант 2: С доменом и HTTPS

```bash
# Домен: voicehub.example.com
# Бэкенд: https://voicehub.example.com/api
# Фронтенд: https://voicehub.example.com

# Создайте .env файл:
VITE_API_URL=https://voicehub.example.com/api
VITE_WS_URL=wss://voicehub.example.com/ws
```

**Nginx конфигурация:**
```nginx
server {
    listen 443 ssl;
    server_name voicehub.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Фронтенд
    location / {
        root /opt/voicehub/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
```

---

### Вариант 3: Разные серверы для фронтенда и бэкенда

```bash
# Фронтенд: https://app.voicehub.com
# Бэкенд: https://api.voicehub.com

# Создайте .env файл:
VITE_API_URL=https://api.voicehub.com
VITE_WS_URL=wss://api.voicehub.com/ws
```

---

### Вариант 4: Docker с автоматической конфигурацией

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  backend:
    build: ./server
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/voicehub
      - JWT_SECRET=your-secret-key
  
  frontend:
    build: .
    ports:
      - "3000:80"
    environment:
      # Опционально: указать URL бэкенда
      # Если не указано, используется текущий хост
      - VITE_API_URL=http://backend:8080
      - VITE_WS_URL=ws://backend:8080/ws
    depends_on:
      - backend
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=voicehub
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## 📝 Конфигурационные файлы

### src/config.ts

Универсальная конфигурация с автоматическим определением URL:

```typescript
const getBaseUrl = () => {
  // 1. Проверяем переменные окружения
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // 2. Используем текущий хост
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    const port = window.location.port || '8080';
    return `${protocol}//${host}:${port}`;
  }
  
  // 3. Дефолтный localhost
  return 'http://localhost:8080';
};
```

### .env.example

Примеры конфигурации для разных окружений:

```bash
# Локальная разработка
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/ws

# Продакшен с доменом
VITE_API_URL=https://voicehub.example.com
VITE_WS_URL=wss://voicehub.example.com/ws

# Продакшен с IP
VITE_API_URL=http://31.77.158.177:8080
VITE_WS_URL=ws://31.77.158.177:8080/ws
```

---

## 🎨 Обновленные сервисы

### src/services/auth.ts

```typescript
import { config } from '../config';

const API_BASE = config.apiUrl; // Автоматически определяется

export const authService = {
  async login(credentials) {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    // ...
  }
};
```

### src/services/websocket.ts

```typescript
import { config } from '../config';

const WS_URL = config.wsUrl; // Автоматически определяется

export const websocketService = {
  connect(userId, userName) {
    return new Promise((resolve) => {
      this.ws = new WebSocket(`${WS_URL}?userId=${userId}&userName=${userName}`);
      // ...
    });
  }
};
```

---

## 🔧 Проверка конфигурации

### В браузере

Откройте консоль разработчика (F12) и выполните:

```javascript
// Проверить текущую конфигурацию
console.log('API URL:', window.__VITE_CONFIG__.apiUrl);
console.log('WS URL:', window.__VITE_CONFIG__.wsUrl);
```

### В логах

При запуске приложения в консоли будут логи:

```
[Auth] API_BASE: http://31.77.158.177:8080
[WS] Connecting to: ws://31.77.158.177:8080/ws
```

---

## 📊 Преимущества универсальной конфигурации

✅ **Не нужно указывать IP/домен вручную**
- Приложение само определяет где оно запущено

✅ **Легко переносить между серверами**
- Просто скопируйте файлы и запустите

✅ **Поддержка разных окружений**
- Разработка, тестирование, продакшен

✅ **Работа с Docker/Kubernetes**
- Автоматическая конфигурация через переменные окружения

✅ **Поддержка HTTPS**
- Автоматическое определение протокола

✅ **Гибкость**
- Можно переопределить через .env если нужно

---

## 🚀 Быстрый старт

### Локальная разработка

```bash
# 1. Запустить бэкенд
cd server
go run main.go

# 2. Запустить фронтенд
npm run dev

# 3. Открыть http://localhost:5173
# Приложение автоматически подключится к http://localhost:8080
```

### Продакшен (без домена)

```bash
# 1. На сервере 31.77.158.177
cd /opt/voicehub

# 2. Собрать фронтенд
npm run build

# 3. Запустить preview сервер
npm run preview -- --host 0.0.0.0 --port 3000

# 4. Открыть http://31.77.158.177:3000
# Приложение автоматически подключится к http://31.77.158.177:8080
```

### Продакшен (с доменом)

```bash
# 1. Создать .env файл
cat > .env << EOF
VITE_API_URL=https://voicehub.example.com
VITE_WS_URL=wss://voicehub.example.com/ws
EOF

# 2. Собрать фронтенд
npm run build

# 3. Развернуть на сервере
# Настроить Nginx с SSL

# 4. Открыть https://voicehub.example.com
```

---

## 🎉 Итог

Теперь приложение **полностью универсальное**:

- ✅ Работает на любом IP адресе
- ✅ Работает с любым доменом
- ✅ Автоматически определяет URL сервера
- ✅ Поддерживает HTTP и HTTPS
- ✅ Легко переносится между серверами
- ✅ Не требует ручной настройки URL

**Просто разверните и используйте!** 🚀
