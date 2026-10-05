#!/bin/bash

# Database Diagnostic Script
# Диагностика проблем с базой данных PostgreSQL

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
header "║     Database Diagnostic Script                             ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""

# Проверка прав root
if [ "$EUID" -ne 0 ]; then
    error "Этот скрипт должен быть запущен с правами root"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════
# ШАГ 1: Проверка PostgreSQL
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 1: Проверка PostgreSQL"
header "═══════════════════════════════════════════════════════════"
echo ""

if ! systemctl is-active --quiet postgresql; then
    error "PostgreSQL не запущен!"
    echo "Запуск PostgreSQL..."
    systemctl start postgresql
    sleep 2
fi

if systemctl is-active --quiet postgresql; then
    info "PostgreSQL запущен"
else
    error "Не удалось запустить PostgreSQL"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════
# ШАГ 2: Проверка пользователя voicehub
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 2: Проверка пользователя voicehub"
header "═══════════════════════════════════════════════════════════"
echo ""

if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='voicehub'" 2>/dev/null | grep -q 1; then
    info "Пользователь voicehub существует"
else
    error "Пользователь voicehub НЕ существует!"
    echo "Создание пользователя..."
    sudo -u postgres psql -c "CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';"
    info "Пользователь создан"
fi

# ═══════════════════════════════════════════════════════════════
# ШАГ 3: Проверка базы данных voicehub
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 3: Проверка базы данных voicehub"
header "═══════════════════════════════════════════════════════════"
echo ""

if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='voicehub'" 2>/dev/null | grep -q 1; then
    info "База данных voicehub существует"
else
    error "База данных voicehub НЕ существует!"
    echo "Создание базы данных..."
    sudo -u postgres psql -c "CREATE DATABASE voicehub OWNER voicehub;"
    info "База данных создана"
fi

# ═══════════════════════════════════════════════════════════════
# ШАГ 4: Проверка привилегий
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 4: Проверка привилегий"
header "═══════════════════════════════════════════════════════════"
echo ""

info "Предоставление привилегий..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;" 2>/dev/null || true
sudo -u postgres psql -d voicehub -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO voicehub;" 2>/dev/null || true
sudo -u postgres psql -d voicehub -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO voicehub;" 2>/dev/null || true
info "Привилегии предоставлены"

# ═══════════════════════════════════════════════════════════════
# ШАГ 5: Проверка таблиц
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 5: Проверка таблиц"
header "═══════════════════════════════════════════════════════════"
echo ""

TABLE_COUNT=$(sudo -u postgres psql -d voicehub -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -lt 5 ]; then
    warn "Найдено только $TABLE_COUNT таблиц (ожидается минимум 9)"
    echo ""
    echo "Выполнение миграций..."
    
    # Миграция 1: Основная схема
    if [ -f "/home/VoiceHub/server/migrations/001_initial_schema.sql" ]; then
        info "Выполнение миграции 001_initial_schema.sql..."
        sudo -u postgres psql -d voicehub -f "/home/VoiceHub/server/migrations/001_initial_schema.sql" 2>&1 | grep -E "(CREATE|ERROR)" || true
    fi
    
    # Миграция 2: Добавление чатов
    if [ -f "/home/VoiceHub/server/migrations/002_add_chats.sql" ]; then
        info "Выполнение миграции 002_add_chats.sql..."
        sudo -u postgres psql -d voicehub -f "/home/VoiceHub/server/migrations/002_add_chats.sql" 2>&1 | grep -E "(CREATE|ALTER|ERROR)" || true
    fi
    
    # Предоставляем привилегии на новые таблицы
    sudo -u postgres psql -d voicehub -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO voicehub;" 2>/dev/null || true
    sudo -u postgres psql -d voicehub -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO voicehub;" 2>/dev/null || true
    
    info "Миграции выполнены"
else
    info "Найдено $TABLE_COUNT таблиц"
fi

echo ""
info "Список таблиц:"
sudo -u postgres psql -d voicehub -c "\dt" | grep -E "public|users|servers|chats|messages" || echo "Таблицы не найдены"

# ═══════════════════════════════════════════════════════════════
# ШАГ 6: Проверка подключения от пользователя voicehub
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 6: Проверка подключения от пользователя voicehub"
header "═══════════════════════════════════════════════════════════"
echo ""

if PGPASSWORD='VoiceHub2024SecurePass' psql -U voicehub -d voicehub -h localhost -c "SELECT 1;" > /dev/null 2>&1; then
    info "Подключение от пользователя voicehub работает"
else
    error "Не удалось подключиться от пользователя voicehub"
    echo ""
    echo "Проверка пароля..."
    
    # Сбрасываем пароль
    sudo -u postgres psql -c "ALTER USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';"
    info "Пароль сброшен"
    
    # Проверяем снова
    if PGPASSWORD='VoiceHub2024SecurePass' psql -U voicehub -d voicehub -h localhost -c "SELECT 1;" > /dev/null 2>&1; then
        info "Подключение работает после сброса пароля"
    else
        error "Подключение всё ещё не работает"
        echo ""
        echo "Проверьте pg_hba.conf:"
        PG_VERSION=$(ls /etc/postgresql/ | head -n 1)
        cat /etc/postgresql/$PG_VERSION/main/pg_hba.conf | grep -v "^#" | grep -v "^$"
    fi
fi

# ═══════════════════════════════════════════════════════════════
# ШАГ 7: Проверка структуры таблицы users
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 7: Проверка структуры таблицы users"
header "═══════════════════════════════════════════════════════════"
echo ""

if sudo -u postgres psql -d voicehub -c "\d users" > /dev/null 2>&1; then
    info "Таблица users существует"
    echo ""
    echo "Структура таблицы users:"
    sudo -u postgres psql -d voicehub -c "\d users" | head -n 20
else
    error "Таблица users НЕ существует!"
fi

# ═══════════════════════════════════════════════════════════════
# ШАГ 8: Тестовая вставка
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 8: Тестовая вставка"
header "═══════════════════════════════════════════════════════════"
echo ""

info "Попытка вставки тестового пользователя..."
TEST_RESULT=$(PGPASSWORD='VoiceHub2024SecurePass' psql -U voicehub -d voicehub -h localhost -c "
INSERT INTO users (id, username, email, password_hash, avatar, status, created_at, updated_at)
VALUES (gen_random_uuid(), 'test_user', 'test@test.com', 'test_hash', '🎮', 'offline', NOW(), NOW())
RETURNING id, username, email;
" 2>&1)

if echo "$TEST_RESULT" | grep -q "test_user"; then
    info "Тестовая вставка успешна"
    echo ""
    echo "Удаление тестового пользователя..."
    PGPASSWORD='VoiceHub2024SecurePass' psql -U voicehub -d voicehub -h localhost -c "DELETE FROM users WHERE username = 'test_user';" > /dev/null 2>&1
    info "Тестовый пользователь удален"
else
    error "Тестовая вставка не удалась!"
    echo ""
    echo "Ошибка:"
    echo "$TEST_RESULT"
    echo ""
    echo "Возможные причины:"
    echo "1. Таблица users не существует"
    echo "2. Неправильная структура таблицы"
    echo "3. Недостаточно прав"
fi

# ═══════════════════════════════════════════════════════════════
# ШАГ 9: Проверка backend
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 9: Проверка backend"
header "═══════════════════════════════════════════════════════════"
echo ""

if systemctl is-active --quiet voicehub; then
    info "VoiceHub backend запущен"
    
    # Проверяем health endpoint
    if curl -s http://localhost:8080/health | grep -q "ok"; then
        info "Health endpoint работает"
    else
        error "Health endpoint не отвечает"
    fi
    
    # Проверяем последние логи на ошибки БД
    echo ""
    info "Последние логи backend (ошибки БД):"
    sudo journalctl -u voicehub -n 50 --no-pager | grep -iE "(database|postgres|connection|error)" | tail -n 10 || echo "Ошибок не найдено"
else
    error "VoiceHub backend НЕ запущен!"
    echo "Запуск backend..."
    systemctl start voicehub
    sleep 3
    
    if systemctl is-active --quiet voicehub; then
        info "Backend запущен"
    else
        error "Не удалось запустить backend"
        echo ""
        echo "Логи:"
        sudo journalctl -u voicehub -n 20 --no-pager
    fi
fi

# ═══════════════════════════════════════════════════════════════
# ШАГ 10: Рекомендации
# ═══════════════════════════════════════════════════════════════
header "═══════════════════════════════════════════════════════════"
header "Шаг 10: Рекомендации"
header "═══════════════════════════════════════════════════════════"
echo ""

echo "Если проблема не решена, попробуйте:"
echo ""
echo "1. Перезапустить backend:"
echo "   sudo systemctl restart voicehub"
echo ""
echo "2. Проверить логи backend:"
echo "   sudo journalctl -u voicehub -f"
echo ""
echo "3. Проверить логи PostgreSQL:"
echo "   sudo journalctl -u postgresql -f"
echo ""
echo "4. Полная переустановка БД:"
echo "   sudo -u postgres psql -c 'DROP DATABASE IF EXISTS voicehub;'"
echo "   sudo -u postgres psql -c 'DROP USER IF EXISTS voicehub;'"
echo "   sudo ./fix-postgresql.sh"
echo ""

header "╔════════════════════════════════════════════════════════════╗"
header "║          Диагностика завершена                             ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""
