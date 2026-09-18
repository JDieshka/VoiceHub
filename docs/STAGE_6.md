# Этап 6: База данных и авторизация

## Обзор

Реализована полноценная система аутентификации и персистентного хранения данных:

- **PostgreSQL** для хранения пользователей, серверов, каналов и сообщений
- **JWT** для аутентификации (access + refresh tokens)
- **bcrypt** для хэширования паролей
- **Автоматические миграции** при запуске сервера

## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ AuthPage    │  │  AuthService │  │  API Client   │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬────────┘  │
│         │                │                  │            │
└─────────┼────────────────┼──────────────────┼────────────┘
          │                │                  │
          │ HTTP/REST      │ JWT tokens       │ Bearer token
          │                │                  │
┌─────────┼────────────────┼──────────────────┼────────────┐
│         ▼                ▼                  ▼             │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Go Server (port 8080)                │   │
│  │                                                   │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │   │
│  │  │ Auth     │  │ JWT      │  │ Middleware    │   │   │
│  │  │ Handler  │  │ Manager  │  │ (Bearer)     │   │   │
│  │  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │   │
│  │       │              │               │            │   │
│  │  ┌────┴──────────────┴───────────────┴────────┐   │   │
│  │  │           Repositories                      │   │   │
│  │  │  (User, Server, Channel, Message, Token)    │   │   │
│  │  └─────────────────┬──────────────────────────┘   │   │
│  └────────────────────┼──────────────────────────────┘   │
│                       │ SQL                               │
│              ┌────────┴────────┐                          │
│              │   PostgreSQL    │                          │
│              │   (port 5432)   │                          │
│              └─────────────────┘                          │
│                                                           │
│                  Backend (Go + PostgreSQL)                │
└───────────────────────────────────────────────────────────┘
```

## Схема базы данных

### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(10) DEFAULT '🎮',
    status VARCHAR(20) DEFAULT 'offline',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### servers
```sql
CREATE TABLE servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) DEFAULT '🎮',
    owner_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### server_members
```sql
CREATE TABLE server_members (
    server_id UUID REFERENCES servers(id),
    user_id UUID REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (server_id, user_id)
);
```

### voice_channels, text_channels, messages, refresh_tokens
Аналогичная структура с внешними ключами и индексами.

## API Endpoints

### Аутентификация (публичные)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/register` | Регистрация нового пользователя |
| POST | `/api/auth/login` | Вход в систему |
| POST | `/api/auth/refresh` | Обновление access token |

### Аутентификация (защищённые)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/logout` | Выход из системы |
| GET | `/api/auth/me` | Получение информации о текущем пользователе |

### Серверы (защищённые)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/servers` | Создание сервера |
| GET | `/api/servers/list` | Список серверов пользователя |
| GET | `/api/servers/get?id=` | Получение сервера |
| GET | `/api/servers/channels?id=` | Каналы сервера |

### Сообщения (защищённые)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/channels/messages?id=` | Сообщения канала |
| POST | `/api/messages/send?channel_id=` | Отправка сообщения |

## JWT Flow

```
1. Регистрация/Логин
   Client → Server: POST /api/auth/login {email, password}
   Server → Client: {access_token, refresh_token, user}

2. API запрос
   Client → Server: GET /api/servers/list
                      Authorization: Bearer <access_token>
   Server: Verify JWT → Extract user → Process request

3. Обновление токена (автоматически)
   Client: access_token expires in 24h
   Client: 5 min before expiry → POST /api/auth/refresh
   Server → Client: {new access_token, new refresh_token}

4. Logout
   Client → Server: POST /api/auth/logout
                      Authorization: Bearer <access_token>
   Server: Delete all refresh tokens for user
```

## Запуск

### С Docker Compose (рекомендуется)

```bash
# Запустить всё (PostgreSQL + Go Server + Frontend)
docker-compose up -d

# Проверить статус
docker-compose ps

# Посмотреть логи
docker-compose logs -f server

# Остановить
docker-compose down
```

### Локально

```bash
# 1. Запустить PostgreSQL
docker run -d \
  --name voicehub-db \
  -e POSTGRES_USER=voicehub \
  -e POSTGRES_PASSWORD=voicehub \
  -e POSTGRES_DB=voicehub \
  -p 5432:5432 \
  postgres:15-alpine

# 2. Запустить Go сервер
cd server
export DATABASE_URL="postgres://voicehub:voicehub@localhost:5432/voicehub?sslmode=disable"
export JWT_SECRET="your-secret-key-min-32-chars-long!!"
go mod tidy
go run main.go -mode=hybrid

# 3. Запустить фронтенд
npm run dev
```

## Тестирование API

### Регистрация
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "avatar": "🎮"
  }'
```

### Логин
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Создание сервера (с токеном)
```bash
TOKEN="<access_token_from_login>"

curl -X POST http://localhost:8080/api/servers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "My Server",
    "icon": "🎮"
  }'
```

### Получение списка серверов
```bash
curl http://localhost:8080/api/servers/list \
  -H "Authorization: Bearer $TOKEN"
```

## Конфигурация

### Переменные окружения

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `PORT` | `8080` | Порт сервера |
| `MODE` | `hybrid` | Режим: signaling, sfu, hybrid |
| `DATABASE_URL` | `postgres://...` | URL подключения к PostgreSQL |
| `MAX_DB_CONNS` | `25` | Максимум соединений с БД |
| `DB_CONN_MAX_LIFETIME` | `5` | Время жизни соединения (мин) |
| `JWT_SECRET` | `change-this...` | Секретный ключ для JWT |
| `JWT_EXPIRATION_HOURS` | `24` | Время жизни access token |
| `REFRESH_EXPIRATION_DAYS` | `7` | Время жизни refresh token |

## Безопасность

### Пароли
- Хэшируются с bcrypt (cost factor 10)
- Никогда не хранятся в открытом виде
- Не возвращаются в API ответах

### JWT
- Подписываются HMAC-SHA256
- Содержат user_id, username, email
- Access token: короткоживущий (24h)
- Refresh token: долгоживущий (7 дней), хранится в БД

### Middleware
- Все защищённые эндпоинты проверяют Bearer token
- Невалидные/просроченные токены отклоняются
- Пользователь добавляется в контекст запроса

## Структура проекта

```
server/
├── main.go                           # Точка входа
├── internal/
│   ├── config/
│   │   └── config.go                # Конфигурация
│   ├── database/
│   │   ├── database.go              # Подключение к БД
│   │   ├── user_repository.go       # CRUD для пользователей
│   │   ├── server_repository.go     # CRUD для серверов
│   │   ├── channel_repository.go    # CRUD для каналов
│   │   └── refresh_token_repository.go
│   ├── models/
│   │   ├── models.go                # Модели данных
│   │   └── types.go                 # WebSocket типы
│   ├── auth/
│   │   ├── jwt.go                   # JWT генерация/валидация
│   │   ├── password.go              # bcrypt хэширование
│   │   └── middleware.go            # Auth middleware
│   ├── handlers/
│   │   ├── auth_handler.go          # Auth endpoints
│   │   └── server_handler.go        # Server endpoints
│   ├── signaling/
│   │   └── handler.go               # P2P signaling
│   ├── sfu/
│   │   └── sfu.go                   # SFU server
│   └── ws/
│       └── hub.go                   # WebSocket hub
└── migrations/
    └── 001_initial_schema.sql       # SQL миграции

src/
├── App.tsx                          # Главный компонент
├── services/
│   ├── auth.ts                      # Auth service (JWT)
│   ├── websocket.ts                 # WebSocket client
│   ├── webrtc.ts                    # P2P WebRTC
│   ├── sfu.ts                       # SFU client
│   └── audio.ts                     # Audio processing
└── components/
    ├── AuthPage.tsx                 # Login/Register page
    ├── VoiceView.tsx                # Voice channel
    └── ...
```

## Что работает

✅ Регистрация с валидацией
✅ Логин с проверкой пароля
✅ JWT access + refresh tokens
✅ Автоматическое обновление токенов
✅ Logout с инвалидацией токенов
✅ Защищённые API endpoints
✅ Middleware для проверки авторизации
✅ Хранение пользователей в PostgreSQL
✅ Создание серверов с каналами
✅ Сохранение сообщений в БД
✅ Docker Compose для быстрого запуска

## Следующие этапы

- [x] Этап 1: WebSocket-сервер ✅
- [x] Этап 2: Сигнализация ✅
- [x] Этап 3: Захват микрофона ✅
- [x] Этап 4: P2P аудио ✅
- [x] Этап 5: SFU ✅
- [x] Этап 6: БД + авторизация ✅
- [ ] Этап 7: Десктоп-обёртка (Tauri/Electron)
