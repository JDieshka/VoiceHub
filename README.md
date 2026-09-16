# 🌐 MIN Messenger - Универсальное приложение

## 🎯 Концепция

**MIN Messenger** - это универсальное приложение-клиент, которое может подключаться к любому серверу VoiceHub. 

Как Discord:
- ✅ Одно приложение для всех
- ✅ Пользователь выбирает сервер при входе
- ✅ Можно подключаться к разным серверам
- ✅ Каждый может развернуть свой сервер

---

## 🚀 Для пользователей

### Как начать использовать

1. **Скачайте приложение** (или откройте веб-версию)
2. **Введите URL сервера** (получите у администратора)
   - Пример: `http://31.77.158.177:8080`
   - Пример: `https://voicehub.example.com`
3. **Зарегистрируйтесь** на этом сервере
4. **Начните общаться!**

### Смена сервера

1. Откройте **Профиль**
2. Нажмите **"Сменить сервер"**
3. Введите новый URL
4. Подключитесь к новому серверу

---

## 🛠️ Для администраторов

### Развертывание своего сервера

#### Вариант 1: VPS (рекомендуется)

**1. Арендуйте VPS**
- Минимум: 1 CPU, 1 GB RAM, 20 GB disk
- ОС: Ubuntu 22.04
- Провайдеры: Hetzner, DigitalOcean, AWS, etc.

**2. Подключитесь к серверу**
```bash
ssh root@your-server-ip
```

**3. Установите зависимости**
```bash
# Go
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# PostgreSQL
apt update
apt install -y postgresql postgresql-contrib

# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

**4. Клонируйте репозиторий**
```bash
git clone https://github.com/your-username/voicehub.git
cd voicehub
```

**5. Настройте базу данных**
```bash
# Создайте пользователя и БД
sudo -u postgres psql
CREATE USER voicehub WITH PASSWORD 'your-password';
CREATE DATABASE voicehub OWNER voicehub;
\q
```

**6. Запустите сервер**
```bash
cd server
export DATABASE_URL="postgres://voicehub:your-password@localhost:5432/voicehub"
export JWT_SECRET="your-secret-key-min-32-chars"
go run main.go
```

**7. Настройте автозапуск (systemd)**
```bash
cat > /etc/systemd/system/voicehub.service << EOF
[Unit]
Description=VoiceHub Server
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/voicehub/server
Environment="DATABASE_URL=postgres://voicehub:your-password@localhost:5432/voicehub"
Environment="JWT_SECRET=your-secret-key-min-32-chars"
ExecStart=/usr/local/go/bin/go run main.go
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable voicehub
systemctl start voicehub
```

**8. Отдайте URL пользователям**
```
http://your-server-ip:8080
```

#### Вариант 2: Docker

**1. Создайте docker-compose.yml**
```yaml
version: '3.8'

services:
  backend:
    build: ./server
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://voicehub:password@db:5432/voicehub
      - JWT_SECRET=your-secret-key
    depends_on:
      - db
  
  frontend:
    build: .
    ports:
      - "3000:80"
    depends_on:
      - backend
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=voicehub
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=voicehub
    volumes:
      - postgres_/var/lib/postgresql/data

volumes:
  postgres_
```

**2. Запустите**
```bash
docker-compose up -d
```

**3. Отдайте URL пользователям**
```
http://your-server-ip:3000
```

---

## 📱 Как это работает

### Архитектура

```
┌─────────────────┐
│   Приложение    │
│   (один код)    │
└────────┬────────┘
         │
         │ Пользователь вводит URL сервера
         │
         ▼
┌─────────────────┐
│  Проверка       │
│  доступности    │
│  GET /health    │
└────────┬────────┘
         │
         │ Сервер доступен
         │
         ▼
┌─────────────────┐
│  Авторизация    │
│  POST /api/auth │
└────────┬────────┘
         │
         │ JWT токен
         │
         ▼
┌─────────────────┐
│  Использование  │
│  WebSocket      │
│  WebRTC P2P     │
└─────────────────┘
```

### Поток данных

1. **Пользователь открывает приложение**
   - Показывается страница выбора сервера

2. **Вводит URL сервера**
   - Приложение проверяет `GET /health`
   - Если ОК → переход к авторизации
   - Если ошибка → показывается сообщение

3. **Регистрируется/Входит**
   - Все запросы идут на выбранный сервер
   - JWT токен сохраняется в localStorage

4. **Использует приложение**
   - Текстовые чаты через WebSocket
   - Голосовые чаты через WebRTC P2P
   - Видео через WebRTC P2P

5. **Меняет сервер**
   - Профиль → "Сменить сервер"
   - Возврат к шагу 1

---

## 🔧 Технические детали

### API Endpoints

**Health Check:**
```
GET /health
Response: {"status": "ok", "service": "voicehub-server", "version": "2.0.0"}
```

**Authentication:**
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET /api/auth/me
```

**WebSocket:**
```
WS /ws?userId={id}&userName={name}
```

### Хранение данных

**localStorage:**
- `voicehub-server-url` - URL выбранного сервера
- `voicehub-access-token` - JWT токен
- `voicehub-refresh-token` - Refresh токен
- `voicehub-user` - Данные пользователя

### Безопасность

- ✅ JWT токены для аутентификации
- ✅ bcrypt для хэширования паролей
- ✅ HTTPS для продакшена
- ✅ CORS настройки
- ✅ Проверка сервера перед подключением

---

## 📊 Сравнение с аналогами

| Функция | Discord | Telegram | MIN Messenger |
|---------|---------|----------|---------------|
| Выбор сервера | ✅ | ❌ | ✅ |
| Свой сервер | ❌ | ❌ | ✅ |
| P2P аудио | ❌ | ❌ | ✅ |
| P2P видео | ❌ | ❌ | ✅ |
| Open Source | ❌ | ❌ | ✅ |
| Self-hosted | ❌ | ❌ | ✅ |

---

## 🎯 Преимущества

### Для пользователей

✅ **Свобода выбора** - можно подключиться к любому серверу  
✅ **Приватность** - можно использовать свой сервер  
✅ **Контроль** - данные хранятся на вашем сервере  
✅ **Без рекламы** - open source проект  

### Для администраторов

✅ **Полный контроль** - свой сервер, свои правила  
✅ **Приватность** - данные пользователей у вас  
✅ **Кастомизация** - можно менять код  
✅ **Бесплатно** - open source  

---

## 🚀 Быстрый старт

### Для пользователей

1. Откройте приложение
2. Введите URL сервера (получите у администратора)
3. Зарегистрируйтесь
4. Начните общаться!

### Для администраторов

```bash
# 1. Клонируйте репозиторий
git clone https://github.com/your-username/voicehub.git
cd voicehub

# 2. Установите зависимости
cd server
go mod download

# 3. Настройте БД
export DATABASE_URL="postgres://voicehub:password@localhost:5432/voicehub"
export JWT_SECRET="your-secret-key"

# 4. Запустите сервер
go run main.go

# 5. Отдайте URL пользователям
# http://your-server-ip:8080
```

---

## 📚 Документация

- **SERVER_SELECTION.md** - выбор сервера
- **UNIVERSAL_CONFIG.md** - универсальная конфигурация
- **DEPLOY_31.77.158.177.md** - развертывание на конкретном сервере
- **QUICK_START.md** - быстрый старт
- **P2P_INTEGRATION_COMPLETE.md** - интеграция P2P

---

## 🎉 Итог

**MIN Messenger** - это:

✅ Универсальное приложение для любого сервера  
✅ Пользователь сам выбирает куда подключиться  
✅ Каждый может развернуть свой сервер  
✅ Open source и бесплатно  
✅ P2P для минимальной задержки  
✅ Приватность и контроль  

**Разверните свой сервер и начните общаться!** 🚀
