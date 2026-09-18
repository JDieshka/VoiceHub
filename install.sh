#!/bin/bash

# VoiceHub Installation Script - Улучшенная версия с диагностикой
# Использование: ./install.sh

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
header "║     VoiceHub Installation Script v2.0                      ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""

# Определяем директорию проекта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
PROJECT_ROOT="$(pwd)"

info "Директория проекта: $PROJECT_ROOT"
echo ""

# ═══════════════════════════════════════════════════════════════
# ПРОВЕРКА 1: Структура проекта
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Проверка 1: Структура проекта"
header "═══════════════════════════════════════════════════════════"
echo ""

if [ ! -f "server/main.go" ]; then
    error "Файл server/main.go не найден!"
    echo ""
    echo "Текущая директория: $(pwd)"
    echo "Содержимое:"
    ls -la
    echo ""
    echo "Убедитесь что вы находитесь в корне проекта VoiceHub"
    exit 1
fi

if [ ! -f "server/go.mod" ]; then
    error "Файл server/go.mod не найден!"
    exit 1
fi

info "Структура проекта корректна"
echo ""

# ═══════════════════════════════════════════════════════════════
# ПРОВЕРКА 2: Go установлен
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Проверка 2: Go установлен"
header "═══════════════════════════════════════════════════════════"
echo ""

# Добавляем Go в PATH если он установлен
if [ -d "/usr/local/go/bin" ]; then
    export PATH=$PATH:/usr/local/go/bin
fi

if ! command -v go &> /dev/null; then
    warn "Go не установлен. Устанавливаем Go 1.24.0..."
    
    cd /tmp
    
    # Удаляем старую версию если есть
    if [ -d "/usr/local/go" ]; then
        info "Удаление старой версии Go..."
        rm -rf /usr/local/go
    fi
    
    # Скачиваем Go
    info "Скачивание Go 1.24.0..."
    if ! wget -q --show-progress https://go.dev/dl/go1.24.0.linux-amd64.tar.gz -O go1.24.0.linux-amd64.tar.gz; then
        error "Не удалось скачать Go"
        exit 1
    fi
    
    # Распаковываем
    info "Распаковка Go..."
    tar -C /usr/local -xzf go1.24.0.linux-amd64.tar.gz
    
    # Добавляем в PATH
    if ! grep -q "/usr/local/go/bin" ~/.bashrc; then
        echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
    fi
    
    export PATH=$PATH:/usr/local/go/bin
    
    # Удаляем архив
    rm go1.24.0.linux-amd64.tar.gz
    
    cd "$PROJECT_ROOT"
    
    info "Go успешно установлен"
fi

# Проверяем версию Go
GO_VERSION=$(go version)
info "Go версия: $GO_VERSION"
echo ""

# ═══════════════════════════════════════════════════════════════
# ПРОВЕРКА 3: PostgreSQL
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Проверка 3: PostgreSQL"
header "═══════════════════════════════════════════════════════════"
echo ""

if ! command -v psql &> /dev/null; then
    warn "PostgreSQL не установлен. Устанавливаем..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    info "PostgreSQL установлен"
else
    info "PostgreSQL уже установлен"
fi

# Проверяем что PostgreSQL запущен
if ! systemctl is-active --quiet postgresql; then
    warn "PostgreSQL не запущен. Запускаем..."
    systemctl start postgresql
fi

# Создаем базу данных и пользователя
info "Настройка базы данных..."

# Проверяем существует ли пользователь
if su - postgres -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='voicehub'\"" | grep -q 1; then
    warn "Пользователь voicehub уже существует"
    
    if confirm "Удалить и пересоздать пользователя voicehub?"; then
        info "Удаление старого пользователя..."
        su - postgres -c "psql -c \"DROP USER IF EXISTS voicehub;\"" || error "Не удалось удалить пользователя"
        
        info "Создание пользователя..."
        su - postgres -c "psql -c \"CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';\"" || error "Не удалось создать пользователя"
        info "Пользователь пересоздан"
    else
        info "Пользователь оставлен"
    fi
else
    info "Создание пользователя voicehub..."
    su - postgres -c "psql -c \"CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';\"" || error "Не удалось создать пользователя"
    info "Пользователь создан"
fi

# Проверяем существует ли БД
if su - postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='voicehub'\"" | grep -q 1; then
    warn "База данных voicehub уже существует"
    
    if confirm "Удалить и пересоздать базу данных voicehub?"; then
        info "Закрытие подключений к БД..."
        su - postgres -c "psql -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='voicehub';\"" 2>/dev/null || true
        
        info "Удаление старой БД..."
        su - postgres -c "psql -c \"DROP DATABASE IF EXISTS voicehub;\"" || error "Не удалось удалить БД"
        
        info "Создание новой БД..."
        su - postgres -c "psql -c \"CREATE DATABASE voicehub OWNER voicehub;\"" || error "Не удалось создать БД"
        info "База данных пересоздана"
    else
        info "База данных оставлена"
    fi
else
    info "Создание базы данных voicehub..."
    su - postgres -c "psql -c \"CREATE DATABASE voicehub OWNER voicehub;\"" || error "Не удалось создать БД"
    info "База данных создана"
fi

# Предоставляем привилегии
info "Настройка привилегий..."
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;\"" || warn "Не удалось предоставить привилегии"

info "База данных настроена"
echo ""

# ═══════════════════════════════════════════════════════════════
# ПРОВЕРКА 4: Node.js
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Проверка 4: Node.js"
header "═══════════════════════════════════════════════════════════"
echo ""

if ! command -v node &> /dev/null; then
    warn "Node.js не установлен. Устанавливаем..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    info "Node.js установлен"
else
    NODE_VERSION=$(node --version)
    info "Node.js версия: $NODE_VERSION"
fi
echo ""

# ═══════════════════════════════════════════════════════════════
# СБОРКА BACKEND
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Сборка Backend (Go)"
header "═══════════════════════════════════════════════════════════"
echo ""

cd server

info "Директория: $(pwd)"
echo ""

# Проверяем наличие файлов
if [ ! -f "main.go" ]; then
    error "main.go не найден!"
    exit 1
fi

if [ ! -f "go.mod" ]; then
    error "go.mod не найден!"
    exit 1
fi

# Загрузка зависимостей
info "Обновление go.sum и загрузка зависимостей Go (это может занять 2-3 минуты)..."

# Выполняем go mod tidy для обновления go.sum
if ! go mod tidy; then
    error "Не удалось обновить go.sum"
    echo ""
    echo "Попробуйте вручную:"
    echo "  cd server"
    echo "  go mod tidy"
    exit 1
fi

info "go.sum обновлен"

# Загружаем зависимости
if ! go mod download; then
    error "Не удалось загрузить зависимости Go"
    echo ""
    echo "Попробуйте вручную:"
    echo "  cd server"
    echo "  go mod download"
    exit 1
fi

info "Зависимости загружены"
echo ""

# Определяем какую версию использовать
GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
GO_MAJOR=$(echo $GO_VERSION | cut -d. -f1)
GO_MINOR=$(echo $GO_VERSION | cut -d. -f2)

USE_SIMPLE=false

# Проверяем версию Go
if [ "$GO_MAJOR" -lt 1 ] || ([ "$GO_MAJOR" -eq 1 ] && [ "$GO_MINOR" -lt 24 ]); then
    warn "Go $GO_VERSION < 1.24, используется упрощенная версия (без SFU)"
    USE_SIMPLE=true
fi

# Проверяем наличие main-simple.go
if [ "$USE_SIMPLE" = true ] && [ -f "main-simple.go" ]; then
    info "Используется main-simple.go (упрощенная версия без SFU)"
    cp main.go main.go.backup
    cp main-simple.go main.go
else
    info "Используется main.go (полная версия с SFU)"
fi

# Компиляция
info "Компиляция бинарника..."
echo ""

# Выводим подробную информацию о компиляции
if ! go build -v -o voicehub-server main.go 2>&1; then
    error "Ошибка компиляции!"
    
    # Восстанавливаем оригинал если использовали simple версию
    if [ "$USE_SIMPLE" = true ] && [ -f "main.go.backup" ]; then
        mv main.go.backup main.go
    fi
    
    echo ""
    echo "Попробуйте скомпилировать вручную для диагностики:"
    echo "  cd server"
    echo "  go build -v -o voicehub-server main.go"
    exit 1
fi

# Восстанавливаем оригинал если использовали simple версию
if [ "$USE_SIMPLE" = true ] && [ -f "main.go.backup" ]; then
    mv main.go.backup main.go
    info "Оригинальный main.go восстановлен"
fi

echo ""

# Проверяем что бинарник создан
if [ ! -f "voicehub-server" ]; then
    error "Бинарник не создан!"
    exit 1
fi

# Делаем исполняемым
chmod +x voicehub-server

# Показываем информацию о бинарнике
info "Бинарник успешно создан!"
ls -lh voicehub-server
echo ""

# Проверяем что бинарник работает
info "Проверка бинарника..."
if ./voicehub-server --help 2>&1 | head -n 1; then
    info "Бинарник работает"
else
    warn "Бинарник не ответил на --help, но это может быть нормально"
fi
echo ""

cd "$PROJECT_ROOT"

# ═══════════════════════════════════════════════════════════════
# СБОРКА FRONTEND
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Сборка Frontend (React)"
header "═══════════════════════════════════════════════════════════"
echo ""

info "Установка зависимостей Node.js..."
if ! npm install; then
    error "Не удалось установить зависимости Node.js"
    exit 1
fi

info "Зависимости установлены"
echo ""

info "Сборка frontend..."
if ! npm run build; then
    error "Не удалось собрать frontend"
    exit 1
fi

info "Frontend собран"
echo ""

# Проверяем что dist создан
if [ ! -d "dist" ]; then
    error "Директория dist не создана!"
    exit 1
fi

info "Файлы frontend:"
ls -lh dist/
echo ""

# ═══════════════════════════════════════════════════════════════
# НАСТРОЙКА SYSTEMD SERVICE
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Настройка systemd service"
header "═══════════════════════════════════════════════════════════"
echo ""

# Останавливаем старый сервис если есть
if systemctl is-active --quiet voicehub 2>/dev/null; then
    info "Остановка старого сервиса..."
    systemctl stop voicehub
fi

# Создаем service файл
info "Создание service файла..."
cat > /etc/systemd/system/voicehub.service << EOF
[Unit]
Description=VoiceHub Server
After=network.target postgresql.service
StartLimitIntervalSec=60
StartLimitBurst=3

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_ROOT/server
Environment="PATH=/usr/local/go/bin:/usr/bin:/bin"
Environment="DATABASE_URL=postgres://voicehub:VoiceHub2024SecurePass@localhost:5432/voicehub?sslmode=disable"
Environment="JWT_SECRET=VoiceHub2024SuperSecretJWTKeyChangeThisInProduction88!"
Environment="PORT=8080"
Environment="MODE=hybrid"
Environment="ALLOWED_ORIGINS=*"
ExecStart=$PROJECT_ROOT/server/voicehub-server
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

info "Service файл создан"
systemctl daemon-reload
systemctl enable voicehub
echo ""

# ═══════════════════════════════════════════════════════════════
# НАСТРОЙКА FIREWALL
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Настройка firewall"
header "═══════════════════════════════════════════════════════════"
echo ""

if command -v ufw &> /dev/null; then
    info "Настройка UFW..."
    ufw allow 22/tcp comment 'SSH'
    ufw allow 8080/tcp comment 'VoiceHub HTTP'
    ufw allow 3478/tcp comment 'TURN TCP'
    ufw allow 3478/udp comment 'TURN UDP'
    
    if ufw status | grep -q "22/tcp.*ALLOW"; then
        echo "y" | ufw enable
        info "Firewall включен"
    else
        error "SSH не разрешен! Firewall не будет включен"
    fi
    
    info "Статус firewall:"
    ufw status verbose
else
    warn "UFW не установлен"
fi
echo ""

# ═══════════════════════════════════════════════════════════════
# ЗАПУСК СЕРВИСА
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Запуск сервиса"
header "═══════════════════════════════════════════════════════════"
echo ""

# Сброс счетчика перезапусков
systemctl reset-failed voicehub 2>/dev/null || true

info "Запуск VoiceHub..."
systemctl start voicehub

# Ждем запуска
info "Ожидание запуска (3 секунды)..."
sleep 3

# Проверяем статус
if systemctl is-active --quiet voicehub; then
    info "✅ Сервис успешно запущен!"
else
    error "❌ Сервис не запустился!"
    echo ""
    echo "Последние логи:"
    journalctl -u voicehub -n 30 --no-pager
    echo ""
    echo "Попробуйте запустить вручную для диагностики:"
    echo "  cd $PROJECT_ROOT/server"
    echo "  ./voicehub-server"
    exit 1
fi
echo ""

# ═══════════════════════════════════════════════════════════════
# ПРОВЕРКА РАБОТЫ
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Проверка работы"
header "═══════════════════════════════════════════════════════════"
echo ""

# Проверяем API
info "Проверка API..."
sleep 2
if curl -s http://localhost:8080/health | grep -q "ok"; then
    info "✅ API работает!"
    curl -s http://localhost:8080/health
    echo ""
else
    error "❌ API не отвечает!"
    echo ""
    echo "Логи:"
    journalctl -u voicehub -n 20 --no-pager
    exit 1
fi
echo ""

# ═══════════════════════════════════════════════════════════════
# ФИНАЛЬНОЕ СООБЩЕНИЕ
# ═══════════════════════════════════════════════════════════════
header "╔════════════════════════════════════════════════════════════╗"
header "║              ✅ Установка завершена!                       ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""

SERVER_IP=$(hostname -I | awk '{print $1}')

info "VoiceHub успешно установлен и работает!"
echo ""
echo "📍 Ваш сервер доступен:"
echo "   http://$SERVER_IP:8080"
echo ""
echo "📋 Полезные команды:"
echo "   Логи:    journalctl -u voicehub -f"
echo "   Статус:  systemctl status voicehub"
echo "   Рестарт: systemctl restart voicehub"
echo ""
echo "🌐 Пользователи могут подключиться:"
echo "   1. Открыть приложение"
echo "   2. Ввести: $SERVER_IP"
echo "   3. Зарегистрироваться"
echo "   4. Начать общение!"
echo ""
