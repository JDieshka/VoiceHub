#!/bin/bash

# PostgreSQL Fix Script
# Исправление проблем с PostgreSQL

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     PostgreSQL Fix Script                                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Проверка установки PostgreSQL
info "Проверка установки PostgreSQL..."
if ! command -v psql &> /dev/null; then
    error "PostgreSQL не установлен!"
    echo "Установите: sudo apt-get install -y postgresql postgresql-contrib"
    exit 1
fi
info "PostgreSQL установлен"
echo ""

# 2. Создание директории для PostgreSQL
info "Создание директории для PostgreSQL..."
if [ ! -d "/var/lib/postgresql" ]; then
    sudo mkdir -p /var/lib/postgresql
    sudo chown postgres:postgres /var/lib/postgresql
    info "Директория создана"
else
    info "Директория уже существует"
fi
echo ""

# 3. Проверка кластера PostgreSQL
info "Проверка кластера PostgreSQL..."
PG_VERSION=$(ls /etc/postgresql/ 2>/dev/null | head -n 1)

if [ -z "$PG_VERSION" ]; then
    warn "Кластер PostgreSQL не найден"
    info "Создание нового кластера..."
    
    # Определяем версию PostgreSQL
    PG_VERSION=$(psql --version | grep -oP '\d+' | head -n 1)
    
    # Создаем кластер
    sudo -u postgres /usr/lib/postgresql/$PG_VERSION/bin/initdb -D /var/lib/postgresql/$PG_VERSION/main
    
    info "Кластер создан"
else
    info "Кластер PostgreSQL версии $PG_VERSION найден"
fi
echo ""

# 4. Запуск PostgreSQL
info "Запуск PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Ждем запуска
sleep 3

# Проверяем статус
if systemctl is-active --quiet postgresql; then
    info "PostgreSQL запущен"
else
    error "PostgreSQL не запустился!"
    echo ""
    echo "Логи:"
    sudo journalctl -u postgresql -n 20 --no-pager
    exit 1
fi
echo ""

# 5. Проверка порта 5432
info "Проверка порта 5432..."
if sudo ss -tuln | grep -q ":5432"; then
    info "Порт 5432 слушается"
    sudo ss -tuln | grep ":5432"
else
    error "Порт 5432 НЕ слушается"
    echo ""
    echo "Проверьте конфигурацию PostgreSQL:"
    echo "  sudo nano /etc/postgresql/$PG_VERSION/main/postgresql.conf"
    echo "  Убедитесь что:"
    echo "    listen_addresses = 'localhost'"
    echo "    port = 5432"
    exit 1
fi
echo ""

# 6. Создание пользователя voicehub
info "Создание пользователя voicehub..."
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='voicehub'" | grep -q 1; then
    warn "Пользователь voicehub уже существует"
else
    sudo -u postgres psql -c "CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';"
    info "Пользователь voicehub создан"
fi
echo ""

# 7. Создание базы данных voicehub
info "Создание базы данных voicehub..."
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw voicehub; then
    warn "База данных voicehub уже существует"
else
    sudo -u postgres psql -c "CREATE DATABASE voicehub OWNER voicehub;"
    info "База данных voicehub создана"
fi
echo ""

# 8. Предоставление привилегий
info "Предоставление привилегий..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;"
info "Привилегии предоставлены"
echo ""

# 9. Проверка подключения
info "Проверка подключения к БД..."
if PGPASSWORD='VoiceHub2024SecurePass' psql -U voicehub -d voicehub -h localhost -c "SELECT 1;" > /dev/null 2>&1; then
    info "Подключение к БД работает"
else
    error "Не удалось подключиться к БД"
    echo ""
    echo "Проверьте пароль пользователя voicehub"
    exit 1
fi
echo ""

# 10. Перезапуск voicehub
info "Перезапуск voicehub..."
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

# Финальная проверка
info "Финальная проверка..."
if curl -s http://localhost:8080/health | grep -q "ok"; then
    info "✅ Всё работает!"
    echo ""
    echo "API:"
    curl -s http://localhost:8080/health
    echo ""
else
    error "❌ API не отвечает"
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ✅ PostgreSQL исправлен!                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
info "Теперь можете запустить install.sh"
echo ""
