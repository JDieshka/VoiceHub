#!/bin/bash

# VoiceHub Database Cleanup Script
# Быстрая очистка базы данных VoiceHub

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

# Проверка прав root
if [ "$EUID" -ne 0 ]; then
    error "Этот скрипт должен быть запущен с правами root"
    echo "Использование: sudo ./cleanup-db.sh"
    exit 1
fi

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     VoiceHub Database Cleanup                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Проверка PostgreSQL
if ! command -v psql &> /dev/null; then
    error "PostgreSQL не установлен"
    exit 1
fi

info "PostgreSQL найден"

# Проверка что PostgreSQL запущен
if ! systemctl is-active --quiet postgresql; then
    warn "PostgreSQL не запущен"
    info "Запуск PostgreSQL..."
    systemctl start postgresql
    sleep 2
fi

info "PostgreSQL запущен"
echo ""

# Показываем текущее состояние
echo "═══════════════════════════════════════════════════════════"
echo "Текущее состояние:"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Проверяем пользователя
if su - postgres -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='voicehub'\"" | grep -q 1; then
    info "Пользователь voicehub: существует"
else
    warn "Пользователь voicehub: не существует"
fi

# Проверяем БД
if su - postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='voicehub'\"" | grep -q 1; then
    info "База данных voicehub: существует"
    
    # Показываем размер БД
    DB_SIZE=$(su - postgres -c "psql -tAc \"SELECT pg_size_pretty(pg_database_size('voicehub'));\"" 2>/dev/null || echo "неизвестно")
    echo "   Размер: $DB_SIZE"
    
    # Показываем количество таблиц
    TABLE_COUNT=$(su - postgres -c "psql -tAc \"SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_catalog = 'voicehub';\"" 2>/dev/null || echo "0")
    echo "   Таблиц: $TABLE_COUNT"
else
    warn "База данных voicehub: не существует"
fi

echo ""

# Спрашиваем что делать
echo "═══════════════════════════════════════════════════════════"
echo "Выберите действие:"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "1) Удалить базу данных и пользователя"
echo "2) Удалить только базу данных (оставить пользователя)"
echo "3) Удалить только пользователя (оставить базу данных)"
echo "4) Очистить все таблицы (оставить структуру)"
echo "5) Выход"
echo ""
echo -n "Введите номер (1-5): "
read choice

case $choice in
    1)
        echo ""
        warn "ВНИМАНИЕ: Будут удалены база данных И пользователь!"
        echo -n "Вы уверены? (yes/no): "
        read confirm
        
        if [ "$confirm" = "yes" ]; then
            info "Закрытие подключений к БД..."
            su - postgres -c "psql -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='voicehub';\"" 2>/dev/null || true
            
            info "Удаление базы данных..."
            su - postgres -c "psql -c \"DROP DATABASE IF EXISTS voicehub;\"" && info "База данных удалена" || error "Не удалось удалить БД"
            
            info "Удаление пользователя..."
            su - postgres -c "psql -c \"DROP USER IF EXISTS voicehub;\"" && info "Пользователь удален" || error "Не удалось удалить пользователя"
            
            echo ""
            info "✅ Полная очистка завершена!"
        else
            info "Отменено"
        fi
        ;;
        
    2)
        echo ""
        warn "Будет удалена только база данных!"
        echo -n "Вы уверены? (yes/no): "
        read confirm
        
        if [ "$confirm" = "yes" ]; then
            info "Закрытие подключений к БД..."
            su - postgres -c "psql -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='voicehub';\"" 2>/dev/null || true
            
            info "Удаление базы данных..."
            su - postgres -c "psql -c \"DROP DATABASE IF EXISTS voicehub;\"" && info "База данных удалена" || error "Не удалось удалить БД"
            
            echo ""
            info "✅ База данных удалена!"
        else
            info "Отменено"
        fi
        ;;
        
    3)
        echo ""
        warn "Будет удален только пользователь!"
        echo -n "Вы уверены? (yes/no): "
        read confirm
        
        if [ "$confirm" = "yes" ]; then
            info "Удаление пользователя..."
            su - postgres -c "psql -c \"DROP USER IF EXISTS voicehub;\"" && info "Пользователь удален" || error "Не удалось удалить пользователя"
            
            echo ""
            info "✅ Пользователь удален!"
        else
            info "Отменено"
        fi
        ;;
        
    4)
        echo ""
        warn "Будут очищены ВСЕ таблицы в базе данных!"
        echo -n "Вы уверены? (yes/no): "
        read confirm
        
        if [ "$confirm" = "yes" ]; then
            info "Очистка таблиц..."
            
            # Получаем список таблиц и очищаем их
            TABLES=$(su - postgres -c "psql -tAc \"SELECT tablename FROM pg_tables WHERE schemaname = 'public';\" voicehub" 2>/dev/null || echo "")
            
            if [ -z "$TABLES" ]; then
                warn "Таблицы не найдены"
            else
                for table in $TABLES; do
                    info "Очистка таблицы: $table"
                    su - postgres -c "psql -c \"TRUNCATE TABLE $table RESTART IDENTITY CASCADE;\" voicehub" 2>/dev/null || warn "Не удалось очистить таблицу $table"
                done
            fi
            
            echo ""
            info "✅ Все таблицы очищены!"
        else
            info "Отменено"
        fi
        ;;
        
    5)
        info "Выход"
        exit 0
        ;;
        
    *)
        error "Неверный выбор"
        exit 1
        ;;
esac

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Финальное состояние:"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Показываем финальное состояние
if su - postgres -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='voicehub'\"" | grep -q 1; then
    info "Пользователь voicehub: существует"
else
    warn "Пользователь voicehub: не существует"
fi

if su - postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='voicehub'\"" | grep -q 1; then
    info "База данных voicehub: существует"
else
    warn "База данных voicehub: не существует"
fi

echo ""
info "Готово!"
