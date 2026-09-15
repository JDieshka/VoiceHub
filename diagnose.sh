#!/bin/bash

# Скрипт диагностики VoiceHub на сервере
# Запуск: ./diagnose.sh

echo "🔍 Диагностика VoiceHub"
echo "========================"
echo ""

# 1. Проверка PostgreSQL
echo "📊 Проверка PostgreSQL..."
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL работает"
else
    echo "❌ PostgreSQL НЕ работает"
    echo "   Попробуйте: systemctl start postgresql"
fi
echo ""

# 2. Проверка VoiceHub сервиса
echo "🔧 Проверка VoiceHub сервиса..."
if systemctl is-active --quiet voicehub; then
    echo "✅ VoiceHub сервис работает"
else
    echo "❌ VoiceHub сервис НЕ работает"
    echo "   Последние логи:"
    journalctl -u voicehub -n 20 --no-pager
fi
echo ""

# 3. Проверка портов
echo "🔌 Проверка портов..."
echo "   Порт 8080 (backend):"
if netstat -tuln 2>/dev/null | grep -q ":8080" || ss -tuln 2>/dev/null | grep -q ":8080"; then
    echo "   ✅ Порт 8080 слушается"
else
    echo "   ❌ Порт 8080 НЕ слушается"
fi

echo "   Порт 5173 (frontend dev):"
if netstat -tuln 2>/dev/null | grep -q ":5173" || ss -tuln 2>/dev/null | grep -q ":5173"; then
    echo "   ✅ Порт 5173 слушается"
else
    echo "   ⚠️  Порт 5173 НЕ слушается (это нормально, если не запущен npm run dev)"
fi
echo ""

# 4. Проверка firewall
echo "🔥 Проверка firewall..."
if command -v ufw &> /dev/null; then
    ufw status | grep -E "8080|22|3478" || echo "   Правила не найдены"
else
    echo "   ⚠️  ufw не установлен"
fi
echo ""

# 5. Проверка файлов
echo "📁 Проверка файлов..."
if [ -f "/opt/voicehub/server/voicehub-server" ]; then
    echo "✅ Backend бинарник существует"
else
    echo "❌ Backend бинарник НЕ найден"
fi

if [ -d "/opt/voicehub/dist" ]; then
    echo "✅ Frontend собран (dist/ существует)"
    echo "   Файлов: $(find /opt/voicehub/dist -type f | wc -l)"
else
    echo "❌ Frontend НЕ собран (dist/ не найден)"
fi
echo ""

# 6. Тест API
echo "🧪 Тест API..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
    echo "✅ API отвечает (HTTP $RESPONSE)"
    echo "   Ответ: $(curl -s http://localhost:8080/health)"
else
    echo "❌ API НЕ отвечает (HTTP $RESPONSE)"
fi
echo ""

# 7. Проверка подключения извне
echo "🌐 Проверка внешнего IP..."
EXTERNAL_IP=$(curl -s ifconfig.me 2>/dev/null || echo "не удалось определить")
echo "   Внешний IP: $EXTERNAL_IP"
echo ""

# Рекомендации
echo "💡 Рекомендации:"
echo "================"
if [ "$RESPONSE" != "200" ]; then
    echo "1. Backend не работает. Проверьте логи:"
    echo "   journalctl -u voicehub -n 50"
    echo ""
    echo "2. Попробуйте перезапустить:"
    echo "   systemctl restart voicehub"
    echo ""
fi

if [ ! -d "/opt/voicehub/dist" ]; then
    echo "3. Frontend не собран. Выполните:"
    echo "   cd /opt/voicehub && npm install && npm run build"
    echo ""
fi

echo "4. Для раздачи frontend нужен Nginx или встроенный сервер."
echo "   Смотрите инструкцию: /opt/voicehub/FIX_SERVER.md"
echo ""
