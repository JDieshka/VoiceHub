#!/bin/bash

# PostgreSQL Diagnostic Script
# Диагностика проблем с PostgreSQL

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
header "║     PostgreSQL Diagnostic                                  ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Проверка статуса сервиса
header "1. Статус сервиса PostgreSQL"
if systemctl is-active --quiet postgresql; then
    info "PostgreSQL запущен"
    systemctl status postgresql --no-pager | grep "Active:"
else
    error "PostgreSQL НЕ запущен"
    echo "   Решение: sudo systemctl start postgresql"
fi
echo ""

# 2. Проверка портов
header "2. Проверка портов"
info "Порт 5432 (стандартный):"
if netstat -tuln 2>/dev/null | grep -q ":5432" || ss -tuln 2>/dev/null | grep -q ":5432"; then
    info "Порт 5432 слушается"
    netstat -tuln 2>/dev/null | grep ":5432" || ss -tuln 2>/dev/null | grep ":5432"
else
    error "Порт 5432 НЕ слушается"
fi
echo ""

# 3. Проверка конфигурации PostgreSQL
header "3. Конфигурация PostgreSQL"
PG_CONF=$(sudo -u postgres psql -tAc "SHOW config_file;" 2>/dev/null || echo "")
if [ -n "$PG_CONF" ]; then
    info "Конфигурационный файл: $PG_CONF"
    
    # Проверяем listen_addresses
    LISTEN_ADDRESSES=$(sudo -u postgres psql -tAc "SHOW listen_addresses;" 2>/dev/null || echo "unknown")
    info "listen_addresses: $LISTEN_ADDRESSES"
    
    if [ "$LISTEN_ADDRESSES" = "localhost" ]; then
        warn "PostgreSQL слушает только на localhost"
        echo "   Это нормально для локальной работы"
    elif [ "$LISTEN_ADDRESSES" = "*" ]; then
        info "PostgreSQL слушает на всех интерфейсах"
    fi
    
    # Проверяем порт
    PG_PORT=$(sudo -u postgres psql -tAc "SHOW port;" 2>/dev/null || echo "unknown")
    info "Порт PostgreSQL: $PG_PORT"
else
    error "Не удалось получить конфигурацию PostgreSQL"
fi
echo ""

# 4. Проверка базы данных voicehub
header "4. Проверка базы данных voicehub"
if sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw voicehub; then
    info "База данных voicehub существует"
    
    # Размер БД
    DB_SIZE=$(sudo -u postgres psql -tAc "SELECT pg_size_pretty(pg_database_size('voicehub'));" 2>/dev/null || echo "неизвестно")
    info "Размер БД: $DB_SIZE"
    
    # Количество таблиц
    TABLE_COUNT=$(sudo -u postgres psql -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_catalog = 'voicehub';" 2>/dev/null || echo "0")
    info "Таблиц в БД: $TABLE_COUNT"
    
    # Количество пользователей
    USER_COUNT=$(sudo -u postgres psql -tAc "SELECT count(*) FROM users;" voicehub 2>/dev/null || echo "0")
    info "Пользователей в системе: $USER_COUNT"
else
    error "База данных voicehub НЕ существует"
    echo "   Решение: Создайте БД вручную"
    echo "   sudo -u postgres psql"
    echo "   CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';"
    echo "   CREATE DATABASE voicehub OWNER voicehub;"
    echo "   GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;"
fi
echo ""

# 5. Проверка пользователя voicehub
header "5. Проверка пользователя voicehub"
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='voicehub'" 2>/dev/null | grep -q 1; then
    info "Пользователь voicehub существует"
else
    error "Пользователь voicehub НЕ существует"
    echo "   Решение: Создайте пользователя"
    echo "   sudo -u postgres psql -c \"CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';\""
fi
echo ""

# 6. Проверка подключения от voicehub-server
header "6. Проверка подключения от voicehub-server"
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    info "voicehub-server работает"
    
    # Проверяем логи на ошибки БД
    if journalctl -u voicehub -n 50 --no-pager | grep -qi "database\|postgres\|connection refused"; then
        warn "В логах voicehub есть ошибки подключения к БД"
        echo ""
        echo "Последние ошибки:"
        journalctl -u voicehub -n 20 --no-pager | grep -i "database\|postgres\|connection" | tail -n 5
    else
        info "Ошибок подключения к БД не обнаружено"
    fi
else
    error "voicehub-server НЕ работает"
fi
echo ""

# 7. Тест подключения к БД
header "7. Тест подключения к БД"
info "Подключение как пользователь voicehub..."
if PGPASSWORD='VoiceHub2024SecurePass' psql -U voicehub -d voicehub -h localhost -c "SELECT 1;" > /dev/null 2>&1; then
    info "Подключение успешно"
else
    error "Не удалось подключиться к БД"
    echo "   Проверьте пароль пользователя voicehub"
fi
echo ""

# 8. Последние логи PostgreSQL
header "8. Последние логи PostgreSQL"
echo ""
journalctl -u postgresql -n 10 --no-pager
echo ""

# 9. Рекомендации
header "9. Рекомендации"
echo ""

if ! systemctl is-active --quiet postgresql; then
    echo "❌ PostgreSQL не запущен"
    echo "   sudo systemctl start postgresql"
    echo "   sudo systemctl enable postgresql"
    echo ""
fi

if ! netstat -tuln 2>/dev/null | grep -q ":5432" && ! ss -tuln 2>/dev/null | grep -q ":5432"; then
    echo "❌ PostgreSQL не слушает на порту 5432"
    echo "   Проверьте конфигурацию: $PG_CONF"
    echo "   Убедитесь что port = 5432"
    echo "   Перезапустите: sudo systemctl restart postgresql"
    echo ""
fi

if ! sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw voicehub; then
    echo "❌ База данных voicehub не существует"
    echo "   Создайте БД:"
    echo "   sudo -u postgres psql"
    echo "   CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';"
    echo "   CREATE DATABASE voicehub OWNER voicehub;"
    echo "   GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;"
    echo "   \\q"
    echo ""
fi

echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📋 Полезные команды:"
echo "   Логи:        sudo journalctl -u postgresql -f"
echo "   Рестарт:     sudo systemctl restart postgresql"
echo "   Статус:      sudo systemctl status postgresql"
echo "   Подключение: sudo -u postgres psql"
echo ""
