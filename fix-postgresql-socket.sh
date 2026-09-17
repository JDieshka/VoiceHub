#!/bin/bash

# PostgreSQL Socket Fix Script
# Исправление проблемы с сокетом PostgreSQL

set -e

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
header "║     PostgreSQL Socket Fix                                  ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Проверка статуса PostgreSQL
header "1. Проверка статуса PostgreSQL"
if systemctl is-active --quiet postgresql; then
    info "PostgreSQL запущен"
else
    warn "PostgreSQL не запущен, запускаем..."
    sudo systemctl start postgresql
    sleep 3
    
    if systemctl is-active --quiet postgresql; then
        info "PostgreSQL запущен"
    else
        error "PostgreSQL не удалось запустить"
        echo ""
        echo "Логи:"
        sudo journalctl -u postgresql -n 20 --no-pager
        exit 1
    fi
fi
echo ""

# 2. Проверка сокетов
header "2. Проверка сокетов PostgreSQL"
info "Ищем сокеты PostgreSQL..."

# Проверяем стандартные расположения
SOCKET_FOUND=false

for socket_dir in "/var/run/postgresql" "/tmp" "/var/lib/postgresql"; do
    if sudo find "$socket_dir" -name ".s.PGSQL.*" 2>/dev/null | grep -q .; then
        SOCKET_FOUND=true
        SOCKET_PATH=$(sudo find "$socket_dir" -name ".s.PGSQL.*" 2>/dev/null | head -n 1)
        info "Сокет найден: $SOCKET_PATH"
    fi
done

if [ "$SOCKET_FOUND" = false ]; then
    error "Сокет PostgreSQL не найден!"
    echo ""
    echo "Проверяем конфигурацию..."
    
    # Получаем версию PostgreSQL
    PG_VERSION=$(ls /etc/postgresql/ 2>/dev/null | head -n 1)
    
    if [ -z "$PG_VERSION" ]; then
        error "PostgreSQL не установлен или не настроен"
        exit 1
    fi
    
    info "Версия PostgreSQL: $PG_VERSION"
    
    # Проверяем unix_socket_directories
    SOCKET_DIR=$(sudo -u postgres psql -tAc "SHOW unix_socket_directories;" 2>/dev/null || echo "/var/run/postgresql")
    info "unix_socket_directories: $SOCKET_DIR"
    
    # Создаем директорию если её нет
    if [ ! -d "$SOCKET_DIR" ]; then
        warn "Директория $SOCKET_DIR не существует, создаем..."
        sudo mkdir -p "$SOCKET_DIR"
        sudo chown postgres:postgres "$SOCKET_DIR"
        sudo chmod 2775 "$SOCKET_DIR"
        info "Директория создана"
    fi
    
    # Перезапускаем PostgreSQL
    info "Перезапускаем PostgreSQL..."
    sudo systemctl restart postgresql
    sleep 3
    
    # Проверяем снова
    if sudo find "$SOCKET_DIR" -name ".s.PGSQL.*" 2>/dev/null | grep -q .; then
        SOCKET_PATH=$(sudo find "$SOCKET_DIR" -name ".s.PGSQL.*" 2>/dev/null | head -n 1)
        info "Сокет создан: $SOCKET_PATH"
    else
        error "Сокет всё ещё не создан!"
        echo ""
        echo "Логи PostgreSQL:"
        sudo tail -n 30 /var/log/postgresql/postgresql-$PG_VERSION-main.log 2>/dev/null || \
        sudo journalctl -u postgresql -n 30 --no-pager
        exit 1
    fi
fi
echo ""

# 3. Проверка подключения
header "3. Проверка подключения к PostgreSQL"
info "Тестирование подключения..."

if sudo -u postgres psql -c "SELECT 1;" > /dev/null 2>&1; then
    info "Подключение работает"
else
    error "Не удалось подключиться к PostgreSQL"
    echo ""
    echo "Пробуем подключиться через сокет..."
    
    SOCKET_PATH=$(sudo find /var/run/postgresql /tmp -name ".s.PGSQL.*" 2>/dev/null | head -n 1)
    
    if [ -n "$SOCKET_PATH" ]; then
        SOCKET_DIR=$(dirname "$SOCKET_PATH")
        info "Используем сокет: $SOCKET_PATH"
        
        if sudo -u postgres psql -h "$SOCKET_DIR" -c "SELECT 1;" > /dev/null 2>&1; then
            info "Подключение через сокет работает"
        else
            error "Подключение через сокет не работает"
            exit 1
        fi
    else
        error "Сокет не найден"
        exit 1
    fi
fi
echo ""

# 4. Создание пользователя и БД
header "4. Создание пользователя и базы данных"

# Проверяем существование пользователя
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='voicehub'" | grep -q 1; then
    info "Пользователь voicehub уже существует"
else
    info "Создание пользователя voicehub..."
    sudo -u postgres psql -c "CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';"
    info "Пользователь создан"
fi

# Проверяем существование БД
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw voicehub; then
    info "База данных voicehub уже существует"
else
    info "Создание базы данных voicehub..."
    sudo -u postgres psql -c "CREATE DATABASE voicehub OWNER voicehub;"
    info "База данных создана"
fi

# Предоставляем привилегии
info "Предоставление привилегий..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;"
info "Привилегии предоставлены"
echo ""

# 5. Проверка подключения от пользователя voicehub
header "5. Проверка подключения от пользователя voicehub"
if PGPASSWORD='VoiceHub2024SecurePass' psql -U voicehub -d voicehub -h localhost -c "SELECT 1;" > /dev/null 2>&1; then
    info "Подключение от пользователя voicehub работает"
else
    warn "Не удалось подключиться через localhost, пробуем через сокет..."
    
    SOCKET_PATH=$(sudo find /var/run/postgresql /tmp -name ".s.PGSQL.*" 2>/dev/null | head -n 1)
    SOCKET_DIR=$(dirname "$SOCKET_PATH")
    
    if PGPASSWORD='VoiceHub2024SecurePass' psql -U voicehub -d voicehub -h "$SOCKET_DIR" -c "SELECT 1;" > /dev/null 2>&1; then
        info "Подключение через сокет работает"
    else
        error "Не удалось подключиться к БД"
        exit 1
    fi
fi
echo ""

# 6. Перезапуск voicehub
header "6. Перезапуск voicehub"
info "Перезапуск сервиса voicehub..."
sudo systemctl restart voicehub
sleep 3

if systemctl is-active --quiet voicehub; then
    info "voicehub перезапущен"
else
    error "voicehub не запустился"
    echo ""
    echo "Логи:"
    sudo journalctl -u voicehub -n 20 --no-pager
    exit 1
fi
echo ""

# 7. Финальная проверка
header "7. Финальная проверка"
if curl -s http://localhost:8080/health | grep -q "ok"; then
    info "✅ Всё работает!"
    echo ""
    echo "API:"
    curl -s http://localhost:8080/health | jq . 2>/dev/null || curl -s http://localhost:8080/health
    echo ""
else
    error "❌ API не отвечает"
    echo ""
    echo "Логи voicehub:"
    sudo journalctl -u voicehub -n 20 --no-pager
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ✅ PostgreSQL исправлен!                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
info "Теперь можете запустить install.sh"
echo ""
