#!/bin/bash

# VoiceHub Quick Diagnostic Script
# Быстрая диагностика проблем с VoiceHub

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
header "║     VoiceHub Quick Diagnostic                              ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""

PROJECT_DIR="/opt/voicehub"

# 1. Проверка директории
header "1. Проверка директории проекта"
if [ -d "$PROJECT_DIR" ]; then
    info "Директория $PROJECT_DIR существует"
    cd "$PROJECT_DIR"
    echo "   Содержимое:"
    ls -la | head -n 10
else
    error "Директория $PROJECT_DIR не найдена"
    exit 1
fi
echo ""

# 2. Проверка файлов сервера
header "2. Проверка файлов сервера"
if [ -f "server/main.go" ]; then
    info "server/main.go найден"
else
    error "server/main.go не найден"
fi

if [ -f "server/go.mod" ]; then
    info "server/go.mod найден"
else
    error "server/go.mod не найден"
fi
echo ""

# 3. Проверка бинарника
header "3. Проверка бинарника"
if [ -f "server/voicehub-server" ]; then
    info "Бинарник найден"
    ls -lh server/voicehub-server
    
    if [ -x "server/voicehub-server" ]; then
        info "Бинарник исполняемый"
    else
        warn "Бинарник не исполняемый"
        echo "   Исправление: chmod +x server/voicehub-server"
    fi
else
    error "Бинарник НЕ найден!"
    echo ""
    echo "   Решение: запустите install.sh"
fi
echo ""

# 4. Проверка Go
header "4. Проверка Go"
if command -v go &> /dev/null; then
    info "Go установлен: $(go version)"
else
    if [ -f "/usr/local/go/bin/go" ]; then
        warn "Go установлен, но не в PATH"
        echo "   Решение: export PATH=\$PATH:/usr/local/go/bin"
    else
        error "Go не установлен"
        echo "   Решение: запустите install.sh"
    fi
fi
echo ""

# 5. Проверка PostgreSQL
header "5. Проверка PostgreSQL"
if command -v psql &> /dev/null; then
    info "PostgreSQL установлен"
    
    if systemctl is-active --quiet postgresql; then
        info "PostgreSQL запущен"
        
        if sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw voicehub; then
            info "База данных voicehub существует"
        else
            warn "База данных voicehub не найдена"
            echo "   Решение: запустите install.sh"
        fi
    else
        error "PostgreSQL не запущен"
        echo "   Решение: systemctl start postgresql"
    fi
else
    error "PostgreSQL не установлен"
    echo "   Решение: запустите install.sh"
fi
echo ""

# 6. Проверка systemd service
header "6. Проверка systemd service"
if [ -f "/etc/systemd/system/voicehub.service" ]; then
    info "Service файл найден"
    
    echo "   Конфигурация:"
    cat /etc/systemd/system/voicehub.service | grep -E "^(ExecStart|WorkingDirectory|Environment)" | head -n 5
    
    if systemctl is-active --quiet voicehub; then
        info "Сервис запущен"
    else
        error "Сервис НЕ запущен"
        echo ""
        echo "   Статус:"
        systemctl status voicehub --no-pager | head -n 15
        echo ""
        echo "   Последние логи:"
        journalctl -u voicehub -n 10 --no-pager
    fi
else
    error "Service файл не найден"
    echo "   Решение: запустите install.sh"
fi
echo ""

# 7. Проверка API
header "7. Проверка API"
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    info "API отвечает"
    echo "   Ответ:"
    curl -s http://localhost:8080/health
    echo ""
else
    error "API не отвечает"
    echo "   Проверьте что сервис запущен"
fi
echo ""

# 8. Проверка firewall
header "8. Проверка firewall"
if command -v ufw &> /dev/null; then
    info "UFW установлен"
    echo "   Статус:"
    ufw status | grep -E "(8080|22)" || echo "   Правила не найдены"
else
    warn "UFW не установлен"
fi
echo ""

# 9. Предложения по исправлению
header "9. Предложения по исправлению"
echo ""

if [ ! -f "server/voicehub-server" ]; then
    echo "❌ Бинарник не собран"
    echo "   Решение:"
    echo "   cd /opt/voicehub"
    echo "   sudo ./install.sh"
    echo ""
fi

if ! systemctl is-active --quiet voicehub 2>/dev/null; then
    echo "❌ Сервис не запущен"
    echo "   Решение:"
    echo "   sudo systemctl start voicehub"
    echo "   sudo journalctl -u voicehub -f"
    echo ""
fi

if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "❌ API не отвечает"
    echo "   Решение:"
    echo "   1. Проверьте логи: sudo journalctl -u voicehub -n 50"
    echo "   2. Запустите вручную: cd /opt/voicehub/server && ./voicehub-server"
    echo ""
fi

echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Если проблемы продолжаются, выполните:"
echo "  1. Полная переустановка:"
echo "     cd /opt/voicehub"
echo "     sudo ./uninstall.sh --all"
echo "     sudo ./install.sh"
echo ""
echo "  2. Ручная диагностика:"
echo "     cd /opt/voicehub/server"
echo "     export PATH=\$PATH:/usr/local/go/bin"
echo "     go build -v -o voicehub-server main.go"
echo "     ./voicehub-server"
echo ""
