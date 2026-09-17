#!/bin/bash

# VoiceHub Diagnostic and Fix Script
# Диагностика и исправление проблем с VoiceHub
# Использование: ./diagnose-fix.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }
header() { echo -e "${BLUE}$1${NC}"; }

header "╔════════════════════════════════════════════════════════════╗"
header "║     VoiceHub Diagnostic and Fix Script                     ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""

PROJECT_DIR="/opt/voicehub"

# Проверка 1: Структура проекта
header "═══════════════════════════════════════════════════════════"
header "Проверка 1: Структура проекта"
header "═══════════════════════════════════════════════════════════"
echo ""

if [ -d "$PROJECT_DIR" ]; then
    info "Директория $PROJECT_DIR существует"
else
    error "Директория $PROJECT_DIR не найдена"
    echo "   VoiceHub не установлен или установлен в другом месте"
    exit 1
fi

if [ -f "$PROJECT_DIR/server/main.go" ]; then
    info "Исходный код сервера найден"
else
    error "Исходный код сервера не найден"
    exit 1
fi

echo ""

# Проверка 2: Go установлен
header "═══════════════════════════════════════════════════════════"
header "Проверка 2: Go установлен"
header "═══════════════════════════════════════════════════════════"
echo ""

if command -v go &> /dev/null; then
    GO_VERSION=$(go version)
    info "Go установлен: $GO_VERSION"
else
    error "Go не установлен"
    echo "   Установите Go:"
    echo "   cd /tmp"
    echo "   wget https://go.dev/dl/go1.24.0.linux-amd64.tar.gz"
    echo "   tar -C /usr/local -xzf go1.24.0.linux-amd64.tar.gz"
    echo "   echo 'export PATH=\$PATH:/usr/local/go/bin' >> ~/.bashrc"
    echo "   source ~/.bashrc"
    exit 1
fi

echo ""

# Проверка 3: Бинарник
header "═══════════════════════════════════════════════════════════"
header "Проверка 3: Бинарник voicehub-server"
header "═══════════════════════════════════════════════════════════"
echo ""

if [ -f "$PROJECT_DIR/server/voicehub-server" ]; then
    info "Бинарник найден"
    ls -lh "$PROJECT_DIR/server/voicehub-server"
    
    if [ -x "$PROJECT_DIR/server/voicehub-server" ]; then
        info "Бинарник исполняемый"
    else
        warn "Бинарник не исполняемый, исправляю..."
        chmod +x "$PROJECT_DIR/server/voicehub-server"
        info "Права исправлены"
    fi
else
    error "Бинарник не найден"
    echo ""
    echo "Попытка сборки..."
    cd "$PROJECT_DIR/server"
    
    # Загрузка зависимостей
    info "Загрузка зависимостей..."
    go mod tidy
    
    # Сборка
    info "Сборка бинарника..."
    go build -o voicehub-server main.go
    
    if [ -f "voicehub-server" ]; then
        chmod +x voicehub-server
        info "Бинарник успешно собран"
        ls -lh voicehub-server
    else
        error "Не удалось собрать бинарник"
        echo ""
        echo "Попробуйте собрать вручную:"
        echo "  cd $PROJECT_DIR/server"
        echo "  go mod tidy"
        echo "  go build -o voicehub-server main.go"
        exit 1
    fi
fi

echo ""

# Проверка 4: Systemd service
header "═══════════════════════════════════════════════════════════"
header "Проверка 4: Systemd service"
header "═══════════════════════════════════════════════════════════"
echo ""

if [ -f "/etc/systemd/system/voicehub.service" ]; then
    info "Service файл найден"
    
    # Проверка конфигурации
    if grep -q "StartLimitIntervalSec" /etc/systemd/system/voicehub.service; then
        # Проверка что параметр в правильной секции
        if grep -A 5 "\[Unit\]" /etc/systemd/system/voicehub.service | grep -q "StartLimitIntervalSec"; then
            info "Конфигурация service корректна"
        else
            warn "StartLimitIntervalSec в неправильной секции, исправляю..."
            
            # Исправление конфигурации
            cat > /etc/systemd/system/voicehub.service << 'EOF'
[Unit]
Description=VoiceHub Server
After=network.target postgresql.service
StartLimitIntervalSec=60
StartLimitBurst=3

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
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
            
            info "Конфигурация исправлена"
            systemctl daemon-reload
        fi
    else
        warn "StartLimitIntervalSec не найден, но это не критично"
    fi
else
    error "Service файл не найден"
    echo ""
    echo "Создание service файла..."
    
    cat > /etc/systemd/system/voicehub.service << 'EOF'
[Unit]
Description=VoiceHub Server
After=network.target postgresql.service
StartLimitIntervalSec=60
StartLimitBurst=3

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
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    info "Service файл создан"
    systemctl daemon-reload
fi

echo ""

# Проверка 5: PostgreSQL
header "═══════════════════════════════════════════════════════════"
header "Проверка 5: PostgreSQL"
header "═══════════════════════════════════════════════════════════"
echo ""

if command -v psql &> /dev/null; then
    info "PostgreSQL установлен"
    
    if systemctl is-active --quiet postgresql; then
        info "PostgreSQL запущен"
        
        # Проверка БД
        if sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw voicehub; then
            info "База данных voicehub существует"
        else
            warn "База данных voicehub не найдена"
            echo "   Создание базы данных..."
            sudo -u postgres psql -c "CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';" 2>/dev/null || true
            sudo -u postgres psql -c "CREATE DATABASE voicehub OWNER voicehub;" 2>/dev/null || true
            sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;" 2>/dev/null || true
            info "База данных создана"
        fi
    else
        error "PostgreSQL не запущен"
        echo "   Запуск PostgreSQL..."
        systemctl start postgresql
        systemctl enable postgresql
        info "PostgreSQL запущен"
    fi
else
    error "PostgreSQL не установлен"
    echo "   Установите PostgreSQL:"
    echo "   apt-get install -y postgresql postgresql-contrib"
    exit 1
fi

echo ""

# Проверка 6: Запуск сервиса
header "═══════════════════════════════════════════════════════════"
header "Проверка 6: Запуск сервиса"
header "═══════════════════════════════════════════════════════════"
echo ""

# Остановка сервиса если запущен
if systemctl is-active --quiet voicehub; then
    info "Остановка сервиса..."
    systemctl stop voicehub
fi

# Сброс счетчика перезапусков
systemctl reset-failed voicehub 2>/dev/null || true

# Запуск сервиса
info "Запуск сервиса..."
systemctl start voicehub

# Ожидание
sleep 3

# Проверка статуса
if systemctl is-active --quiet voicehub; then
    info "Сервис успешно запущен"
else
    error "Сервис не запустился"
    echo ""
    echo "Последние логи:"
    journalctl -u voicehub -n 20 --no-pager
    echo ""
    echo "Попробуйте запустить вручную для диагностики:"
    echo "  cd $PROJECT_DIR/server"
    echo "  ./voicehub-server"
    exit 1
fi

echo ""

# Проверка 7: Тест API
header "═══════════════════════════════════════════════════════════"
header "Проверка 7: Тест API"
header "═══════════════════════════════════════════════════════════"
echo ""

sleep 2
if curl -s http://localhost:8080/health | grep -q "ok"; then
    info "API работает корректно"
    curl -s http://localhost:8080/health | jq . 2>/dev/null || curl -s http://localhost:8080/health
else
    error "API не отвечает"
    echo ""
    echo "Проверьте логи:"
    echo "  journalctl -u voicehub -f"
    exit 1
fi

echo ""

# Финальное сообщение
header "╔════════════════════════════════════════════════════════════╗"
header "║              Все проверки пройдены! ✓                      ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""
info "VoiceHub успешно установлен и работает!"
echo ""
echo "📍 Ваш сервер доступен:"
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "   http://$SERVER_IP:8080"
echo ""
echo "📋 Полезные команды:"
echo "   Логи:    journalctl -u voicehub -f"
echo "   Статус:  systemctl status voicehub"
echo "   Рестарт: systemctl restart voicehub"
echo ""
