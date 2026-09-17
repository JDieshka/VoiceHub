# 🎙️ VoiceHub

[![Release](https://github.com/YOUR_USERNAME/voicehub/actions/workflows/release.yml/badge.svg)](https://github.com/YOUR_USERNAME/voicehub/actions/workflows/release.yml)
[![Build Test](https://github.com/YOUR_USERNAME/voicehub/actions/workflows/build-test.yml/badge.svg)](https://github.com/YOUR_USERNAME/voicehub/actions/workflows/build-test.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Десктопное приложение для голосового общения и трансляции экрана в стиле Discord.

![VoiceHub](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![Version](https://img.shields.io/badge/version-2.0.0-green)

## ✨ Возможности

- 🎙️ **Голосовые каналы** — общайтесь с друзьями в реальном времени
- 📺 **Трансляция экрана** — делитесь своим экраном с другими
- 💬 **Текстовый чат** — обменивайтесь сообщениями
- 🔐 **Авторизация** — JWT токены, безопасное хранение паролей
- 🖥️ **SFU сервер** — масштабируется до 100+ участников
- 🌐 **P2P режим** — минимальная задержка для малых групп
- 🗄️ **PostgreSQL** — надёжное хранение данных
- 🎨 **Нативное приложение** — системный трей, горячие клавиши, уведомления

## 🚀 Быстрый старт

### Для пользователей

1. Скачайте последнюю версию из [Releases](https://github.com/YOUR_USERNAME/voicehub/releases/latest)
2. Установите приложение
3. Запустите и подключитесь к серверу

### Для разработчиков

```bash
# Клонируйте репозиторий
git clone https://github.com/YOUR_USERNAME/voicehub.git
cd voicehub

# Установите зависимости
npm install

# Запустите в режиме разработки
npm run tauri dev
```

## 📦 Установка

### Windows
Скачайте `.msi` или `.exe` файл из [Releases](https://github.com/YOUR_USERNAME/voicehub/releases/latest)

### macOS
Скачайте `.dmg` файл из [Releases](https://github.com/YOUR_USERNAME/voicehub/releases/latest)

### Linux
```bash
# AppImage (универсальный)
wget https://github.com/YOUR_USERNAME/voicehub/releases/latest/download/VoiceHub-x86_64.AppImage
chmod +x VoiceHub-x86_64.AppImage
./VoiceHub-x86_64.AppImage

# Debian/Ubuntu
wget https://github.com/YOUR_USERNAME/voicehub/releases/latest/download/voicehub_amd64.deb
sudo dpkg -i voicehub_amd64.deb
```

## 🏗️ Архитектура

```
┌─────────────────┐         ┌─────────────────┐
│   Desktop App   │         │   Go Server     │
│   (Tauri)       │◄───────►│   (Backend)     │
│                 │  WS/HTTP│                 │
│  - React UI     │         │  - WebSocket    │
│  - WebRTC       │         │  - SFU (Pion)   │
│  - Native API   │         │  - JWT Auth     │
└─────────────────┘         └────────┬────────┘
                                     │
                            ┌────────┴────────┐
                            │   PostgreSQL    │
                            │   (Database)    │
                            └─────────────────┘
```

## 🛠️ Технологии

### Frontend
- **React 18** — UI фреймворк
- **TypeScript** — типизация
- **Tailwind CSS** — стилизация
- **WebRTC** — голосовая связь и трансляция
- **Tauri** — десктопная оболочка

### Backend
- **Go 1.21+** — серверная часть
- **Pion WebRTC** — SFU сервер
- **gorilla/websocket** — WebSocket
- **PostgreSQL** — база данных
- **JWT** — аутентификация

## 📚 Документация

- [📖 Основная документация](README.md)
- [🏗️ Архитектура](ARCHITECTURE.md)
- [🚀 Деплой на сервер](DEPLOYMENT.md)
- [🖥️ Деплой на IP](DEPLOY_IP.md)
- [🔧 CI/CD](CI_CD_GUIDE.md)
- [📝 Этап 6: БД + Auth](docs/STAGE_6.md)
- [📝 Этап 7: Desktop](docs/STAGE_7.md)

## 🚀 Деплой сервера

### Автоматический деплой

```bash
# Скопируйте на сервер
scp -r ./* root@YOUR_SERVER_IP:/opt/voicehub/

# На сервере
cd /opt/voicehub
chmod +x install.sh
./install.sh
```

### Ручной деплой

Смотрите [DEPLOYMENT.md](DEPLOYMENT.md)

## 🎯 Создание релиза

```bash
# Создайте новый релиз
./create-release.sh 2.1.0

# Push
git push origin main
git push origin v2.1.0
```

GitHub Actions автоматически:
- ✅ Соберёт приложение для Windows, macOS, Linux
- ✅ Создаст релиз на GitHub
- ✅ Загрузит все файлы

## 📊 Статус сборок

| Платформа | Статус |
|-----------|--------|
| Windows | [![Windows](https://github.com/YOUR_USERNAME/voicehub/actions/workflows/release.yml/badge.svg)](https://github.com/YOUR_USERNAME/voicehub/actions/workflows/release.yml) |
| macOS | [![macOS](https://github.com/YOUR_USERNAME/voicehub/actions/workflows/release.yml/badge.svg)](https://github.com/YOUR_USERNAME/voicehub/actions/workflows/release.yml) |
| Linux | [![Linux](https://github.com/YOUR_USERNAME/voicehub/actions/workflows/release.yml/badge.svg)](https://github.com/YOUR_USERNAME/voicehub/actions/workflows/release.yml) |

## 🤝 Вклад

Приветствуется! Создайте issue или pull request.

## 📝 Лицензия

MIT License - см. [LICENSE](LICENSE)

## 🙏 Благодарности

- [Tauri](https://tauri.app/) — десктопный фреймворк
- [Pion](https://pion.ly/) — WebRTC для Go
- [React](https://reactjs.org/) — UI фреймворк

---

**Создано с ❤️ для сообщества**
