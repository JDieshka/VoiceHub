# 🚀 Руководство по деплою VoiceHub на удалённый сервер

## 📋 Обзор

VoiceHub имеет **клиент-серверную архитектуру**:
- **Клиент** (React/Tauri) — работает у пользователей
- **Сервер** (Go + PostgreSQL) — работает на вашем VPS

Это означает, что вы можете:
1. Развернуть сервер на удалённом VPS
2. Дать пользователям доступ через браузер или desktop приложение
3. Масштабировать независимо клиент и сервер

## 🎯 Сценарии использования

### Сценарий 1: Веб-приложение (рекомендуется)

```
Пользователь                    Ваш VPS
    │                              │
    │  Браузер                     │
    │  (voicehub.example.com)      │
    │◄────────────────────────────►│
    │                              │  Go-сервер
    │                              │  PostgreSQL
    │                              │  Nginx
    │                              │
```

**Плюсы:**
- ✅ Не нужно устанавливать приложение
- ✅ Работает на любом устройстве
- ✅ Автоматические обновления
- ✅ Легко масштабировать

**Минусы:**
- ⚠️ Требует HTTPS (иначе нет доступа к микрофону)
- ⚠️ Зависит от браузера

### Сценарий 2: Desktop приложение

```
Пользователь                    Ваш VPS
    │                              │
    │  Tauri app                   │
    │  (.exe/.dmg/.AppImage)       │
    │◄────────────────────────────►│
    │                              │  Go-сервер
    │                              │  PostgreSQL
    │                              │
```

**Плюсы:**
- ✅ Нативные функции (трей, горячие клавиши)
- ✅ Лучшая производительность
- ✅ Работает без HTTPS (но рекомендуется)

**Минусы:**
- ⚠️ Нужно распространять бинарники
- ⚠️ Нужно обновлять вручную

## 🛠️ Пошаговая инструкция: Веб-приложение

### Шаг 1: Арендовать VPS

Рекомендуемые провайдеры:
- **Hetzner** (€4/мес) — 2 CPU, 4 GB RAM, 40 GB SSD
- **Timeweb** (₽300/мес) — 1 CPU, 1 GB RAM, 20 GB SSD
- **DigitalOcean** ($6/мес) — 1 CPU, 1 GB RAM, 25 GB SSD
- **AWS Lightsail** ($5/мес) — 1 CPU, 1 GB RAM, 40 GB SSD

**Минимальные требования:**
- CPU: 1 core
- RAM: 1 GB (2 GB рекомендуется)
- Disk: 20 GB
- OS: Ubuntu 22.04 LTS

### Шаг 2: Настроить домен

1. Зарегистрируйте домен (например, на Namecheap, Reg.ru)
2. Создайте DNS записи:
   ```
   A    voicehub.example.com    → IP вашего VPS
   A    *.voicehub.example.com  → IP вашего VPS (для wildcard SSL)
   ```

### Шаг 3: Подключиться к VPS

```bash
ssh root@your-server-ip
```

### Шаг 4: Установить зависимости

```bash
# Обновить систему
apt update && apt upgrade -y

# Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установить Docker Compose
apt install docker-compose-plugin -y

# Установить Certbot (для SSL)
apt install certbot -y
```

### Шаг 5: Загрузить проект

```bash
# Клонировать репозиторий
git clone https://github.com/yourusername/voicehub.git
cd voicehub

# Или загрузить через SCP
scp -r ./voicehub root@your-server-ip:/root/
```

### Шаг 6: Настроить окружение

```bash
# Создать .env файл
cp server/.env.example server/.env
nano server/.env
```

**Обязательно измените:**
```bash
# Сгенерируйте случайный ключ
JWT_SECRET=$(openssl rand -base64 48)

# Установите пароль для PostgreSQL
DATABASE_URL=postgres://voicehub:YourStrongPassword123@postgres:5432/voicehub?sslmode=disable

# Укажите ваш домен
ALLOWED_ORIGINS=https://voicehub.example.com
```

### Шаг 7: Получить SSL сертификат

```bash
# Остановить nginx если запущен
systemctl stop nginx

# Получить сертификат
certbot certonly --standalone -d voicehub.example.com

# Сертификаты будут в:
# /etc/letsencrypt/live/voicehub.example.com/fullchain.pem
# /etc/letsencrypt/live/voicehub.example.com/privkey.pem
```

### Шаг 8: Настроить TURN сервер (ОБЯЗАТЕЛЬНО!)

Без TURN сервера многие пользователи не смогут подключиться из-за NAT.

```bash
# Установить coturn
apt install coturn -y

# Настроить
nano /etc/turnserver.conf
```

**Добавьте в `/etc/turnserver.conf`:**
```conf
listening-port=3478
fingerprint
lt-cred-mech
user=voicehub:YourStrongTurnPassword
realm=voicehub.example.com
server-name=voicehub.example.com
total-quota=100
bps-capacity=0
stale-nonce
no-software-attribute
no-cli
```

**Обновите `/etc/default/coturn`:**
```bash
TURNSERVER_ENABLED=1
```

**Запустите coturn:**
```bash
systemctl enable coturn
systemctl start coturn
```

**Обновите `server/.env`:**
```bash
TURN_URL=turn:voicehub.example.com:3478
TURN_USERNAME=voicehub
TURN_PASSWORD=YourStrongTurnPassword
```

### Шаг 9: Настроить Nginx

```bash
# Установить nginx
apt install nginx -y

# Создать конфиг
nano /etc/nginx/sites-available/voicehub
```

**Добавьте:**
```nginx
server {
    listen 80;
    server_name voicehub.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name voicehub.example.com;

    ssl_certificate /etc/letsencrypt/live/voicehub.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/voicehub.example.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SFU WebSocket
    location /sfu {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Активируйте конфиг:**
```bash
ln -s /etc/nginx/sites-available/voicehub /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Шаг 10: Настроить Firewall

```bash
# Установить ufw
apt install ufw -y

# Разрешить SSH
ufw allow 22/tcp

# Разрешить HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Разрешить TURN
ufw allow 3478/tcp
ufw allow 3478/udp

# Включить firewall
ufw enable
```

### Шаг 11: Запустить приложение

```bash
# Собрать frontend
cd /root/voicehub
npm install
npm run build

# Запустить backend
cd server
docker-compose up -d

# Или без Docker:
go build -o voicehub-server
./voicehub-server -mode=hybrid
```

### Шаг 12: Настроить автозапуск

```bash
# Создать systemd service
nano /etc/systemd/system/voicehub.service
```

**Добавьте:**
```ini
[Unit]
Description=VoiceHub Server
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/voicehub/server
ExecStart=/root/voicehub/server/voicehub-server -mode=hybrid
Restart=always
RestartSec=10
Environment=DATABASE_URL=postgres://voicehub:YourPassword@localhost:5432/voicehub
Environment=JWT_SECRET=YourSecretKey

[Install]
WantedBy=multi-user.target
```

**Включите service:**
```bash
systemctl daemon-reload
systemctl enable voicehub
systemctl start voicehub
```

### Шаг 13: Настроить клиент

**Для веб-приложения:**

Создайте файл `src/config.ts`:
```typescript
export const config = {
  apiUrl: 'https://voicehub.example.com',
  wsUrl: 'wss://voicehub.example.com/ws',
  sfuUrl: 'wss://voicehub.example.com/sfu',
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { 
      urls: 'turn:voicehub.example.com:3478',
      username: 'voicehub',
      credential: 'YourStrongTurnPassword'
    }
  ]
};
```

**Для desktop приложения:**

Обновите `src-tauri/tauri.conf.json`:
```json
{
  "tauri": {
    "allowlist": {
      "all": false,
      "http": {
        "all": true,
        "scope": ["https://voicehub.example.com/**"]
      }
    }
  }
}
```

И в `src/services/tauri.ts`:
```typescript
export const config = {
  serverUrl: 'https://voicehub.example.com',
  // ... остальные настройки
};
```

### Шаг 14: Проверить работу

```bash
# Проверить backend
curl https://voicehub.example.com/health

# Должно вернуть:
# {"status":"ok","service":"voicehub-server","version":"2.0.0"}

# Проверить frontend
# Откройте https://voicehub.example.com в браузере
```

## 🖥️ Пошаговая инструкция: Desktop приложение

### Шаг 1: Собрать desktop приложение

**На вашей машине (не на VPS!):**

```bash
# Установить Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Установить Tauri CLI
cargo install tauri-cli

# Собрать для Windows
cargo tauri build --target x86_64-pc-windows-gnu

# Собрать для macOS
cargo tauri build --target x86_64-apple-darwin

# Собрать для Linux
cargo tauri build
```

**Результат:**
- Windows: `src-tauri/target/release/bundle/msi/VoiceHub_2.0.0_x64.msi`
- macOS: `src-tauri/target/release/bundle/dmg/VoiceHub_2.0.0.dmg`
- Linux: `src-tauri/target/release/bundle/appimage/VoiceHub_2.0.0_amd64.AppImage`

### Шаг 2: Настроить подключение к серверу

Перед сборкой обновите конфигурацию:

**`src/services/config.ts`:**
```typescript
export const config = {
  apiUrl: 'https://voicehub.example.com',
  wsUrl: 'wss://voicehub.example.com/ws',
  sfuUrl: 'wss://voicehub.example.com/sfu',
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { 
      urls: 'turn:voicehub.example.com:3478',
      username: 'voicehub',
      credential: 'YourStrongTurnPassword'
    }
  ]
};
```

### Шаг 3: Распространить приложение

**Вариант 1: Прямая раздача**
```bash
# Загрузите на облако
scp VoiceHub_2.0.0_x64.msi user@cloud-storage:/path/

# Дайте ссылку пользователям
# https://cloud-storage.com/VoiceHub_2.0.0_x64.msi
```

**Вариант 2: GitHub Releases**
```bash
# Создайте release на GitHub
# Загрузите бинарники в release assets
# Пользователи скачают с GitHub
```

**Вариант 3: Собственный сайт**
```html
<!-- Добавьте на сайт -->
<a href="/downloads/VoiceHub.exe">Скачать для Windows</a>
<a href="/downloads/VoiceHub.dmg">Скачать для macOS</a>
<a href="/downloads/VoiceHub.AppImage">Скачать для Linux</a>
```

## 🔧 Обслуживание

### Обновление приложения

```bash
# На VPS
cd /root/voicehub
git pull

# Обновить backend
cd server
go build -o voicehub-server
systemctl restart voicehub

# Обновить frontend
cd ..
npm install
npm run build

# Nginx автоматически подхватит новые файлы
```

### Мониторинг

```bash
# Логи backend
journalctl -u voicehub -f

# Логи nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Статистика PostgreSQL
docker exec voicehub-postgres psql -U voicehub -c "SELECT count(*) FROM users;"

# Использование ресурсов
htop
df -h
```

### Резервное копирование

```bash
# Создать скрипт бэкапа
nano /root/backup.sh
```

**Добавьте:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"

# Бэкап PostgreSQL
docker exec voicehub-postgres pg_dump -U voicehub voicehub > $BACKUP_DIR/db_$DATE.sql

# Бэкап .env
cp /root/voicehub/server/.env $BACKUP_DIR/env_$DATE

# Удалить старые бэкапы (оставить последние 7)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Backup completed: $DATE"
```

**Добавьте в cron:**
```bash
chmod +x /root/backup.sh
crontab -e

# Добавьте строку (бэкап каждый день в 3:00)
0 3 * * * /root/backup.sh
```

### Автоматическое обновление SSL

```bash
# Certbot автоматически обновляет сертификаты
# Проверить:
certbot renew --dry-run

# Добавить в cron (если не добавлено автоматически)
echo "0 0,12 * * * root certbot renew --quiet" >> /etc/crontab
```

## 🐛 Решение проблем

### Проблема: Не работает микрофон

**Причина:** Нет HTTPS

**Решение:**
```bash
# Проверить SSL
curl -I https://voicehub.example.com

# Если ошибка, обновить сертификат
certbot renew
```

### Проблема: Не подключается аудио

**Причина:** Нет TURN сервера или заблокированы порты

**Решение:**
```bash
# Проверить TURN
nc -vz voicehub.example.com 3478

# Если не работает, проверить firewall
ufw status

# Проверить логи coturn
journalctl -u coturn -f
```

### Проблема: Медленная работа

**Причина:** Недостаточно ресурсов или высокая задержка

**Решение:**
```bash
# Проверить использование ресурсов
htop

# Проверить задержку до сервера
ping voicehub.example.com

# Если VPS далеко, перенести ближе к пользователям
```

### Проблема: Пользователи не могут зарегистрироваться

**Причина:** Ошибка в базе данных или CORS

**Решение:**
```bash
# Проверить логи backend
journalctl -u voicehub -f

# Проверить PostgreSQL
docker logs voicehub-postgres

# Проверить CORS в .env
cat server/.env | grep ALLOWED_ORIGINS
```

## 📊 Масштабирование

### Вертикальное масштабирование

Увеличьте ресурсы VPS:
- Больше CPU
- Больше RAM
- Быстрее диск (SSD → NVMe)

### Горизонтальное масштабирование

**Для backend:**
```bash
# Запустить несколько экземпляров
systemctl start voicehub@1
systemctl start voicehub@2
systemctl start voicehub@3

# Настроить load balancer (Nginx/HAProxy)
```

**Для PostgreSQL:**
```bash
# Репликация
# Master-Slave setup
# Или использовать managed PostgreSQL (AWS RDS, etc)
```

**Для WebRTC:**
```bash
# Несколько SFU серверов
# Load balancer для WebSocket соединений
# Или использовать облачные SFU (Twilio, Agora)
```

## 💰 Стоимость

### Минимальная конфигурация

| Компонент | Провайдер | Стоимость/мес |
|-----------|-----------|---------------|
| VPS (1 CPU, 1 GB) | Hetzner | €4 |
| Домен | Namecheap | $10/год |
| SSL | Let's Encrypt | Бесплатно |
| **Итого** | | **~€5/мес** |

### Рекомендуемая конфигурация (до 100 пользователей)

| Компонент | Провайдер | Стоимость/мес |
|-----------|-----------|---------------|
| VPS (2 CPU, 4 GB) | Hetzner | €8 |
| Домен | Namecheap | $10/год |
| SSL | Let's Encrypt | Бесплатно |
| **Итого** | | **~€9/мес** |

### Для больших нагрузок (1000+ пользователей)

| Компонент | Провайдер | Стоимость/мес |
|-----------|-----------|---------------|
| VPS (4 CPU, 8 GB) | Hetzner | €16 |
| Managed PostgreSQL | AWS RDS | $15 |
| TURN сервер | coturn (self-hosted) | €0 |
| CDN | Cloudflare | $20 |
| **Итого** | | **~€50/мес** |

## 📚 Дополнительные ресурсы

- [Docker документация](https://docs.docker.com/)
- [Nginx документация](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Coturn TURN сервер](https://github.com/coturn/coturn)
- [PostgreSQL документация](https://www.postgresql.org/docs/)

## ✅ Чек-лист перед запуском

- [ ] VPS арендован и настроен
- [ ] Домен зарегистрирован и DNS настроены
- [ ] SSL сертификат получен
- [ ] TURN сервер установлен и работает
- [ ] Firewall настроен (22, 80, 443, 3478)
- [ ] PostgreSQL запущен и доступен
- [ ] Backend запущен и отвечает на `/health`
- [ ] Frontend собран и доступен через Nginx
- [ ] Клиент настроен на правильный URL сервера
- [ ] Регистрация работает
- [ ] Логин работает
- [ ] Голосовые каналы работают
- [ ] Трансляция экрана работает
- [ ] Бэкапы настроены
- [ ] Мониторинг настроен

## 🎉 Готово!

Теперь ваше приложение VoiceHub работает на удалённом сервере и доступно пользователям через интернет!
