# 🚀 Деплой VoiceHub на IP 31.77.158.177

## ⚠️ ВАЖНО: Ограничения работы без домена

**Без HTTPS (без домена) микрофон НЕ БУДЕТ РАБОТАТЬ в браузере!**

Это ограничение безопасности браузеров - доступ к микрофону разрешен только через HTTPS или localhost.

### Решения:

1. **Использовать Desktop приложение (Tauri)** ✅ РЕКОМЕНДУЕТСЯ
   - Скачиваете .exe/.dmg/.AppImage
   - Работает через HTTP без ограничений
   - Полноценный доступ к микрофону

2. **Получить бесплатный домен**
   - DuckDNS.org - бесплатный поддомен
   - No-IP.com - бесплатный поддомен
   - Затем настроить HTTPS через Let's Encrypt

3. **Использовать самоподписанный сертификат** ⚠️
   - Браузер будет показывать предупреждение
   - Пользователям нужно будет принять риск
   - Не рекомендуется для продакшна

---

## 📋 Быстрый старт

### Шаг 1: Подключение к серверу

```bash
# Подключитесь к серверу по SSH
ssh root@31.77.158.177

# Или если используете ключ
ssh -i ~/.ssh/your_key.pem root@31.77.158.177
```

### Шаг 2: Автоматический деплой (рекомендуется)

```bash
# На вашей локальной машине
chmod +x deploy.sh
./deploy.sh
```

Скрипт автоматически:
- ✅ Установит Go, PostgreSQL, Node.js
- ✅ Скопирует файлы проекта
- ✅ Соберет backend и frontend
- ✅ Настроит firewall
- ✅ Создаст systemd service
- ✅ Запустит сервер

### Шаг 3: Настройка TURN сервера (опционально, но рекомендуется)

```bash
# На вашей локальной машине
chmod +x setup-turn.sh
./setup-turn.sh
```

TURN сервер нужен для работы WebRTC через NAT (когда пользователи за роутерами).

---

## 🔧 Ручной деплой (если автоматический не работает)

### Шаг 1: Установка зависимостей на сервере

```bash
ssh root@31.77.158.177

# Обновление системы
apt update && apt upgrade -y

# Установка Go
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
rm go1.21.5.linux-amd64.tar.gz

# Проверка Go
go version

# Установка PostgreSQL
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Создание базы данных
sudo -u postgres psql << EOF
CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';
CREATE DATABASE voicehub OWNER voicehub;
GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;
EOF

# Установка Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Проверка Node.js
node --version
npm --version
```

### Шаг 2: Загрузка проекта

```bash
# На вашей локальной машине
rsync -avz --exclude='node_modules' --exclude='.git' --exclude='dist' \
    ./ root@31.77.158.177:/opt/voicehub/

# Или через scp
scp -r ./ root@31.77.158.177:/opt/voicehub/
```

### Шаг 3: Сборка backend

```bash
ssh root@31.77.158.177
cd /opt/voicehub/server

# Установка зависимостей
go mod download

# Сборка
go build -o voicehub-server main.go

# Проверка
./voicehub-server -h
```

### Шаг 4: Сборка frontend

```bash
cd /opt/voicehub

# Установка зависимостей
npm install

# Сборка
npm run build

# Проверка
ls -la dist/
```

### Шаг 5: Настройка firewall

```bash
# Установка ufw
apt install -y ufw

# Разрешение SSH
ufw allow 22/tcp

# Разрешение HTTP (backend)
ufw allow 8080/tcp

# Разрешение TURN (если используется)
ufw allow 3478/tcp
ufw allow 3478/udp

# Включение firewall
ufw enable
```

### Шаг 6: Создание systemd service

```bash
cat > /etc/systemd/system/voicehub.service << 'EOF'
[Unit]
Description=VoiceHub Server
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/voicehub/server
Environment="DATABASE_URL=postgres://voicehub:VoiceHub2024SecurePass@localhost:5432/voicehub?sslmode=disable"
Environment="JWT_SECRET=VoiceHub2024SuperSecretJWTKeyChangeThisInProduction88!"
Environment="PORT=8080"
Environment="MODE=hybrid"
Environment="ALLOWED_ORIGINS=*"
ExecStart=/opt/voicehub/server/voicehub-server
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Активация service
systemctl daemon-reload
systemctl enable voicehub
systemctl start voicehub

# Проверка статуса
systemctl status voicehub
```

### Шаг 7: Проверка работы

```bash
# Проверка backend
curl http://31.77.158.177:8080/health

# Должно вернуть:
# {"status":"ok","service":"voicehub-server","version":"2.0.0"}

# Проверка логов
journalctl -u voicehub -f
```

---

## 🖥️ Использование Desktop приложения (РЕКОМЕНДУЕТСЯ)

Поскольку без HTTPS микрофон не работает в браузере, используйте Desktop приложение:

### Сборка Desktop приложения

```bash
# На вашей локальной машине

# Установка Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Установка Tauri CLI
cargo install tauri-cli

# Сборка для вашей ОС
cargo tauri build
```

### Настройка Desktop приложения

Перед сборкой обновите `src/config.ts`:

```typescript
export const config = {
  apiUrl: 'http://31.77.158.177:8080',
  wsUrl: 'ws://31.77.158.177:8080/ws',
  sfuUrl: 'ws://31.77.158.177:8080/sfu',
  
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // Раскомментируйте если настроили TURN:
    // {
    //   urls: 'turn:31.77.158.177:3478',
    //   username: 'voicehub',
    //   credential: 'VoiceHub2024TurnPass123'
    // }
  ],
};
```

### Распространение

После сборки раздайте пользователям:
- **Windows:** `src-tauri/target/release/bundle/msi/VoiceHub_2.0.0_x64.msi`
- **macOS:** `src-tauri/target/release/bundle/dmg/VoiceHub_2.0.0.dmg`
- **Linux:** `src-tauri/target/release/bundle/appimage/VoiceHub_2.0.0_amd64.AppImage`

---

## 🌐 Использование веб-версии (с ограничениями)

Если хотите использовать веб-версию:

### Вариант 1: Только текстовый чат

Веб-версия будет работать для:
- ✅ Регистрация/логин
- ✅ Текстовый чат
- ✅ Создание серверов
- ❌ Голосовые каналы (микрофон не работает)
- ❌ Трансляция экрана

Откройте: `http://31.77.158.177:8080`

### Вариант 2: Получить бесплатный домен

1. Зарегистрируйте бесплатный поддомен на DuckDNS.org
2. Настройте DNS запись на 31.77.158.177
3. Получите SSL сертификат через Let's Encrypt
4. Настройте HTTPS

Подробная инструкция: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🔧 Настройка TURN сервера (опционально)

TURN сервер нужен для работы WebRTC когда пользователи за NAT (роутерами).

### Автоматическая настройка

```bash
chmod +x setup-turn.sh
./setup-turn.sh
```

### Ручная настройка

```bash
ssh root@31.77.158.177

# Установка coturn
apt install -y coturn

# Включение coturn
sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn

# Настройка
cat > /etc/turnserver.conf << 'EOF'
listening-port=3478
listening-ip=0.0.0.0
relay-ip=0.0.0.0
external-ip=31.77.158.177

lt-cred-mech
realm=31.77.158.177

user=voicehub:VoiceHub2024TurnPass123

fingerprint
no-tlsv1
no-tlsv1_1

max-bps=0
total-quota=0
bps-capacity=0

verbose
log-file=/var/log/turnserver.log

no-daemon
no-cli
EOF

# Создание пользователя
turnadmin -a -u voicehub -p VoiceHub2024TurnPass123 -r 31.77.158.177

# Запуск
systemctl enable coturn
systemctl restart coturn

# Проверка
systemctl status coturn
netstat -tuln | grep 3478
```

### Обновление конфигурации клиента

После настройки TURN обновите `.env`:

```bash
VITE_TURN_URL=turn:31.77.158.177:3478
VITE_TURN_USERNAME=voicehub
VITE_TURN_PASSWORD=VoiceHub2024TurnPass123
```

И пересоберите frontend:

```bash
npm run build
```

---

## 📊 Мониторинг

### Логи backend

```bash
# В реальном времени
journalctl -u voicehub -f

# Последние 100 строк
journalctl -u voicehub -n 100

# За сегодня
journalctl -u voicehub --since today
```

### Логи PostgreSQL

```bash
# Docker (если используете)
docker logs voicehub-postgres

# Системный PostgreSQL
tail -f /var/log/postgresql/postgresql-*.log
```

### Статистика

```bash
# Использование ресурсов
htop

# Дисковое пространство
df -h

# Подключения к БД
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## 🔄 Обновление

### Обновление backend

```bash
ssh root@31.77.158.177
cd /opt/voicehub/server

# Загрузка новых файлов
# (скопируйте измененные файлы)

# Пересборка
go build -o voicehub-server main.go

# Рестарт
systemctl restart voicehub
```

### Обновление frontend

```bash
ssh root@31.77.158.177
cd /opt/voicehub

# Загрузка новых файлов
# (скопируйте измененные файлы)

# Пересборка
npm install
npm run build

# Nginx автоматически подхватит (если используется)
# Или просто обновите страницу в браузере
```

---

## 🐛 Решение проблем

### Проблема: Сервер не запускается

```bash
# Проверка логов
journalctl -u voicehub -n 50

# Проверка PostgreSQL
systemctl status postgresql

# Проверка порта
netstat -tuln | grep 8080
```

### Проблема: Не могу подключиться к серверу

```bash
# Проверка firewall
ufw status

# Проверка что сервис запущен
systemctl status voicehub

# Проверка извне
curl http://31.77.158.177:8080/health
```

### Проблема: Микрофон не работает в браузере

**Это нормально!** Без HTTPS микрофон не работает в браузере.

**Решения:**
1. Используйте Desktop приложение (Tauri) ✅
2. Получите домен и настройте HTTPS
3. Используйте самоподписанный сертификат (не рекомендуется)

### Проблема: WebRTC не работает (нет аудио)

```bash
# Проверка TURN сервера
systemctl status coturn
netstat -tuln | grep 3478

# Проверка firewall
ufw status | grep 3478

# Тест TURN
# Используйте https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
```

---

## 📞 Полезные команды

### Управление сервисом

```bash
# Статус
systemctl status voicehub

# Запуск
systemctl start voicehub

# Остановка
systemctl stop voicehub

# Рестарт
systemctl restart voicehub

# Включить автозапуск
systemctl enable voicehub

# Отключить автозапуск
systemctl disable voicehub
```

### Управление PostgreSQL

```bash
# Статус
systemctl status postgresql

# Подключение
sudo -u postgres psql -d voicehub

# Бэкап
sudo -u postgres pg_dump voicehub > backup.sql

# Восстановление
sudo -u postgres psql voicehub < backup.sql
```

### Управление TURN

```bash
# Статус
systemctl status coturn

# Логи
journalctl -u coturn -f

# Рестарт
systemctl restart coturn
```

---

## ✅ Чек-лист

- [ ] Сервер доступен по SSH
- [ ] Go установлен
- [ ] PostgreSQL установлен и настроен
- [ ] Node.js установлен
- [ ] Файлы проекта загружены
- [ ] Backend собран
- [ ] Frontend собран
- [ ] Firewall настроен (порты 22, 8080, 3478)
- [ ] Systemd service создан
- [ ] Сервер запущен
- [ ] Backend отвечает на `/health`
- [ ] TURN сервер настроен (опционально)
- [ ] Desktop приложение собрано (рекомендуется)

---

## 🎉 Готово!

Ваш VoiceHub сервер работает на **http://31.77.158.177:8080**

### Что дальше:

1. **Соберите Desktop приложение** для полноценной работы с микрофоном
2. **Настройте TURN сервер** для работы через NAT
3. **Раздайте приложение** пользователям
4. **Получите домен** для HTTPS (опционально)

### Контакты для поддержки:

- Логи: `journalctl -u voicehub -f`
- Статус: `systemctl status voicehub`
- Документация: [README.md](./README.md), [ARCHITECTURE.md](./ARCHITECTURE.md)
