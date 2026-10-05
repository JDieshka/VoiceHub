#!/bin/bash

# Create Tauri Symlink Script
# Создание symlink для Tauri CLI

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

# Проверяем права root
if [ "$EUID" -ne 0 ]; then
    error "Этот скрипт должен быть запущен с правами root"
    exit 1
fi

# Ищем tauri в cargo bin
TAURI_PATH="/root/.cargo/bin/tauri"

if [ ! -f "$TAURI_PATH" ]; then
    error "Tauri CLI не найден в $TAURI_PATH"
    echo ""
    echo "Проверьте что Tauri установлен:"
    echo "  cargo install tauri-cli --version '^1.6'"
    exit 1
fi

info "Tauri CLI найден: $TAURI_PATH"

# Создаем symlink в /usr/local/bin
if [ -L "/usr/local/bin/tauri" ]; then
    warn "Symlink уже существует, обновляем..."
    rm -f /usr/local/bin/tauri
fi

ln -s "$TAURI_PATH" /usr/local/bin/tauri
info "Создан symlink: /usr/local/bin/tauri -> $TAURI_PATH"

# Проверяем что tauri работает
if command -v tauri &> /dev/null; then
    info "Tauri CLI доступен: $(which tauri)"
    info "Версия: $(tauri --version)"
else
    error "Tauri CLI не работает после создания symlink"
    exit 1
fi

echo ""
info "✅ Готово!"
echo ""
echo "Теперь можете запустить сборку:"
echo "  sudo ./build-desktop.sh"
echo ""
