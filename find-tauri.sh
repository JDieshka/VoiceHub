#!/bin/bash

# Find Tauri CLI Script
# Поиск установленного Tauri CLI

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
header "║     Поиск Tauri CLI                                        ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""

# Проверяем различные возможные расположения
header "Проверяем возможные расположения Tauri CLI..."
echo ""

LOCATIONS=(
    "/root/.cargo/bin/tauri"
    "$HOME/.cargo/bin/tauri"
    "/usr/local/cargo/bin/tauri"
    "/usr/bin/tauri"
    "/usr/local/bin/tauri"
)

FOUND=false
FOUND_PATH=""

for location in "${LOCATIONS[@]}"; do
    if [ -f "$location" ]; then
        info "Найден: $location"
        FOUND=true
        FOUND_PATH="$location"
        
        # Проверяем версию
        if [ -x "$location" ]; then
            VERSION=$("$location" --version 2>/dev/null || echo "не удалось получить версию")
            info "Версия: $VERSION"
        else
            warn "Файл не исполняемый"
        fi
    fi
done

echo ""

# Ищем через cargo
header "Проверяем через cargo..."
if command -v cargo &> /dev/null; then
    info "Cargo найден: $(which cargo)"
    
    # Получаем cargo home
    CARGO_HOME=$(cargo --version 2>/dev/null | grep -oP 'cargo-home: \K[^ ]+' || echo "")
    if [ -z "$CARGO_HOME" ]; then
        CARGO_HOME="${CARGO_HOME:-$HOME/.cargo}"
    fi
    
    info "Cargo home: $CARGO_HOME"
    
    # Проверяем bin директорию
    if [ -d "$CARGO_HOME/bin" ]; then
        info "Bin директория: $CARGO_HOME/bin"
        
        # Ищем tauri в bin
        if [ -f "$CARGO_HOME/bin/tauri" ]; then
            info "Tauri CLI найден в cargo bin!"
            FOUND=true
            FOUND_PATH="$CARGO_HOME/bin/tauri"
        else
            warn "Tauri CLI не найден в $CARGO_HOME/bin"
            
            # Список всех установленных пакетов
            echo ""
            header "Установленные cargo пакеты:"
            cargo install --list 2>/dev/null | grep -A 1 "tauri" || warn "Tauri не найден в списке установленных пакетов"
        fi
    else
        warn "Bin директория не найдена: $CARGO_HOME/bin"
    fi
else
    error "Cargo не найден!"
fi

echo ""

# Ищем через find
header "Глобальный поиск tauri..."
FOUND_FILES=$(find / -name "tauri" -type f 2>/dev/null | grep -E "(bin|cargo)" | head -5 || echo "")

if [ -n "$FOUND_FILES" ]; then
    info "Найдены файлы tauri:"
    echo "$FOUND_FILES" | while read -r file; do
        echo "  - $file"
        if [ -x "$file" ]; then
            VERSION=$("$file" --version 2>/dev/null || echo "не удалось получить версию")
            echo "    Версия: $VERSION"
        fi
    done
else
    warn "Файлы tauri не найдены"
fi

echo ""

# Проверяем PATH
header "Текущий PATH:"
echo "$PATH" | tr ':' '\n' | while read -r dir; do
    if [ -d "$dir" ]; then
        if [ -f "$dir/tauri" ]; then
            info "$dir (содержит tauri)"
        else
            echo "  $dir"
        fi
    fi
done

echo ""

# Финальный результат
if [ "$FOUND" = true ] && [ -n "$FOUND_PATH" ]; then
    header "╔════════════════════════════════════════════════════════════╗"
    header "║              ✅ Tauri CLI найден!                          ║"
    header "╚════════════════════════════════════════════════════════════╝"
    echo ""
    info "Путь: $FOUND_PATH"
    echo ""
    echo "Чтобы использовать:"
    echo "  export PATH=$(dirname "$FOUND_PATH"):\$PATH"
    echo "  tauri --version"
    echo ""
    echo "Или создайте symlink:"
    echo "  sudo ln -sf $FOUND_PATH /usr/local/bin/tauri"
    echo ""
else
    header "╔════════════════════════════════════════════════════════════╗"
    header "║              ❌ Tauri CLI не найден                        ║"
    header "╚════════════════════════════════════════════════════════════╝"
    echo ""
    warn "Tauri CLI не установлен или установлен в неизвестном месте"
    echo ""
    echo "Решение:"
    echo "  1. Установите Tauri CLI:"
    echo "     cargo install tauri-cli --version '^1.6'"
    echo ""
    echo "  2. Или используйте --force для переустановки:"
    echo "     cargo install tauri-cli --version '^1.6' --force"
    echo ""
fi
