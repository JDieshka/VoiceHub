#!/bin/bash

# VoiceHub Simple Installation Script
# Упрощенная версия без SFU (работает с Go 1.21+)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

echo "🚀 VoiceHub Simple Installation (без SFU)"
echo ""

# Проверка Go
if ! command -v go &> /dev/null; then
    error "Go не установлен!"
    exit 1
fi

GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
info "Go версия: $GO_VERSION"

# Проверка PostgreSQL
if ! command -v psql &> /dev/null; then
    error "PostgreSQL не установлен!"
    echo "Установите: apt-get install postgresql postgresql-contrib"
    exit 1
fi
info "PostgreSQL установлен"

# Проверка Node.js
if ! command -v node &> /dev/null; then
    error "Node.js не установлен!"
    echo "Установите: curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs"
    exit 1
fi
info "Node.js установлен"

echo ""
echo "📦 Сборка упрощенной версии сервера..."

cd server

# Используем main-simple.go вместо main.go
if [ -f "main-simple.go" ]; then
    info "Используется main-simple.go (без SFU)"
    
    # Создаем временную копию
    cp main.go main.go.backup
    cp main-simple.go main.go
    
    # Загрузка зависимостей
    info "Загрузка зависимостей..."
    go mod tidy
    
    # Компиляция
    info "Компиляция..."
    if go build -o voicehub-server main.go; then
        info "✅ Бинарник успешно создан!"
        ls -lh voicehub-server
        
        # Восстанавливаем оригинальный main.go
        mv main.go.backup main.go
        
        chmod +x voicehub-server
    else
        error "Ошибка компиляции!"
        mv main.go.backup main.go
        exit 1
    fi
else
    error "main-simple.go не найден!"
    exit 1
fi

cd ..

echo ""
echo "🎨 Сборка frontend..."

if ! npm install; then
    error "Ошибка установки npm зависимостей!"
    exit 1
fi

if ! npm run build; then
    error "Ошибка сборки frontend!"
    exit 1
fi

info "✅ Frontend собран"

echo ""
echo "🔧 Настройка systemd service..."

# Останавливаем старый сервис
systemctl stop voicehub 2>/dev/null || true

# Создаем service файл
cat > /etc/systemd/system/voicehub.service << EOF
[Unit]
Description=VoiceHub Server (Simple Version)
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=$(pwd)/server
Environment="PATH=/usr/local/go/bin:/usr/bin:/bin"
Environment="DATABASE_URL=postgres://voicehub:VoiceHub2024SecurePass@localhost:5432/voicehub?sslmode=disable"
Environment="JWT_SECRET=VoiceHub2024SuperSecretJWTKeyChangeThisInProduction88!"
Environment="PORT=8080"
Environment="ALLOWED_ORIGINS=*"
ExecStart=$(pwd)/server/voicehub-server
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable voicehub

echo ""
echo "🔥 Настройка firewall..."

if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 8080/tcp
    info "Firewall настроен"
else
    warn "UFW не установлен, пропуск"
fi

echo ""
echo "🚀 Запуск сервиса..."

systemctl start voicehub
sleep 3

if systemctl is-active --quiet voicehub; then
    info "✅ Сервис запущен!"
else
    error "❌ Сервис не запустился!"
    echo ""
    echo "Логи:"
    journalctl -u voicehub -n 20 --no-pager
    exit 1
fi

echo ""
echo "🧪 Проверка API..."

sleep 2
if curl -s http://localhost:8080/health | grep -q "ok"; then
    info "✅ API работает!"
    curl -s http://localhost:8080/health
    echo ""
else
    error "❌ API не отвечает!"
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ✅ Установка завершена!                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

SERVER_IP=$(hostname -I | awk '{print $1}')

info "VoiceHub успешно установлен!"
echo ""
echo "📍 Ваш сервер:"
echo "   http://$SERVER_IP:8080"
echo ""
echo "📋 Команды:"
echo "   Логи:    journalctl -u voicehub -f"
echo "   Статус:  systemctl status voicehub"
echo "   Рестарт: systemctl restart voicehub"
echo ""
echo "⚠️  Примечание:"
echo "   Эта версия использует только P2P режим (без SFU)"
echo "   Для работы микрофона в браузере нужен HTTPS"
echo ""
