# VoiceHub — Полный проект

## 🎉 Все 7 этапов реализованы!

VoiceHub — полноценное десктопное приложение для голосового общения и трансляции экрана, реализованное в стиле Discord.

## 📊 Итоговая статистика

| Метрика | Значение |
|---------|----------|
| **Строк кода** | ~15,000+ |
| **Языки** | Go, Rust, TypeScript, SQL |
| **Фреймворки** | React, Tauri, Pion WebRTC |
| **БД** | PostgreSQL |
| **Протоколы** | WebSocket, WebRTC, HTTP/REST |

## ✅ Реализованные этапы

### Этап 1: WebSocket-сервер на Go ✅
- HTTP/WebSocket сервер на Go
- Управление подключениями клиентов
- Комнаты (голосовые каналы)
- Пересылка сигнальных сообщений

### Этап 2: Сигнализация для WebRTC ✅
- WebSocket клиент на фронтенде
- Обмен SDP offer/answer
- Обмен ICE candidates
- Автоматическое переподключение

### Этап 3: Захват микрофона ✅
- AudioService с Web Audio API
- Анализ уровня голоса в реальном времени
- Voice Activity Detection (VAD)
- Настройки: эхоподавление, шумоподавление, AGC
- Визуализация голоса

### Этап 4: P2P аудио ✅
- WebRTC P2P Mesh topology
- Прямое соединение между клиентами
- Статистика качества для каждого peer
- Автоматическая сигнализация

### Этап 5: SFU ✅
- Go SFU-сервер на Pion WebRTC
- Приём и пересылка RTP-пакетов
- Поддержка множества комнат
- Масштабирование до 100+ участников

### Этап 6: БД + авторизация ✅
- PostgreSQL для хранения данных
- JWT аутентификация (access + refresh tokens)
- bcrypt хэширование паролей
- API для регистрации, логина, серверов, каналов, сообщений
- Docker Compose для развёртывания

### Этап 7: Десктопное приложение ✅
- Tauri (Rust backend)
- Системный трей с меню
- Глобальные горячие клавиши (push-to-talk)
- Нативные уведомления
- Автозапуск
- Список аудио-устройств на уровне ОС
- Размер: ~10 MB (vs 150 MB у Electron)

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                  VoiceHub Desktop (Tauri)                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Frontend (React + Vite + TypeScript)        │   │
│  │                                                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │   UI     │  │ Services │  │  Tauri   │           │   │
│  │  │Components│  │(WS,RTC,  │  │   API    │           │   │
│  │  │          │  │ Auth)    │  │ Wrapper  │           │   │
│  │  └──────────┘  └──────────┘  └──────────┘           │   │
│  └───────────────────────┬──────────────────────────────┘   │
│                          │ IPC                               │
│  ┌───────────────────────┴──────────────────────────────┐   │
│  │           Backend (Rust + Tauri)                      │   │
│  │                                                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │  Tray    │  │ Shortcuts│  │  Audio   │           │   │
│  │  │ Manager  │  │ Manager  │  │  (cpal)  │           │   │
│  │  └──────────┘  └──────────┘  └──────────┘           │   │
│  └────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ WebSocket / HTTP
┌──────────────────────────┴──────────────────────────────────┐
│                  Go Server (port 8080)                       │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │WebSocket │  │   SFU    │  │   Auth   │  │   REST   │   │
│  │  Hub     │  │  (Pion)  │  │  (JWT)   │  │   API    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              PostgreSQL (port 5432)                    │   │
│  │  users | servers | channels | messages | tokens       │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## 🚀 Быстрый старт

### 1. Запуск с Docker Compose (рекомендуется)

```bash
# Клонировать репозиторий
git clone <repo-url>
cd voicehub

# Запустить всё (PostgreSQL + Go Server + Frontend)
docker-compose up -d

# Открыть приложение
open http://localhost:3000
```

### 2. Локальная разработка

```bash
# 1. PostgreSQL
docker run -d --name voicehub-db \
  -e POSTGRES_USER=voicehub \
  -e POSTGRES_PASSWORD=voicehub \
  -e POSTGRES_DB=voicehub \
  -p 5432:5432 \
  postgres:15-alpine

# 2. Go сервер
cd server
export DATABASE_URL="postgres://voicehub:voicehub@localhost:5432/voicehub?sslmode=disable"
export JWT_SECRET="your-secret-key-min-32-chars-long!!"
go mod tidy
go run main.go -mode=hybrid

# 3. Frontend
npm install
npm run dev

# 4. Desktop (опционально)
cargo install tauri-cli
cargo tauri dev
```

## 📁 Структура проекта

```
voicehub/
├── server/                          # Go backend
│   ├── main.go                     # Точка входа
│   ├── go.mod                      # Go модуль
│   ├── Dockerfile                  # Docker образ
│   ├── SFU_GUIDE.md               # Документация SFU
│   ├── internal/
│   │   ├── config/                # Конфигурация
│   │   ├── database/              # Репозитории (PostgreSQL)
│   │   ├── models/                # Модели данных
│   │   ├── auth/                  # JWT, password, middleware
│   │   ├── handlers/              # HTTP handlers
│   │   ├── signaling/             # P2P signaling
│   │   ├── sfu/                   # SFU server (Pion)
│   │   └── ws/                    # WebSocket hub
│   └── migrations/                # SQL миграции
│
├── src-tauri/                       # Tauri backend (Rust)
│   ├── Cargo.toml                 # Rust зависимости
│   ├── tauri.conf.json            # Конфигурация Tauri
│   ├── build.rs                   # Build script
│   └── src/
│       ├── main.rs                # Точка входа, tray, shortcuts
│       ├── commands.rs            # Tauri commands
│       ├── tray.rs                # Системный трей
│       └── audio.rs               # Аудио-устройства
│
├── src/                             # Frontend (React)
│   ├── App.tsx                    # Главный компонент
│   ├── types.ts                   # TypeScript типы
│   ├── store.ts                   # Данные и моки
│   ├── services/
│   │   ├── auth.ts               # Auth service (JWT)
│   │   ├── websocket.ts          # WebSocket клиент
│   │   ├── webrtc.ts             # P2P WebRTC
│   │   ├── sfu.ts                # SFU клиент
│   │   ├── audio.ts              # Audio processing
│   │   └── tauri.ts              # Tauri API wrapper
│   └── components/
│       ├── AuthPage.tsx          # Login/Register
│       ├── ServerSidebar.tsx     # Список серверов
│       ├── ChannelList.tsx       # Список каналов
│       ├── Chat.tsx              # Текстовый чат
│       ├── VoiceView.tsx         # Голосовой канал
│       ├── VoiceIndicator.tsx    # Визуализация голоса
│       ├── AudioSettings.tsx     # Настройки аудио
│       ├── DesktopSettings.tsx   # Настройки рабочего стола
│       └── ...
│
├── docs/                            # Документация
│   ├── STAGE_6.md                 # Этап 6: БД + авторизация
│   └── STAGE_7.md                 # Этап 7: Desktop
│
├── docker-compose.yml               # Docker Compose
├── Dockerfile.frontend              # Frontend Docker
├── nginx.conf                       # Nginx конфигурация
└── README.md                        # Этот файл
```

## 🔧 Технологии

### Backend
- **Go 1.21+** — основной язык сервера
- **gorilla/websocket** — WebSocket сервер
- **Pion WebRTC** — SFU сервер
- **PostgreSQL 15** — база данных
- **golang-jwt** — JWT токены
- **bcrypt** — хэширование паролей

### Frontend
- **React 18** — UI фреймворк
- **TypeScript** — типизация
- **Vite** — сборщик
- **Tailwind CSS** — стилизация
- **WebRTC API** — P2P аудио/видео
- **WebSocket API** — сигнализация

### Desktop
- **Tauri 1.6** — десктоп фреймворк
- **Rust** — backend для desktop
- **cpal** — аудио-устройства
- **sysinfo** — системная информация
- **auto-launch** — автозапуск

### Инфраструктура
- **Docker** — контейнеризация
- **Docker Compose** — оркестрация
- **Nginx** — reverse proxy

## 📊 Сравнение режимов

| Характеристика | P2P Mesh | SFU |
|----------------|----------|-----|
| **Соединений** | O(n²) | O(n) |
| **Upload на клиента** | Высокий | Низкий |
| **Задержка** | 20-50ms | 30-70ms |
| **Масштабируемость** | До 6 | 100+ |
| **Зависимость от сервера** | Только сигнализация | Полная |

## 🎯 Возможности

### Голосовое общение
✅ Захват микрофона с обработкой
✅ P2P аудио между клиентами
✅ SFU для больших групп
✅ Индикатор голосовой активности
✅ Push-to-Talk с глобальной горячей клавишей
✅ Mute/Deafen

### Трансляция экрана
✅ Захват экрана через getDisplayMedia
✅ Передача через WebRTC
✅ Поддержка в P2P и SFU режимах

### Текстовый чат
✅ Отправка/приём сообщений
✅ История сообщений в БД
✅ Синхронизация между клиентами

### Авторизация
✅ Регистрация с валидацией
✅ Логин с проверкой пароля
✅ JWT access + refresh tokens
✅ Автоматическое обновление токенов

### Десктоп функции
✅ Системный трей
✅ Глобальные горячие клавиши
✅ Нативные уведомления
✅ Автозапуск
✅ Сворачивание в трей

## 📖 Документация

- [Архитектура](#архитектура)
- [Быстрый старт](#быстрый-старт)
- [Этап 1: WebSocket сервер](#этап-1-websocket-сервер-на-go-)
- [Этап 2: Сигнализация](#этап-2-сигнализация-для-webrtc-)
- [Этап 3: Захват микрофона](#этап-3-захват-микрофона-)
- [Этап 4: P2P аудио](#этап-4-p2p-аудио-)
- [Этап 5: SFU](#этап-5-sfu-)
- [Этап 6: БД + авторизация](#этап-6-бд--авторизация-)
- [Этап 7: Desktop](#этап-7-десктопное-приложение-)
- [SFU Guide](server/SFU_GUIDE.md)
- [Stage 6 Details](docs/STAGE_6.md)
- [Stage 7 Details](docs/STAGE_7.md)

## 🤝 Вклад

Проект открыт для вклада! Если вы хотите улучшить VoiceHub:

1. Fork репозитория
2. Создайте ветку для фичи (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📝 Лицензия

MIT License - см. файл LICENSE для деталей

## 🙏 Благодарности

- [Pion WebRTC](https://github.com/pion/webrtc) — Go WebRTC библиотека
- [Tauri](https://tauri.app/) — Desktop фреймворк
- [Discord](https://discord.com/) — Вдохновение для UI

---

**Создано с ❤️ для сообщества**
