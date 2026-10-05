#!/bin/bash

# PostgreSQL Recovery Script
# Восстановление PostgreSQL кластера для VoiceHub

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
header "║     PostgreSQL Recovery Script                             ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""

# Проверка прав root
if [ "$EUID" -ne 0 ]; then
    error "Этот скрипт должен быть запущен с правами root"
    echo "Использование: sudo ./fix-postgresql.sh"
    exit 1
fi

# Определяем директорию проекта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
PROJECT_ROOT="$(pwd)"

info "Директория проекта: $PROJECT_ROOT"
echo ""

# ═══════════════════════════════════════════════════════════════
# ШАГ 1: Проверка PostgreSQL
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 1: Проверка PostgreSQL"
header "═══════════════════════════════════════════════════════════"
echo ""

# Проверяем установлен ли PostgreSQL
if ! command -v psql &> /dev/null; then
    error "PostgreSQL не установлен!"
    echo ""
    echo "Установите PostgreSQL:"
    echo "  sudo apt-get install -y postgresql postgresql-contrib"
    exit 1
fi

info "PostgreSQL установлен"

# Определяем версию
PG_VERSION=$(ls /etc/postgresql/ 2>/dev/null | head -n 1)
if [ -z "$PG_VERSION" ]; then
    PG_VERSION="15"
fi

info "Версия PostgreSQL: $PG_VERSION"
echo ""

# ═══════════════════════════════════════════════════════════════
# ШАГ 2: Остановка PostgreSQL
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 2: Остановка PostgreSQL"
header "═══════════════════════════════════════════════════════════"
echo ""

info "Остановка PostgreSQL..."
systemctl stop postgresql 2>/dev/null || true
sleep 2

if systemctl is-active --quiet postgresql; then
    warn "PostgreSQL всё еще запущен, принудительная остановка..."
    systemctl kill postgresql 2>/dev/null || true
    sleep 2
fi

info "PostgreSQL остановлен"
echo ""

# ═══════════════════════════════════════════════════════════════
# ШАГ 3: Проверка и создание директории данных
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 3: Проверка директории данных"
header "═══════════════════════════════════════════════════════════"
echo ""

PG_DATA_DIR="/var/lib/postgresql/$PG_VERSION/main"

info "Директория данных: $PG_DATA_DIR"

# Проверяем существует ли директория
if [ ! -d "$PG_DATA_DIR" ]; then
    warn "Директория данных отсутствует"
    info "Создание директории..."
    
    mkdir -p "$PG_DATA_DIR"
    chown postgres:postgres "$PG_DATA_DIR"
    chmod 700 "$PG_DATA_DIR"
    
    info "Директория создана"
elif [ ! -f "$PG_DATA_DIR/PG_VERSION" ]; then
    warn "Директория данных повреждена или не инициализирована"
    info "Очистка директории..."
    
    rm -rf "$PG_DATA_DIR"/*
    chown postgres:postgres "$PG_DATA_DIR"
    chmod 700 "$PG_DATA_DIR"
    
    info "Директория очищена"
else
    info "Директория данных существует"
fi
echo ""

# ═══════════════════════════════════════════════════════════════
# ШАГ 4: Инициализация кластера
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 4: Инициализация кластера PostgreSQL"
header "═══════════════════════════════════════════════════════════"
echo ""

if [ ! -f "$PG_DATA_DIR/PG_VERSION" ]; then
    info "Инициализация нового кластера PostgreSQL..."
    
    if ! sudo -u postgres /usr/lib/postgresql/$PG_VERSION/bin/initdb -D "$PG_DATA_DIR" 2>&1; then
        error "Не удалось инициализировать кластер PostgreSQL"
        echo ""
        echo "Попробуйте вручную:"
        echo "  sudo -u postgres /usr/lib/postgresql/$PG_VERSION/bin/initdb -D $PG_DATA_DIR"
        exit 1
    fi
    
    info "Кластер PostgreSQL инициализирован"
else
    info "Кластер PostgreSQL уже инициализирован"
fi
echo ""

# ═══════════════════════════════════════════════════════════════
# ШАГ 5: Настройка конфигурации
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 5: Настройка конфигурации"
header "═══════════════════════════════════════════════════════════"
echo ""

info "Настройка postgresql.conf..."

# Добавляем конфигурацию для VoiceHub
if ! grep -q "VoiceHub configuration" "$PG_DATA_DIR/postgresql.conf"; then
    cat >> "$PG_DATA_DIR/postgresql.conf" << 'EOF'

# VoiceHub configuration
listen_addresses = 'localhost'
port = 5432
EOF
    chown postgres:postgres "$PG_DATA_DIR/postgresql.conf"
    info "Конфигурация добавлена"
else
    info "Конфигурация уже существует"
fi

info "Настройка pg_hba.conf..."

# Настраиваем аутентификацию
cat > "$PG_DATA_DIR/pg_hba.conf" << 'EOF'
# PostgreSQL configuration file for VoiceHub
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections
local   all             postgres                                peer
local   all             all                                     peer

# IPv4 local connections
host    all             all             127.0.0.1/32            scram-sha-256

# IPv6 local connections
host    all             all             ::1/128                 scram-sha-256
EOF

chown postgres:postgres "$PG_DATA_DIR/pg_hba.conf"
info "pg_hba.conf настроен"
echo ""

# ═══════════════════════════════════════════════════════════════
# ШАГ 6: Запуск PostgreSQL
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 6: Запуск PostgreSQL"
header "═══════════════════════════════════════════════════════════"
echo ""

info "Запуск PostgreSQL..."
if ! systemctl start postgresql; then
    error "Не удалось запустить PostgreSQL"
    echo ""
    echo "Проверьте логи:"
    echo "  sudo journalctl -u postgresql@$PG_VERSION-main -n 20"
    exit 1
fi

# Включаем автозапуск
systemctl enable postgresql > /dev/null 2>&1

# Ждем запуска
info "Ожидание запуска PostgreSQL..."
sleep 3

# Проверяем что PostgreSQL запущен
if ! systemctl is-active --quiet postgresql@$PG_VERSION-main; then
    error "PostgreSQL не запустился"
    echo ""
    echo "Проверьте логи:"
    echo "  sudo journalctl -u postgresql@$PG_VERSION-main -n 20"
    exit 1
fi

info "PostgreSQL запущен"
echo ""

# ═══════════════════════════════════════════════════════════════
# ШАГ 7: Создание пользователя и базы данных
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 7: Создание пользователя и базы данных"
header "═══════════════════════════════════════════════════════════"
echo ""

# Создаем пользователя
info "Создание пользователя voicehub..."
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='voicehub'" 2>/dev/null | grep -q 1; then
    warn "Пользователь voicehub уже существует"
else
    if ! sudo -u postgres psql -c "CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';" 2>/dev/null; then
        error "Не удалось создать пользователя voicehub"
        exit 1
    fi
    info "Пользователь voicehub создан"
fi

# Создаем базу данных
info "Создание базы данных voicehub..."
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='voicehub'" 2>/dev/null | grep -q 1; then
    warn "База данных voicehub уже существует"
else
    if ! sudo -u postgres psql -c "CREATE DATABASE voicehub OWNER voicehub;" 2>/dev/null; then
        error "Не удалось создать базу данных voicehub"
        exit 1
    fi
    info "База данных voicehub создана"
fi

# Предоставляем привилегии
info "Настройка привилегий..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;" 2>/dev/null || warn "Не удалось предоставить привилегии"
echo ""

# ═══════════════════════════════════════════════════════════════
# ШАГ 8: Выполнение миграций
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 8: Выполнение миграций"
header "═══════════════════════════════════════════════════════════"
echo ""

# Миграция 1: Основная схема
if [ -f "$PROJECT_ROOT/server/migrations/001_initial_schema.sql" ]; then
    info "Выполнение миграции 001_initial_schema.sql..."
    if ! sudo -u postgres psql -d voicehub -f "$PROJECT_ROOT/server/migrations/001_initial_schema.sql" > /dev/null 2>&1; then
        warn "Миграция 001 не выполнена (возможно таблицы уже существуют)"
    else
        info "Миграция 001 выполнена"
    fi
else
    warn "Файл миграции 001_initial_schema.sql не найден"
fi

# Миграция 2: Добавление чатов
if [ -f "$PROJECT_ROOT/server/migrations/002_add_chats.sql" ]; then
    info "Выполнение миграции 002_add_chats.sql..."
    if ! sudo -u postgres psql -d voicehub -f "$PROJECT_ROOT/server/migrations/002_add_chats.sql" > /dev/null 2>&1; then
        warn "Миграция 002 не выполнена (возможно таблицы уже существуют)"
    else
        info "Миграция 002 выполнена"
    fi
else
    warn "Файл миграции 002_add_chats.sql не найден"
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# ШАГ 9: Проверка
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 9: Проверка"
header "═══════════════════════════════════════════════════════════"
echo ""

# Проверяем таблицы
info "Проверка таблиц базы данных..."
TABLE_COUNT=$(sudo -u postgres psql -d voicehub -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -lt 5 ]; then
    warn "Создано только $TABLE_COUNT таблиц (ожидается минимум 5)"
    echo ""
    echo "Попробуйте выполнить миграции вручную:"
    echo "  sudo -u postgres psql -d voicehub -f $PROJECT_ROOT/server/migrations/001_initial_schema.sql"
    echo "  sudo -u postgres psql -d voicehub -f $PROJECT_ROOT/server/migrations/002_add_chats.sql"
else
    info "Создано $TABLE_COUNT таблиц"
fi

# Проверяем подключение
info "Проверка подключения к базе данных..."
if sudo -u postgres psql -d voicehub -c "SELECT 1;" > /dev/null 2>&1; then
    info "Подключение к базе данных работает"
else
    error "Не удалось подключиться к базе данных"
    exit 1
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# ШАГ 10: Перезапуск backend
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 10: Перезапуск VoiceHub"
header "═══════════════════════════════════════════════════════════"
echo ""

if systemctl is-active --quiet voicehub; then
    info "Перезапуск VoiceHub..."
    systemctl restart voicehub
    sleep 3
    
    if systemctl is-active --quiet voicehub; then
        info "VoiceHub перезапущен"
    else
        error "VoiceHub не запустился"
        echo ""
        echo "Проверьте логи:"
        echo "  sudo journalctl -u voicehub -n 20"
        exit 1
    fi
else
    warn "VoiceHub не запущен"
    info "Запуск VoiceHub..."
    systemctl start voicehub
    sleep 3
    
    if systemctl is-active --quiet voicehub; then
        info "VoiceHub запущен"
    else
        error "VoiceHub не запустился"
        echo ""
        echo "Проверьте логи:"
        echo "  sudo journalctl -u voicehub -n 20"
        exit 1
    fi
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# ФИНАЛЬНОЕ СООБЩЕНИЕ
# ═══════════════════════════════════════════════════════════════
header "╔════════════════════════════════════════════════════════════╗"
header "║          ✅ PostgreSQL восстановлен!                       ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""
info "Что было сделано:"
echo "  1. Проверен PostgreSQL"
echo "  2. Остановлен PostgreSQL"
echo "  3. Проверена/создана директория данных"
echo "  4. Инициализирован кластер PostgreSQL"
echo "  5. Настроена конфигурация"
echo "  6. Запущен PostgreSQL"
echo "  7. Создан пользователь voicehub"
echo "  8. Создана база данных voicehub"
echo "  9. Выполнены миграции"
echo "  10. Перезапущен VoiceHub"
echo ""
info "Проверка работы:"
echo "  curl http://localhost:8080/health"
echo ""
info "Полезные команды:"
echo "  Статус PostgreSQL: sudo systemctl status postgresql@$PG_VERSION-main"
echo "  Логи PostgreSQL:   sudo journalctl -u postgresql@$PG_VERSION-main -f"
echo "  Статус VoiceHub:   sudo systemctl status voicehub"
echo "  Логи VoiceHub:     sudo journalctl -u voicehub -f"
echo ""
