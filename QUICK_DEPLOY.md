# 🚀 Быстрое развертывание VoiceHub на VPS

## Краткая инструкция

### 1. Подключение и клонирование

```bash
ssh root@YOUR_SERVER_IP
cd /opt
git clone -b go-desktop-voice-app-5e8f3 --single-branch https://github.com/JDieshka/VoiceHub.git
cd VoiceHub
```

### 2. Установка зависимостей

```bash
# Go 1.24+
cd /tmp
wget https://go.dev/dl/go1.24.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.24.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
cd /opt/VoiceHub

# PostgreSQL
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Настройка базы данных

```bash
sudo -u postgres psql << EOF
CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';
CREATE DATABASE voicehub OWNER voicehub;
GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;
EOF
```

### 4. Сборка проекта

```bash
# Backend
cd /opt/VoiceHub/server
go mod download
go build -o voicehub-server main.go
chmod +x voicehub-server
cd ..

# Frontend
npm install
npm run build
```

### 5. Настройка systemd

```bash
sudo nano /etc/systemd/system/voicehub.service
```

**Вставьте:**
```ini
[Unit]
Description=VoiceHub Server
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/VoiceHub/server
Environment="PATH=/usr/local/go/bin:/usr/bin:/bin"
Environment="DATABASE_URL=postgres://voicehub:VoiceHub2024SecurePass@localhost:5432/voicehub?sslmode=disable"
Environment="JWT_SECRET=VoiceHub2024SuperSecretJWTKeyChangeThisInProduction88!"
Environment="PORT=8080"
Environment="MODE=hybrid"
Environment="ALLOWED_ORIGINS=*"
ExecStart=/opt/VoiceHub/server/voicehub-server
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Сохраните:** `Ctrl+O`, `Enter`, `Ctrl+X`

### 6. Запуск сервиса

```bash
sudo systemctl daemon-reload
sudo systemctl enable voicehub
sudo systemctl start voicehub
sudo systemctl status voicehub
```

### 7. Настройка firewall

```bash
sudo apt-get install -y ufw
sudo ufw allow 22/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw enable
```

### 8. Проверка

```bash
# API
curl http://localhost:8080/health

# Браузер
# Откройте: http://YOUR_SERVER_IP:8080
```

---

## Полезные команды

```bash
# Логи
sudo journalctl -u voicehub -f

# Рестарт
sudo systemctl restart voicehub

# Статус
sudo systemctl status voicehub

# Остановка
sudo systemctl stop voicehub
```

---

## Готово! 🎉

Сервер доступен по адресу: `http://YOUR_SERVER_IP:8080`

**Полная инструкция:** [DEPLOY_STEP_BY_STEP.md](./DEPLOY_STEP_BY_STEP.md)
