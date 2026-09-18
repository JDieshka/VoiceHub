# 🚀 Развертывание VoiceHub

## 📋 Обзор

VoiceHub можно развернуть на любом VPS или выделенном сервере. Пользователи смогут подключаться к вашему серверу через приложение.

---

## 🎯 Требования

### Сервер
- **CPU:** 1 core (2+ рекомендуется)
- **RAM:** 1 GB (2+ GB рекомендуется)
- **Disk:** 20 GB
- **OS:** Ubuntu 22.04+
- **Network:** Порт 8080 открыт

### Доступ
- SSH доступ к серверу
- Root права или sudo

---

## 🚀 Вариант 1: Автоматическая установка

### Шаг 1: Подключитесь к серверу

```bash
ssh root@your-server-ip
```

### Шаг 2: Клонируйте репозиторий

```bash
git clone https://github.com/your-username/voicehub.git
cd voicehub
```

### Шаг 3: Запустите установку

```bash
chmod +x install.sh
./install.sh
```

Скрипт автоматически:
- ✅ Установит Go 1.24+
- ✅ Установит PostgreSQL
- ✅ Создаст базу данных
- ✅ Загрузит зависимости
- ✅ Соберет backend
- ✅ Соберет frontend
- ✅ Настроит systemd service
- ✅ Настроит firewall
- ✅ Запустит сервер

### Шаг 4: Готово!

Сервер запущен на `http://your-server-ip:8080`

Отдайте URL пользователям:
```
http://your-server-ip:8080
```

---

## 🐳 Вариант 2: Docker

### Шаг 1: Установите Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### Шаг 2: Установите Docker Compose

```bash
apt-get install docker-compose-plugin
```

### Шаг 3: Клонируйте репозиторий

```bash
git clone https://github.com/your-username/voicehub.git
cd voicehub
```

### Шаг 4: Запустите

```bash
docker-compose up -d
```

### Шаг 5: Готово!

Сервер запущен на `http://your-server-ip:8080`

---

## 🔧 Вариант 3: Ручная установка

### Шаг 1: Установите Go

```bash
cd /tmp
wget https://go.dev/dl/go1.24.0.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.24.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
```

### Шаг 2: Установите PostgreSQL

```bash
apt update
apt install -y postgresql postgresql-contrib

# Создайте пользователя и БД
su - postgres -c "psql -c \"CREATE USER voicehub WITH PASSWORD 'your-password';\""
su - postgres -c "psql -c \"CREATE DATABASE voicehub OWNER voicehub;\""
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;\""
```

### Шаг 3: Установите Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### Шаг 4: Клонируйте репозиторий

```bash
git clone https://github.com/your-username/voicehub.git
cd voicehub
```

### Шаг 5: Соберите backend

```bash
cd server
go mod download
go build -o voicehub-server main.go
```

### Шаг 6: Соберите frontend

```bash
cd ..
npm install
npm run build
```

### Шаг 7: Создайте systemd service

```bash
cat > /etc/systemd/system/voicehub.service << EOF
[Unit]
Description=VoiceHub Server
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/voicehub/server
Environment="PATH=/usr/local/go/bin:/usr/bin:/bin"
Environment="DATABASE_URL=postgres://voicehub:your-password@localhost:5432/voicehub?sslmode=disable"
Environment="JWT_SECRET=your-secret-key-min-32-chars"
Environment="PORT=8080"
Environment="MODE=hybrid"
Environment="ALLOWED_ORIGINS=*"
ExecStart=/root/voicehub/server/voicehub-server
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable voicehub
systemctl start voicehub
```

### Шаг 8: Настройте firewall

```bash
ufw allow 22/tcp
ufw allow 8080/tcp
ufw allow 3478/tcp
ufw allow 3478/udp
ufw enable
```

---

## 🔒 HTTPS (обязательно для продакшена)

### Шаг 1: Получите домен

Зарегистрируйте домен (например, на Namecheap, GoDaddy).

### Шаг 2: Настройте DNS

Создайте A запись:
```
voicehub.yourdomain.com → your-server-ip
```

### Шаг 3: Установите Nginx

```bash
apt install nginx
```

### Шаг 4: Получите SSL сертификат

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d voicehub.yourdomain.com
```

### Шаг 5: Настройте Nginx

```bash
cat > /etc/nginx/sites-available/voicehub << EOF
server {
    listen 443 ssl;
    server_name voicehub.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/voicehub.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/voicehub.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
    }
}

server {
    listen 80;
    server_name voicehub.yourdomain.com;
    return 301 https://\$server_name\$request_uri;
}
EOF

ln -s /etc/nginx/sites-available/voicehub /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Шаг 6: Готово!

Сервер доступен на `https://voicehub.yourdomain.com`

---

## 🎤 TURN сервер (для работы через NAT)

### Шаг 1: Установите coturn

```bash
apt install coturn
```

### Шаг 2: Настройте coturn

```bash
cat > /etc/turnserver.conf << EOF
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
relay-ip=0.0.0.0
external-ip=your-server-ip

lt-cred-mech
realm=your-server-ip

user=voicehub:your-turn-password

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
```

### Шаг 3: Запустите coturn

```bash
systemctl enable coturn
systemctl start coturn
```

### Шаг 4: Отдайте TURN URL пользователям

```
turn:your-server-ip:3478
username: voicehub
password: your-turn-password
```

---

## 📊 Мониторинг

### Логи

```bash
# Backend
journalctl -u voicehub -f

# PostgreSQL
tail -f /var/log/postgresql/postgresql-*.log

# Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Статистика

```bash
# Использование ресурсов
htop

# Дисковое пространство
df -h

# Подключения к БД
su - postgres -c "psql -d voicehub -c 'SELECT count(*) FROM users;'"
```

---

## 🔄 Обновление

### Шаг 1: Остановите сервис

```bash
systemctl stop voicehub
```

### Шаг 2: Обновите код

```bash
cd /root/voicehub
git pull
```

### Шаг 3: Пересоберите

```bash
cd server
go build -o voicehub-server main.go

cd ..
npm install
npm run build
```

### Шаг 4: Запустите

```bash
systemctl start voicehub
```

---

## 🐛 Решение проблем

### Сервер не запускается

```bash
# Проверьте логи
journalctl -u voicehub -n 50

# Проверьте PostgreSQL
systemctl status postgresql

# Проверьте порт
ss -tuln | grep 8080
```

### Не могу подключиться

```bash
# Проверьте firewall
ufw status

# Проверьте что порт открыт
ufw allow 8080/tcp
```

### Микрофон не работает

- Нужен HTTPS для работы микрофона в браузере
- Используйте Desktop приложение (Tauri)

---

## 📞 Поддержка

- **Документация:** Все в папке проекта
- **Issues:** GitHub Issues
- **Discussions:** GitHub Discussions

---

**Готово! Ваш сервер VoiceHub развернут!** 🚀
