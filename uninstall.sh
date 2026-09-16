#!/bin/bash

# VoiceHub Complete Uninstall Script
# Полное удаление VoiceHub с сервера
# Использование: ./uninstall.sh [OPTIONS]
#
# Options:
#   --all           Удалить всё без подтверждений
#   --keep-db       Оставить базу данных PostgreSQL
#   --keep-go       Оставить Go установленным
#   --keep-node     Оставить Node.js установленным
#   --keep-turn     Оставить TURN сервер
#   --force         Принудительное удаление без проверок
#   -h, --help      Показать справку

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции для вывода
info() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

header() {
    echo -e "${BLUE}$1${NC}"
}

# Проверка прав root
if [ "$EUID" -ne 0 ]; then
    error "Этот скрипт должен быть запущен с правами root"
    echo "Использование: sudo ./uninstall.sh"
    exit 1
fi

# Парсинг аргументов
REMOVE_ALL=false
KEEP_DB=false
KEEP_GO=false
KEEP_NODE=false
KEEP_TURN=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            REMOVE_ALL=true
            shift
            ;;
        --keep-db)
            KEEP_DB=true
            shift
            ;;
        --keep-go)
            KEEP_GO=true
            shift
            ;;
        --keep-node)
            KEEP_NODE=true
            shift
            ;;
        --keep-turn)
            KEEP_TURN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            echo "VoiceHub Complete Uninstall Script"
            echo ""
            echo "Использование: ./uninstall.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --all           Удалить всё без подтверждений"
            echo "  --keep-db       Оставить базу данных PostgreSQL"
            echo "  --keep-go       Оставить Go установленным"
            echo "  --keep-node     Оставить Node.js установленным"
            echo "  --keep-turn     Оставить TURN сервер"
            echo "  --force         Принудительное удаление без проверок"
            echo "  -h, --help      Показать эту справку"
            echo ""
            echo "Примеры:"
            echo "  ./uninstall.sh                  # Интерактивное удаление"
            echo "  ./uninstall.sh --all            # Удалить всё"
            echo "  ./uninstall.sh --keep-db        # Оставить БД"
            echo "  ./uninstall.sh --keep-go --keep-node  # Оставить Go и Node.js"
            exit 0
            ;;
        *)
            error "Неизвестный аргумент: $1"
            exit 1
            ;;
    esac
done

# Функция для подтверждения
confirm() {
    if [ "$REMOVE_ALL" = true ] || [ "$FORCE" = true ]; then
        return 0
    fi
    
    echo -n -e "${YELLOW}$1 [y/N]: ${NC}"
    read response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

header "╔════════════════════════════════════════════════════════════╗"
header "║     VoiceHub Complete Uninstall Script                     ║"
header "║     Полное удаление VoiceHub с сервера                     ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""

if [ "$REMOVE_ALL" = false ] && [ "$FORCE" = false ]; then
    warn "ВНИМАНИЕ: Это действие удалит VoiceHub с сервера!"
    warn "Все данные будут потеряны без возможности восстановления!"
    echo ""
    
    if ! confirm "Вы уверены что хотите продолжить?"; then
        info "Удаление отменено"
        exit 0
    fi
    echo ""
fi

# Шаг 1: Остановка сервисов
header "═══════════════════════════════════════════════════════════"
header "Шаг 1: Остановка сервисов"
header "═══════════════════════════════════════════════════════════"
echo ""

# Остановка VoiceHub
if systemctl is-active --quiet voicehub 2>/dev/null; then
    info "Остановка VoiceHub сервиса..."
    systemctl stop voicehub
    info "VoiceHub остановлен"
else
    warn "VoiceHub сервис не запущен"
fi

# Отключение автозапуска
if systemctl is-enabled --quiet voicehub 2>/dev/null; then
    info "Отключение автозапуска VoiceHub..."
    systemctl disable voicehub
    info "Автозапуск отключен"
fi

# Остановка TURN сервера
if systemctl is-active --quiet coturn 2>/dev/null; then
    if [ "$KEEP_TURN" = false ]; then
        if confirm "Остановить TURN сервер (coturn)?"; then
            info "Остановка TURN сервера..."
            systemctl stop coturn
            systemctl disable coturn 2>/dev/null || true
            info "TURN сервер остановлен"
        fi
    else
        warn "TURN сервер оставлен (флаг --keep-turn)"
    fi
fi

echo ""

# Шаг 2: Удаление systemd service
header "═══════════════════════════════════════════════════════════"
header "Шаг 2: Удаление systemd service"
header "═══════════════════════════════════════════════════════════"
echo ""

if [ -f "/etc/systemd/system/voicehub.service" ]; then
    info "Удаление voicehub.service..."
    rm -f /etc/systemd/system/voicehub.service
    systemctl daemon-reload
    info "Service файл удален"
else
    warn "Service файл не найден"
fi

echo ""

# Шаг 3: Удаление файлов проекта
header "═══════════════════════════════════════════════════════════"
header "Шаг 3: Удаление файлов проекта"
header "═══════════════════════════════════════════════════════════"
echo ""

PROJECT_DIRS=("/opt/voicehub" "/root/voicehub" "/home/*/voicehub")

for dir in "${PROJECT_DIRS[@]}"; do
    for path in $dir; do
        if [ -d "$path" ]; then
            if confirm "Удалить директорию $path?"; then
                info "Удаление $path..."
                rm -rf "$path"
                info "Директория удалена"
            fi
        fi
    done
done

echo ""

# Шаг 4: Удаление базы данных
header "═══════════════════════════════════════════════════════════"
header "Шаг 4: Удаление базы данных PostgreSQL"
header "═══════════════════════════════════════════════════════════"
echo ""

if command -v psql &> /dev/null; then
    if [ "$KEEP_DB" = false ]; then
        if confirm "Удалить базу данных voicehub и пользователя voicehub?"; then
            info "Удаление базы данных..."
            
            # Остановка PostgreSQL
            systemctl stop postgresql 2>/dev/null || true
            
            # Удаление БД и пользователя
            su - postgres -c "psql -c \"DROP DATABASE IF EXISTS voicehub;\"" 2>/dev/null || true
            su - postgres -c "psql -c \"DROP USER IF EXISTS voicehub;\"" 2>/dev/null || true
            
            info "База данных удалена"
            
            if confirm "Удалить PostgreSQL полностью?"; then
                info "Удаление PostgreSQL..."
                apt-get remove -y postgresql postgresql-contrib 2>/dev/null || true
                apt-get autoremove -y 2>/dev/null || true
                rm -rf /var/lib/postgresql
                info "PostgreSQL удален"
            else
                warn "PostgreSQL оставлен"
                systemctl start postgresql 2>/dev/null || true
            fi
        else
            warn "База данных оставлена"
        fi
    else
        warn "База данных оставлена (флаг --keep-db)"
    fi
else
    warn "PostgreSQL не установлен"
fi

echo ""

# Шаг 5: Удаление TURN сервера
header "═══════════════════════════════════════════════════════════"
header "Шаг 5: Удаление TURN сервера"
header "═══════════════════════════════════════════════════════════"
echo ""

if command -v turnserver &> /dev/null; then
    if [ "$KEEP_TURN" = false ]; then
        if confirm "Удалить TURN сервер (coturn)?"; then
            info "Удаление coturn..."
            apt-get remove -y coturn 2>/dev/null || true
            apt-get autoremove -y 2>/dev/null || true
            rm -f /etc/turnserver.conf
            info "TURN сервер удален"
        else
            warn "TURN сервер оставлен"
        fi
    else
        warn "TURN сервер оставлен (флаг --keep-turn)"
    fi
else
    warn "TURN сервер не установлен"
fi

echo ""

# Шаг 6: Удаление Go
header "═══════════════════════════════════════════════════════════"
header "Шаг 6: Удаление Go"
header "═══════════════════════════════════════════════════════════"
echo ""

if command -v go &> /dev/null; then
    if [ "$KEEP_GO" = false ]; then
        if confirm "Удалить Go?"; then
            info "Удаление Go..."
            rm -rf /usr/local/go
            
            # Удаление из PATH
            if [ -f "/root/.bashrc" ]; then
                sed -i '/\/usr\/local\/go\/bin/d' /root/.bashrc
            fi
            
            info "Go удален"
        else
            warn "Go оставлен"
        fi
    else
        warn "Go оставлен (флаг --keep-go)"
    fi
else
    warn "Go не установлен"
fi

echo ""

# Шаг 7: Удаление Node.js
header "═══════════════════════════════════════════════════════════"
header "Шаг 7: Удаление Node.js"
header "═══════════════════════════════════════════════════════════"
echo ""

if command -v node &> /dev/null; then
    if [ "$KEEP_NODE" = false ]; then
        if confirm "Удалить Node.js и npm?"; then
            info "Удаление Node.js..."
            apt-get remove -y nodejs npm 2>/dev/null || true
            apt-get autoremove -y 2>/dev/null || true
            rm -rf /usr/local/lib/node_modules
            rm -rf /root/.npm
            rm -rf /root/.node-gyp
            info "Node.js удален"
        else
            warn "Node.js оставлен"
        fi
    else
        warn "Node.js оставлен (флаг --keep-node)"
    fi
else
    warn "Node.js не установлен"
fi

echo ""

# Шаг 8: Очистка firewall правил
header "═══════════════════════════════════════════════════════════"
header "Шаг 8: Очистка firewall правил"
header "═══════════════════════════════════════════════════════════"
echo ""

if command -v ufw &> /dev/null; then
    if confirm "Удалить правила VoiceHub из firewall?"; then
        info "Удаление правил firewall..."
        
        # Удаление правил VoiceHub
        ufw delete allow 8080/tcp 2>/dev/null || true
        ufw delete allow 3478/tcp 2>/dev/null || true
        ufw delete allow 3478/udp 2>/dev/null || true
        
        # Перезагрузка firewall
        ufw reload 2>/dev/null || true
        
        info "Правила firewall удалены"
        warn "Правило SSH (22/tcp) оставлено для безопасности"
    else
        warn "Правила firewall оставлены"
    fi
else
    warn "UFW не установлен"
fi

echo ""

# Шаг 9: Очистка логов
header "═══════════════════════════════════════════════════════════"
header "Шаг 9: Очистка логов"
header "═══════════════════════════════════════════════════════════"
echo ""

if confirm "Очистить логи VoiceHub?"; then
    info "Очистка логов..."
    journalctl --rotate 2>/dev/null || true
    journalctl --vacuum-time=1s 2>/dev/null || true
    info "Логи очищены"
else
    warn "Логи оставлены"
fi

echo ""

# Шаг 10: Очистка кэша
header "═══════════════════════════════════════════════════════════"
header "Шаг 10: Очистка кэша"
header "═══════════════════════════════════════════════════════════"
echo ""

if confirm "Очистить кэш пакетов (apt)?"; then
    info "Очистка кэша..."
    apt-get clean 2>/dev/null || true
    apt-get autoclean 2>/dev/null || true
    info "Кэш очищен"
else
    warn "Кэш оставлен"
fi

echo ""

# Финальная проверка
header "═══════════════════════════════════════════════════════════"
header "Финальная проверка"
header "═══════════════════════════════════════════════════════════"
echo ""

info "Проверка установленных компонентов..."

# Проверка VoiceHub
if systemctl list-unit-files | grep -q voicehub; then
    warn "VoiceHub service все еще существует"
else
    info "VoiceHub service удален"
fi

# Проверка файлов
if [ -d "/opt/voicehub" ]; then
    warn "Директория /opt/voicehub все еще существует"
else
    info "Директория /opt/voicehub удалена"
fi

# Проверка БД
if command -v psql &> /dev/null; then
    if su - postgres -c "psql -lqt" 2>/dev/null | cut -d \| -f 1 | grep -qw voicehub; then
        warn "База данных voicehub все еще существует"
    else
        info "База данных voicehub удалена"
    fi
fi

# Проверка Go
if command -v go &> /dev/null; then
    warn "Go все еще установлен: $(go version)"
else
    info "Go удален"
fi

# Проверка Node.js
if command -v node &> /dev/null; then
    warn "Node.js все еще установлен: $(node --version)"
else
    info "Node.js удален"
fi

# Проверка TURN
if command -v turnserver &> /dev/null; then
    warn "TURN сервер все еще установлен"
else
    info "TURN сервер удален"
fi

echo ""

# Финальное сообщение
header "╔════════════════════════════════════════════════════════════╗"
header "║                  Удаление завершено!                       ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""
info "VoiceHub полностью удален с сервера"
echo ""

if [ "$KEEP_DB" = true ]; then
    warn "База данных PostgreSQL была оставлена"
    echo "   Для полного удаления выполните:"
    echo "   sudo -u postgres psql -c \"DROP DATABASE voicehub;\""
    echo "   sudo -u postgres psql -c \"DROP USER voicehub;\""
    echo ""
fi

if [ "$KEEP_GO" = true ]; then
    warn "Go был оставлен"
    echo "   Для удаления выполните:"
    echo "   sudo rm -rf /usr/local/go"
    echo ""
fi

if [ "$KEEP_NODE" = true ]; then
    warn "Node.js был оставлен"
    echo "   Для удаления выполните:"
    echo "   sudo apt-get remove nodejs npm"
    echo ""
fi

if [ "$KEEP_TURN" = true ]; then
    warn "TURN сервер был оставлен"
    echo "   Для удаления выполните:"
    echo "   sudo apt-get remove coturn"
    echo ""
fi

info "Рекомендуется перезагрузить сервер:"
echo "   sudo reboot"
echo ""
