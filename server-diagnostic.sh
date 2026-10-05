#!/bin/bash

# VoiceHub Server Diagnostic Script
# Диагностика проблем с подключением к серверу

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
header "║     VoiceHub Server Diagnostic                             ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""

SERVER_IP=$(hostname -I | awk '{print $1}')

# 1. Проверка сервиса
header "1. Проверка сервиса VoiceHub"
if systemctl is-active --quiet voicehub; then
    info "Сервис запущен"
    systemctl status voicehub --no-pager | grep "Active:"
else
    error "Сервис НЕ запущен"
    echo "   Решение: sudo systemctl start voicehub"
fi
echo ""

# 2. Проверка бинарника
header "2. Проверка бинарника"
if [ -f "/opt/VoiceHub/server/voicehub-server" ]; then
    info "Бинарник найден"
    ls -lh /opt/VoiceHub/server/voicehub-server
else
    error "Бинарник не найден"
fi
echo ""

# 3. Проверка портов
header "3. Проверка портов"
info "Порт 8080 (HTTP):"
if netstat -tuln 2>/dev/null | grep -q ":8080" || ss -tuln 2>/dev/null | grep -q ":8080"; then
    info "Порт 8080 слушается"
    netstat -tuln 2>/dev/null | grep ":8080" || ss -tuln 2>/dev/null | grep ":8080"
    
    # Проверяем на каком интерфейсе слушает
    if netstat -tuln 2>/dev/null | grep -q "0.0.0.0:8080" || ss -tuln 2>/dev/null | grep -q "0.0.0.0:8080"; then
        info "Сервер слушает на всех интерфейсах (0.0.0.0)"
    elif netstat -tuln 2>/dev/null | grep -q "127.0.0.1:8080" || ss -tuln 2>/dev/null | grep -q "127.0.0.1:8080"; then
        error "Сервер слушает только на localhost (127.0.0.1)"
        echo "   Проблема: Сервер недоступен извне!"
        echo "   Решение: Проверьте переменную окружения PORT в systemd service"
    fi
else
    error "Порт 8080 НЕ слушается"
fi

echo ""
info "Порт 5432 (PostgreSQL):"
if netstat -tuln 2>/dev/null | grep -q ":5432" || ss -tuln 2>/dev/null | grep -q ":5432"; then
    info "PostgreSQL запущен"
else
    error "PostgreSQL НЕ запущен"
    echo "   Решение: sudo systemctl start postgresql"
fi
echo ""

# 4. Проверка API локально
header "4. Проверка API (локально)"
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    info "API отвечает локально"
    echo "   Ответ:"
    curl -s http://localhost:8080/health | jq . 2>/dev/null || curl -s http://localhost:8080/health
else
    error "API НЕ отвечает локально"
    echo "   Проверьте логи: sudo journalctl -u voicehub -n 20"
fi
echo ""

# 5. Проверка API извне
header "5. Проверка API (извне)"
if curl -s --connect-timeout 5 http://$SERVER_IP:8080/health > /dev/null 2>&1; then
    info "API доступен извне"
    echo "   URL: http://$SERVER_IP:8080/health"
else
    error "API НЕ доступен извне"
    echo "   Возможные причины:"
    echo "   1. Firewall блокирует порт 8080"
    echo "   2. Сервер слушает только на localhost"
    echo "   3. Проблемы с сетью"
fi
echo ""

# 6. Проверка firewall
header "6. Проверка firewall"
if command -v ufw &> /dev/null; then
    info "UFW установлен"
    ufw status | grep -E "(8080|22)" || warn "Правила для 8080 не найдены"
    
    if ! ufw status | grep -q "8080/tcp.*ALLOW"; then
        error "Порт 8080 не разрешен в firewall"
        echo "   Решение: sudo ufw allow 8080/tcp"
    else
        info "Порт 8080 разрешен"
    fi
else
    warn "UFW не установлен"
fi
echo ""

# 7. Проверка CORS
header "7. Проверка CORS"
CORS_HEADER=$(curl -s -I http://localhost:8080/health | grep -i "access-control-allow-origin" || echo "")
if [ -n "$CORS_HEADER" ]; then
    info "CORS заголовок найден"
    echo "   $CORS_HEADER"
else
    warn "CORS заголовок не найден (это может быть нормально)"
fi
echo ""

# 8. Проверка БД
header "8. Проверка базы данных"
if sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw voicehub; then
    info "База данных voicehub существует"
    
    # Проверяем таблицы
    TABLE_COUNT=$(sudo -u postgres psql -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_catalog = 'voicehub';" 2>/dev/null || echo "0")
    info "Таблиц в БД: $TABLE_COUNT"
    
    if [ "$TABLE_COUNT" -eq 0 ]; then
        warn "Таблицы не созданы"
        echo "   Решение: Перезапустите сервис для создания таблиц"
        echo "   sudo systemctl restart voicehub"
    fi
else
    error "База данных voicehub не найдена"
    echo "   Решение: Создайте БД вручную"
    echo "   sudo -u postgres psql"
    echo "   CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';"
    echo "   CREATE DATABASE voicehub OWNER voicehub;"
    echo "   GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;"
fi
echo ""

# 9. Последние логи
header "9. Последние логи (последние 10 строк)"
echo ""
journalctl -u voicehub -n 10 --no-pager
echo ""

# 10. Рекомендации
header "10. Рекомендации"
echo ""

if ! systemctl is-active --quiet voicehub; then
    echo "❌ Сервис не запущен"
    echo "   sudo systemctl start voicehub"
    echo ""
fi

if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "❌ API не отвечает локально"
    echo "   Проверьте логи: sudo journalctl -u voicehub -n 50"
    echo ""
fi

if ! curl -s --connect-timeout 5 http://$SERVER_IP:8080/health > /dev/null 2>&1; then
    echo "❌ API не доступен извне"
    echo "   1. Проверьте firewall: sudo ufw allow 8080/tcp"
    echo "   2. Проверьте что сервер слушает на 0.0.0.0:8080"
    echo "   3. Проверьте сетевые настройки VPS"
    echo ""
fi

echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📍 Ваш сервер:"
echo "   Локально: http://localhost:8080"
echo "   Извне:    http://$SERVER_IP:8080"
echo ""
echo "📋 Полезные команды:"
echo "   Логи:    sudo journalctl -u voicehub -f"
echo "   Рестарт: sudo systemctl restart voicehub"
echo "   Статус:  sudo systemctl status voicehub"
echo ""
