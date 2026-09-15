#!/bin/bash

# VoiceHub Installation Script
# Автоматическая установка Go 1.24+, зависимостей и сборка проекта

set -e  # Остановка при ошибке

echo "🚀 VoiceHub Installation Script"
echo "================================"
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
info() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

# Проверка что мы в правильной директории
if [ ! -f "server/main.go" ]; then
    error "Скрипт должен запускаться из корня проекта voicehub"
fi

# Шаг 1: Установка Go 1.24+
echo ""
echo "📦 Шаг 1: Установка Go 1.24+"
echo "----------------------------"

# Проверка текущей версии Go
if command -v go &> /dev/null; then
    CURRENT_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
    info "Текущая версия Go: $CURRENT_VERSION"
    
    # Проверка что версия >= 1.24
    MAJOR=$(echo $CURRENT_VERSION | cut -d. -f1)
    MINOR=$(echo $CURRENT_VERSION | cut -d. -f2)
    
    if [ "$MAJOR" -ge 1 ] && [ "$MINOR" -ge 24 ]; then
        info "Go $CURRENT_VERSION уже установлен и подходит"
    else
        warn "Go $CURRENT_VERSION слишком старый, требуется 1.24+"
        INSTALL_GO=true
    fi
else
    warn "Go не установлен"
    INSTALL_GO=true
fi

if [ "$INSTALL_GO" = true ]; then
    echo "Установка Go 1.24.0..."
    
    # Удаление старой версии если есть
    if [ -d "/usr/local/go" ]; then
        warn "Удаление старой версии Go..."
        rm -rf /usr/local/go
    fi
    
    # Скачивание Go 1.24.0
    cd /tmp
    wget -q --show-progress https://go.dev/dl/go1.24.0.linux-amd64.tar.gz -O go1.24.0.linux-amd64.tar.gz
    
    # Распаковка
    info "Распаковка Go..."
    tar -C /usr/local -xzf go1.24.0.linux-amd64.tar.gz
    
    # Добавление в PATH
    if ! grep -q "/usr/local/go/bin" ~/.bashrc; then
        echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
        info "Go добавлен в PATH"
    fi
    
    export PATH=$PATH:/usr/local/go/bin
    
    # Удаление архива
    rm go1.24.0.linux-amd64.tar.gz
    
    # Проверка установки
    NEW_VERSION=$(go version | awk '{print $3}')
    info "Go успешно установлен: $NEW_VERSION"
fi

# Шаг 2: Установка PostgreSQL
echo ""
echo "📦 Шаг 2: Проверка PostgreSQL"
echo "------------------------------"

if ! command -v psql &> /dev/null; then
    warn "PostgreSQL не установлен"
    echo "Установка PostgreSQL..."
    apt-get update -qq
    apt-get install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    info "PostgreSQL установлен и запущен"
else
    info "PostgreSQL уже установлен"
fi

# Создание базы данных и пользователя
echo "Настройка базы данных..."
su - postgres -c "psql -c \"CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';\"" 2>/dev/null || warn "Пользователь voicehub уже существует"
su - postgres -c "psql -c \"CREATE DATABASE voicehub OWNER voicehub;\"" 2>/dev/null || warn "База данных voicehub уже существует"
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;\"" 2>/dev/null
info "База данных настроена"

# Шаг 3: Установка зависимостей Go
echo ""
echo "📦 Шаг 3: Установка зависимостей Go"
echo "------------------------------------"

cd server

# Очистка кэша модулей
info "Очистка кэша модулей..."
go clean -modcache

# Удаление старого go.sum
if [ -f "go.sum" ]; then
    rm go.sum
    info "Старый go.sum удалён"
fi

# Загрузка зависимостей
info "Загрузка зависимостей (это может занять 2-3 минуты)..."
go mod tidy

if [ $? -eq 0 ]; then
    info "Зависимости успешно загружены"
else
    error "Ошибка при загрузке зависимостей"
fi

# Шаг 4: Сборка бинарника
echo ""
echo "🔨 Шаг 4: Сборка бинарника"
echo "---------------------------"

info "Компиляция VoiceHub Server..."
go build -o voicehub-server main.go

if [ $? -eq 0 ]; then
    info "Бинарник успешно собран"
    ls -lh voicehub-server
else
    error "Ошибка компиляции"
fi

# Шаг 5: Настройка systemd service
echo ""
echo "⚙️  Шаг 5: Настройка systemd service"
echo "-------------------------------------"

cat > /etc/systemd/system/voicehub.service << 'EOF'
[Unit]
Description=VoiceHub Server
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/voicehub/server
Environment="PATH=/usr/local/go/bin:/usr/bin:/bin"
Environment="DATABASE_URL=postgres://voicehub:VoiceHub2024SecurePass@localhost:5432/voicehub?sslmode=disable"
Environment="JWT_SECRET=VoiceHub2024SuperSecretJWTKeyChangeThisInProduction88!"
Environment="PORT=8080"
Environment="MODE=hybrid"
Environment="ALLOWED_ORIGINS=*"
ExecStart=/opt/voicehub/server/voicehub-server
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

info "Systemd service создан"

# Шаг 6: Настройка firewall
echo ""
echo "🔥 Шаг 6: Настройка firewall"
echo "-----------------------------"

if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 8080/tcp
    ufw allow 3478/tcp
    ufw allow 3478/udp
    echo "y" | ufw enable 2>/dev/null || true
    info "Firewall настроен"
else
    warn "UFW не установлен, пропуск настройки firewall"
fi

# Шаг 7: Запуск сервиса
echo ""
echo "🚀 Шаг 7: Запуск сервиса"
echo "-------------------------"

systemctl daemon-reload
systemctl enable voicehub
systemctl restart voicehub

# Ожидание запуска
sleep 3

# Проверка статуса
if systemctl is-active --quiet voicehub; then
    info "Сервис успешно запущен"
else
    error "Сервис не запустился. Проверьте логи: journalctl -u voicehub -n 50"
fi

# Шаг 8: Проверка работы
echo ""
echo "🧪 Шаг 8: Проверка работы"
echo "--------------------------"

# Тест API
if curl -s http://localhost:8080/health | grep -q "ok"; then
    info "API работает корректно"
else
    warn "API не отвечает. Проверьте логи: journalctl -u voicehub -n 50"
fi

# Тест frontend
if curl -s http://localhost:8080/ | grep -q "<!DOCTYPE html>"; then
    info "Frontend работает корректно"
else
    warn "Frontend не отвечает. Убедитесь что dist/ существует"
fi

# Финальное сообщение
echo ""
echo "================================"
echo -e "${GREEN}✅ Установка завершена!${NC}"
echo "================================"
echo ""
echo "📍 Ваш сервер доступен:"
echo "   http://31.77.158.177:8080"
echo ""
echo "📋 Полезные команды:"
echo "   Логи:    journalctl -u voicehub -f"
echo "   Статус:  systemctl status voicehub"
echo "   Рестарт: systemctl restart voicehub"
echo ""
echo "⚠️  ВАЖНО:"
echo "   Для работы микрофона в браузере нужен HTTPS!"
echo "   Используйте Desktop приложение (Tauri) для полноценной работы."
echo ""
