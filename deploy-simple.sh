#!/bin/bash

# Простой скрипт деплоя VoiceHub на сервер 31.77.158.177
# Использует только scp (есть везде по умолчанию)
# Использование: ./deploy-simple.sh

set -e

SERVER_IP="31.77.158.177"
SERVER_USER="root"
PROJECT_DIR="/opt/voicehub"

echo "🚀 Деплой VoiceHub на $SERVER_IP (простой режим)"
echo ""

# Проверка SSH подключения
echo "📡 Проверка подключения к серверу..."
if ! ssh -o ConnectTimeout=5 $SERVER_USER@$SERVER_IP "echo 'OK'" > /dev/null 2>&1; then
    echo "❌ Не удалось подключиться к серверу"
    echo "Проверьте:"
    echo "  1. SSH доступ: ssh $SERVER_USER@$SERVER_IP"
    echo "  2. Firewall: порт 22 открыт"
    exit 1
fi

echo "✅ Подключение успешно"
echo ""

# Создание директории проекта
echo "📁 Создание директории проекта..."
ssh $SERVER_USER@$SERVER_IP "mkdir -p $PROJECT_DIR"

# Копирование файлов с помощью scp
echo "📤 Копирование файлов (это может занять время)..."

# Копируем основные файлы
scp -r ./server $SERVER_USER@$SERVER_IP:$PROJECT_DIR/
scp -r ./src $SERVER_USER@$SERVER_IP:$PROJECT_DIR/
scp -r ./src-tauri $SERVER_USER@$SERVER_IP:$PROJECT_DIR/ 2>/dev/null || true
scp -r ./docs $SERVER_USER@$SERVER_IP:$PROJECT_DIR/ 2>/dev/null || true

# Копируем конфигурационные файлы
scp ./package.json $SERVER_USER@$SERVER_IP:$PROJECT_DIR/
scp ./tsconfig.json $SERVER_USER@$SERVER_IP:$PROJECT_DIR/ 2>/dev/null || true
scp ./vite.config.ts $SERVER_USER@$SERVER_IP:$PROJECT_DIR/ 2>/dev/null || true
scp ./tailwind.config.js $SERVER_USER@$SERVER_IP:$PROJECT_DIR/ 2>/dev/null || true
scp ./postcss.config.js $SERVER_USER@$SERVER_IP:$PROJECT_DIR/ 2>/dev/null || true
scp ./.env $SERVER_USER@$SERVER_IP:$PROJECT_DIR/ 2>/dev/null || true
scp ./index.html $SERVER_USER@$SERVER_IP:$PROJECT_DIR/

echo "✅ Файлы скопированы"
echo ""

# Установка зависимостей на сервере
echo "📦 Установка зависимостей..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /opt/voicehub

# Установка Go если не установлен
if ! command -v go &> /dev/null; then
    echo "📥 Установка Go..."
    cd /tmp
    wget -q https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
    tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
    echo 'export PATH=$PATH:/usr/local/go/bin' >> /root/.bashrc
    export PATH=$PATH:/usr/local/go/bin
    rm go1.21.5.linux-amd64.tar.gz
    cd /opt/voicehub
fi

# Установка PostgreSQL если не установлен
if ! command -v psql &> /dev/null; then
    echo "📥 Установка PostgreSQL..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    
    # Создание базы данных
    sudo -u postgres psql -c "CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';" || true
    sudo -u postgres psql -c "CREATE DATABASE voicehub OWNER voicehub;" || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;" || true
fi

# Установка Node.js если не установлен
if ! command -v node &> /dev/null; then
    echo "📥 Установка Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Установка зависимостей backend
echo "📦 Установка Go зависимостей..."
cd server
export PATH=$PATH:/usr/local/go/bin
go mod download

# Сборка backend
echo "🔨 Сборка backend..."
go build -o voicehub-server main.go

# Установка зависимостей frontend
echo "📦 Установка Node.js зависимостей..."
cd ..
npm install --production=false

# Сборка frontend
echo "🔨 Сборка frontend..."
npm run build
ENDSSH

echo "✅ Зависимости установлены и собраны"
echo ""

# Настройка firewall
echo "🔥 Настройка firewall..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
# Установка ufw если не установлен
if ! command -v ufw &> /dev/null; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get install -y ufw
fi

# Разрешение SSH
ufw allow 22/tcp

# Разрешение HTTP
ufw allow 8080/tcp

# Разрешение TURN (если используется)
ufw allow 3478/tcp
ufw allow 3478/udp

# Включение firewall
echo "y" | ufw enable || true
ENDSSH

echo "✅ Firewall настроен"
echo ""

# Создание systemd service
echo "⚙️ Создание systemd service..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cat > /etc/systemd/system/voicehub.service << 'EOF'
[Unit]
Description=VoiceHub Server
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/voicehub/server
Environment="PATH=/usr/local/go/bin:/usr/bin:/bin"
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

systemctl daemon-reload
systemctl enable voicehub
systemctl restart voicehub
ENDSSH

echo "✅ Service создан и запущен"
echo ""

# Проверка статуса
echo "🔍 Проверка статуса..."
sleep 3
ssh $SERVER_USER@$SERVER_IP "systemctl status voicehub --no-pager | head -n 15"

echo ""
echo "🧪 Тестирование сервера..."
sleep 2
if ssh $SERVER_USER@$SERVER_IP "curl -s http://localhost:8080/health" | grep -q "ok"; then
    echo "✅ Сервер работает!"
else
    echo "⚠️  Сервер может запускаться. Проверьте логи:"
    echo "   ssh $SERVER_USER@$SERVER_IP 'journalctl -u voicehub -n 50'"
fi

echo ""
echo "✅ Деплой завершен!"
echo ""
echo "📍 Ваш сервер доступен по адресу:"
echo "   http://$SERVER_IP:8080"
echo ""
echo "⚠️  ВАЖНО: Для работы микрофона в браузере нужен HTTPS!"
echo "   Используйте Desktop приложение (Tauri) для полноценной работы."
echo ""
echo "📋 Полезные команды:"
echo "   Логи:    ssh $SERVER_USER@$SERVER_IP 'journalctl -u voicehub -f'"
echo "   Рестарт: ssh $SERVER_USER@$SERVER_IP 'systemctl restart voicehub'"
echo "   Статус:  ssh $SERVER_USER@$SERVER_IP 'systemctl status voicehub'"
echo ""
