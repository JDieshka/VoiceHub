#!/bin/bash

# Универсальный скрипт настройки TURN сервера
# Использование: ./setup-turn.sh <SERVER_IP>
# Пример: ./setup-turn.sh 192.168.1.100

set -e

# Проверка аргументов
if [ -z "$1" ]; then
    echo "❌ Укажите IP адрес сервера!"
    echo "Использование: ./setup-turn.sh <SERVER_IP>"
    echo "Пример: ./setup-turn.sh 192.168.1.100"
    exit 1
fi

SERVER_IP=$1
SERVER_USER=${2:-root}
TURN_USERNAME="voicehub"
TURN_PASSWORD="VoiceHub2024TurnPass123"

echo "🔧 Настройка TURN сервера на $SERVER_IP"
echo "========================================="
echo ""

# Установка coturn
echo "📦 Установка coturn..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
apt-get update -qq
apt-get install -y coturn

# Включение coturn в /etc/default/coturn
sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn
ENDSSH

echo "✅ coturn установлен"
echo ""

# Настройка coturn
echo "⚙️ Настройка coturn..."
ssh $SERVER_USER@$SERVER_IP << ENDSSH
cat > /etc/turnserver.conf << 'EOF'
# TURN сервер для VoiceHub
# IP: $SERVER_IP

# Порты
listening-port=3478
tls-listening-port=5349

# Интерфейсы
listening-ip=0.0.0.0
relay-ip=0.0.0.0

# Внешний IP (ВАЖНО для работы через NAT)
external-ip=$SERVER_IP

# Аутентификация
lt-cred-mech
realm=$SERVER_IP

# Пользователи
user=$TURN_USERNAME:$TURN_PASSWORD

# Безопасность
fingerprint
no-tlsv1
no-tlsv1_1

# Лимиты
max-bps=0
total-quota=0
bps-capacity=0

# Логирование
verbose
log-file=/var/log/turnserver.log

# Не запускать как демон
no-daemon
no-cli
no-software-attribute
no-stale-nonce-check

# Производительность
proc-user=turnserver
proc-group=turnserver
EOF
ENDSSH

echo "✅ coturn настроен"
echo ""

# Создание пользователя TURN
echo "👤 Создание пользователя TURN..."
ssh $SERVER_USER@$SERVER_IP << ENDSSH
# Добавление пользователя в turnserver
turnadmin -a -u $TURN_USERNAME -p $TURN_PASSWORD -r $SERVER_IP
ENDSSH

echo "✅ Пользователь создан"
echo ""

# Запуск coturn
echo "🚀 Запуск coturn..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
systemctl enable coturn
systemctl restart coturn

# Проверка статуса
sleep 2
systemctl status coturn --no-pager
ENDSSH

echo "✅ coturn запущен"
echo ""

# Проверка firewall
echo "🔥 Проверка firewall..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
# Открытие портов TURN
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 5349/tcp
ufw allow 5349/udp

# Перезагрузка firewall
ufw reload
ENDSSH

echo "✅ Firewall настроен"
echo ""

# Тест TURN сервера
echo "🧪 Тест TURN сервера..."
ssh $SERVER_USER@$SERVER_IP << ENDSSH
# Проверка что порт слушается
netstat -tuln | grep 3478 || ss -tuln | grep 3478
ENDSSH

echo ""
echo "✅ TURN сервер настроен!"
echo ""
echo "📍 TURN сервер доступен:"
echo "   URL: turn:$SERVER_IP:3478"
echo "   Username: $TURN_USERNAME"
echo "   Password: $TURN_PASSWORD"
echo ""
echo "📋 Добавьте в .env файл клиента:"
echo "   VITE_TURN_URL=turn:$SERVER_IP:3478"
echo "   VITE_TURN_USERNAME=$TURN_USERNAME"
echo "   VITE_TURN_PASSWORD=$TURN_PASSWORD"
echo ""
echo "📋 Полезные команды:"
echo "   Логи: ssh $SERVER_USER@$SERVER_IP 'journalctl -u coturn -f'"
echo "   Рестарт: ssh $SERVER_USER@$SERVER_IP 'systemctl restart coturn'"
echo "   Статус: ssh $SERVER_USER@$SERVER_IP 'systemctl status coturn'"
echo ""
