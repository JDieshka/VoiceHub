#!/bin/bash

# Быстрое исправление проблем с VoiceHub
# Запуск на СЕРВЕРЕ: ./fix.sh

echo "🔧 Быстрое исправление VoiceHub"
echo "================================"
echo ""

# 1. Остановка сервиса
echo "⏹️  Остановка сервиса..."
systemctl stop voicehub 2>/dev/null || true

# 2. Проверка PostgreSQL
echo "📊 Проверка PostgreSQL..."
if ! systemctl is-active --quiet postgresql; then
    echo "   Запуск PostgreSQL..."
    systemctl start postgresql
    sleep 2
fi

# Проверка что БД существует
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw voicehub; then
    echo "   Создание базы данных..."
    sudo -u postgres psql -c "CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE DATABASE voicehub OWNER voicehub;" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;" 2>/dev/null || true
fi
echo "✅ PostgreSQL готов"

# 3. Проверка frontend
echo "🎨 Проверка frontend..."
if [ ! -d "/opt/voicehub/dist" ] || [ -z "$(ls -A /opt/voicehub/dist 2>/dev/null)" ]; then
    echo "   Сборка frontend..."
    cd /opt/voicehub
    npm install --silent
    npm run build --silent
fi
echo "✅ Frontend собран"

# 4. Пересборка backend
echo "🔨 Пересборка backend..."
cd /opt/voicehub/server
export PATH=$PATH:/usr/local/go/bin
go build -o voicehub-server main.go
echo "✅ Backend собран"

# 5. Настройка firewall
echo "🔥 Настройка firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 8080/tcp 2>/dev/null || true
    ufw allow 3478/tcp 2>/dev/null || true
    ufw allow 3478/udp 2>/dev/null || true
fi
echo "✅ Firewall настроен"

# 6. Запуск сервиса
echo "🚀 Запуск сервиса..."
systemctl start voicehub
sleep 3

# 7. Проверка
echo ""
echo "🧪 Проверка..."
if systemctl is-active --quiet voicehub; then
    echo "✅ Сервис запущен"
else
    echo "❌ Сервис не запустился"
    echo "   Логи:"
    journalctl -u voicehub -n 20 --no-pager
    exit 1
fi

# Тест API
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
    echo "✅ API работает"
else
    echo "❌ API не отвечает (HTTP $RESPONSE)"
    echo "   Логи:"
    journalctl -u voicehub -n 20 --no-pager
    exit 1
fi

# Тест frontend
if curl -s http://localhost:8080/ | grep -q "<!DOCTYPE html>"; then
    echo "✅ Frontend работает"
else
    echo "⚠️  Frontend может не работать"
fi

echo ""
echo "✅ Исправление завершено!"
echo ""
echo "📍 Ваш сервер:"
echo "   http://31.77.158.177:8080"
echo ""
echo "📋 Полезные команды:"
echo "   Логи:    journalctl -u voicehub -f"
echo "   Статус:  systemctl status voicehub"
echo "   Рестарт: systemctl restart voicehub"
echo ""
