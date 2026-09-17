#!/bin/bash

# Fix Rust/Cargo PATH Script
# Исправление PATH для Rust/Cargo

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
header "║     Исправление Rust/Cargo PATH                            ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""

# Проверяем права root
if [ "$EUID" -ne 0 ]; then
    error "Этот скрипт должен быть запущен с правами root"
    exit 1
fi

# Ищем cargo
header "Поиск Cargo..."
CARGO_PATH=""

# Проверяем стандартные расположения
POSSIBLE_PATHS=(
    "/root/.cargo/bin/cargo"
    "/usr/local/cargo/bin/cargo"
    "/home/*/.cargo/bin/cargo"
)

for path in "${POSSIBLE_PATHS[@]}"; do
    if [ -f "$path" ]; then
        CARGO_PATH="$path"
        info "Cargo найден: $CARGO_PATH"
        break
    fi
done

# Если не найден, ищем через find
if [ -z "$CARGO_PATH" ]; then
    warn "Cargo не найден в стандартных расположениях"
    info "Ищем через find..."
    CARGO_PATH=$(find / -name "cargo" -type f -executable 2>/dev/null | grep -E "bin/cargo$" | head -1)
    
    if [ -n "$CARGO_PATH" ]; then
        info "Cargo найден: $CARGO_PATH"
    else
        error "Cargo не найден!"
        echo ""
        echo "Rust не установлен или установлен неправильно."
        echo "Установите Rust:"
        echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        exit 1
    fi
fi

# Получаем директорию bin
CARGO_BIN_DIR=$(dirname "$CARGO_PATH")
info "Cargo bin директория: $CARGO_BIN_DIR"

# Добавляем в PATH для текущего скрипта
export PATH="$CARGO_BIN_DIR:$PATH"
info "PATH обновлен для текущей сессии"

# Проверяем что cargo работает
if ! command -v cargo &> /dev/null; then
    error "Cargo не работает даже после обновления PATH"
    exit 1
fi

info "Cargo версия: $(cargo --version)"
echo ""

# Добавляем в PATH для root пользователя
header "Добавление в PATH для root..."
if ! grep -q "$CARGO_BIN_DIR" /root/.bashrc; then
    echo "export PATH=\"$CARGO_BIN_DIR:\$PATH\"" >> /root/.bashrc
    info "Добавлено в /root/.bashrc"
else
    info "Уже есть в /root/.bashrc"
fi

# Добавляем в /etc/environment для всех пользователей
if ! grep -q "$CARGO_BIN_DIR" /etc/environment 2>/dev/null; then
    echo "PATH=\"$CARGO_BIN_DIR:\$PATH\"" >> /etc/environment
    info "Добавлено в /etc/environment"
else
    info "Уже есть в /etc/environment"
fi

echo ""

# Проверяем Tauri CLI
header "Проверка Tauri CLI..."
if command -v tauri &> /dev/null; then
    info "Tauri CLI найден: $(which tauri)"
    info "Версия: $(tauri --version)"
else
    warn "Tauri CLI не найден"
    echo ""
    info "Устанавливаем Tauri CLI..."
    
    if cargo install tauri-cli --version "^1.6"; then
        info "Tauri CLI установлен успешно"
        
        # Проверяем еще раз
        if command -v tauri &> /dev/null; then
            info "Tauri CLI версия: $(tauri --version)"
        else
            warn "Tauri CLI установлен, но не найден в PATH"
            info "Попробуйте перезапустить терминал или выполнить:"
            echo "  source /root/.bashrc"
        fi
    else
        error "Не удалось установить Tauri CLI"
        exit 1
    fi
fi

echo ""
header "╔════════════════════════════════════════════════════════════╗"
header "║              ✅ PATH исправлен!                            ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""
info "Что было сделано:"
echo "  1. Найден Cargo: $CARGO_PATH"
echo "  2. Добавлен в PATH: $CARGO_BIN_DIR"
echo "  3. Обновлен /root/.bashrc"
echo "  4. Обновлен /etc/environment"
echo ""
info "Следующие шаги:"
echo "  1. Перезапустите терминал или выполните: source /root/.bashrc"
echo "  2. Запустите сборку: sudo ./build-desktop.sh"
echo ""
