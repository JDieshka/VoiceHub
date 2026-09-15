# VoiceHub — Голосовые каналы и трансляции

Десктопное приложение с голосовыми каналами и возможностью трансляции экрана, реализованное в стиле Discord.

## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ WebSocket   │  │  WebRTC      │  │  UI           │  │
│  │ Client      │  │  Manager     │  │  Components   │  │
│  └──────┬──────┘  └──────┬───────┘  └───────────────┘  │
│         │                │                               │
└─────────┼────────────────┼───────────────────────────────┘
          │ WebSocket      │ WebRTC P2P (audio/video)
          │                │
┌─────────┼────────────────┼───────────────────────────────┐
│         ▼                │                               │
│  ┌─────────────┐        │                               │
│  │ Go Server   │        │                               │
│  │ ┌─────────┐ │        │                               │
│  │ │ WS Hub  │ │        │                               │
│  │ │         │ │        │                               │
│  │ │ Signal  │ │◄───────┘ (SDP/ICE exchange)            │
│  │ │ Handler │ │                                        │
│  │ └─────────┘ │                                        │
│  └─────────────┘                                        │
│                  Go Backend (port 8080)                  │
└──────────────────────────────────────────────────────────┘
```

## Что реализовано

### Этап 1: WebSocket-сервер на Go ✅
- `server/main.go` — точка входа HTTP-сервера
- `server/internal/ws/hub.go` — управление WebSocket-соединениями
- `server/internal/signaling/handler.go` — обработка подключений
- `server/internal/models/types.go` — типы данных

**Возможности сервера:**
- Регистрация/удаление клиентов
- Управление комнатами (голосовыми каналами)
- Пересылка сигнальных сообщений между пирами
- Трансляция состояния канала всем участникам
- Ping/Pong для поддержания соединения
- CORS для разработки

### Этап 2: Сигнализация для WebRTC ✅
- `src/services/websocket.ts` — WebSocket-клиент
- `src/services/webrtc.ts` — WebRTC-менеджер (P2P mesh)

**Протокол сигнализации:**
```json
// Присоединение к каналу
{"type": "join", "channelId": "vc-1", "payload": {"user": {"id": "...", "name": "..."}}}

// WebRTC Offer
{"type": "offer", "channelId": "vc-1", "from": "user-1", "to": "user-2", "payload": {"sdp": "...", "type": "offer"}}

// WebRTC Answer
{"type": "answer", "channelId": "vc-1", "from": "user-2", "to": "user-1", "payload": {"sdp": "...", "type": "answer"}}

// ICE Candidate
{"type": "ice-candidate", "channelId": "vc-1", "from": "user-1", "to": "user-2", "payload": {"candidate": "...", "sdpMLineIndex": 0}}

// Обновление состояния канала (от сервера)
{"type": "channel-update", "channelId": "vc-1", "payload": [...users]}
```

## Запуск

### 1. Запуск Go-сервера

```bash
cd server

# Установка зависимостей
go mod tidy

# Запуск сервера
go run main.go
```

Сервер запустится на `http://localhost:8080`
- WebSocket: `ws://localhost:8080/ws`
- Health check: `http://localhost:8080/health`

### 2. Запуск фронтенда

```bash
# В корне проекта
npm install
npm run dev
```

Фронтенд запустится на `http://localhost:5173`

### 3. Тестирование голосовой связи

1. Откройте фронтенд в **двух вкладках** браузера
2. В каждой вкладке подключитесь к одному голосовому каналу
3. Разрешите доступ к микрофону
4. Говорите — звук будет передаваться через WebRTC P2P!

## Структура проекта

```
├── server/                     # Go backend
│   ├── main.go                # Точка входа
│   ├── go.mod                 # Go модуль
│   └── internal/
│       ├── ws/
│       │   └── hub.go         # WebSocket hub
│       ├── signaling/
│       │   └── handler.go     # HTTP/WS обработчики
│       └── models/
│           └── types.go       # Модели данных
│
├── src/                       # React frontend
│   ├── App.tsx               # Главный компонент
│   ├── types.ts              # TypeScript типы
│   ├── store.ts              # Данные и моки
│   ├── services/
│   │   ├── websocket.ts      # WebSocket клиент
│   │   └── webrtc.ts         # WebRTC менеджер
│   └── components/
│       ├── ServerSidebar.tsx  # Список серверов
│       ├── ChannelList.tsx    # Список каналов
│       ├── Chat.tsx           # Текстовый чат
│       ├── VoiceView.tsx      # Голосовой канал
│       └── MembersList.tsx    # Список участников
│
└── README.md
```

## Технологии

### Backend (Go)
- **gorilla/websocket** — WebSocket-сервер
- **google/uuid** — генерация ID
- Стандартная библиотека `net/http` — HTTP-сервер

### Frontend (React/TypeScript)
- **React 18** — UI-фреймворк
- **TypeScript** — типизация
- **Tailwind CSS** — стилизация
- **WebRTC API** — реальное аудио/видео
- **WebSocket API** — сигнализация

### WebRTC
- **P2P Mesh topology** — каждый клиент соединён с каждым
- **STUN серверы Google** — для NAT traversal
- **Opus codec** — аудио-кодек (встроен в браузер)
- **getDisplayMedia()** — захват экрана

## Режимы работы

### Демо-режим (без сервера)
- UI полностью функционален
- Трансляция экрана работает (локально)
- Текстовый чат работает (локально)
- Нет реального аудио между клиентами

### Полный режим (с Go-сервером)
- Всё из демо-режима +
- Реальная голосовая связь через WebRTC
- Синхронизация участников между клиентами
- Реальная трансляция экрана другим пользователям
- Текстовые сообщения синхронизируются

## Следующие этапы

- [ ] Этап 3: Реальный захват микрофона (частично готов)
- [ ] Этап 4: P2P аудио между клиентами (WebRTC готов)
- [ ] Этап 5: SFU для групповых звонков (Pion WebRTC)
- [ ] Этап 6: БД + авторизация (PostgreSQL + JWT)
- [ ] Этап 7: Десктоп-обёртка (Tauri/Electron)
