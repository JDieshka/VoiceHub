#!/bin/bash

# Install Tauri Dependencies Script
# Установка всех необходимых зависимостей для сборки Tauri на Linux

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

# Проверка прав root
if [ "$EUID" -ne 0 ]; then
    error "Этот скрипт должен быть запущен с правами root"
    echo "Использование: sudo ./install-tauri-deps.sh"
    exit 1
fi

header "╔════════════════════════════════════════════════════════════╗"
header "║     Установка зависимостей Tauri                           ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""

# Определяем дистрибутив
if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO=$ID
    info "Дистрибутив: $DISTRO"
else
    error "Не удалось определить дистрибутив"
    exit 1
fi

echo ""
header "═══════════════════════════════════════════════════════════"
header "Установка системных зависимостей"
header "═══════════════════════════════════════════════════════════"
echo ""

case $DISTRO in
    ubuntu|debian)
        info "Обновление списка пакетов..."
        apt-get update -qq
        
        info "Установка базовых инструментов..."
        apt-get install -y -qq \
            build-essential \
            pkg-config \
            libssl-dev \
            curl \
            wget \
            git
        
        info "Установка зависимостей для Tauri..."
        apt-get install -y -qq \
            libgtk-3-dev \
            libwebkit2gtk-4.0-dev \
            libayatana-appindicator3-dev \
            librsvg2-dev \
            libappindicator3-dev \
            libsoup2.4-dev \
            libjavascriptcoregtk-4.0-dev
        
        info "Установка дополнительных библиотек..."
        apt-get install -y -qq \
            libglib2.0-dev \
            libgdk-pixbuf2.0-dev \
            libffi-dev \
            libxml2-dev \
            libxslt1-dev
        ;;
    
    centos|rhel|fedora)
        info "Обновление списка пакетов..."
        dnf update -y -q || yum update -y -q
        
        info "Установка базовых инструментов..."
        dnf groupinstall -y "Development Tools" || yum groupinstall -y "Development Tools"
        dnf install -y pkgconfig openssl-devel curl wget git || yum install -y pkgconfig openssl-devel curl wget git
        
        info "Установка зависимостей для Tauri..."
        dnf install -y \
            gtk3-devel \
            webkit2gtk3-devel \
            libappindicator-gtk3-devel \
            librsvg2-devel || \
        yum install -y \
            gtk3-devel \
            webkit2gtk3-devel \
            libappindicator-gtk3-devel \
            librsvg2-devel
        ;;
    
    arch|manjaro)
        info "Обновление системы..."
        pacman -Syu --noconfirm
        
        info "Установка базовых инструментов..."
        pacman -S --noconfirm \
            base-devel \
            pkgconf \
            openssl \
            curl \
            wget \
            git
        
        info "Установка зависимостей для Tauri..."
        pacman -S --noconfirm \
            gtk3 \
            webkit2gtk \
            libappindicator-gtk3 \
            librsvg
        ;;
    
    *)
        warn "Неизвестный дистрибутив: $DISTRO"
        echo ""
        echo "Установите зависимости вручную:"
        echo "  - pkg-config"
        echo "  - libgtk-3-dev"
        echo "  - libwebkit2gtk-4.0-dev"
        echo "  - libayatana-appindicator3-dev"
        echo "  - librsvg2-dev"
        echo ""
        read -p "Продолжить? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
        ;;
esac

echo ""
header "═══════════════════════════════════════════════════════════"
header "Проверка установки"
header "═══════════════════════════════════════════════════════════"
echo ""

# Проверка pkg-config
if command -v pkg-config &> /dev/null; then
    info "pkg-config установлен: $(pkg-config --version)"
else
    error "pkg-config не установлен!"
    exit 1
fi

# Проверка gtk
if pkg-config --exists gtk+-3.0; then
    info "GTK3 установлен: $(pkg-config --modversion gtk+-3.0)"
else
    error "GTK3 не установлен!"
    exit 1
fi

# Проверка webkit
if pkg-config --exists webkit2gtk-4.0; then
    info "WebKitGTK установлен: $(pkg-config --modversion webkit2gtk-4.0)"
else
    error "WebKitGTK не установлен!"
    exit 1
fi

echo ""
header "═══════════════════════════════════════════════════════════"
header "Установка Rust (если не установлен)"
header "═══════════════════════════════════════════════════════════"
echo ""

if command -v rustc &> /dev/null; then
    info "Rust уже установлен: $(rustc --version)"
else
    warn "Rust не установлен, устанавливаем..."
    
    # Установка Rust
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    
    # Добавление в PATH для текущего пользователя
    if [ -f "$HOME/.cargo/env" ]; then
        source "$HOME/.cargo/env"
    fi
    
    # Добавление в PATH для root
    if ! grep -q "/root/.cargo/bin" /root/.bashrc; then
        echo 'export PATH=$PATH:/root/.cargo/bin' >> /root/.bashrc
    fi
    
    export PATH=$PATH:/root/.cargo/bin
    
    if command -v rustc &> /dev/null; then
        info "Rust установлен: $(rustc --version)"
    else
        error "Не удалось установить Rust"
        exit 1
    fi
fi

echo ""
header "═══════════════════════════════════════════════════════════"
header "Установка Tauri CLI"
header "═══════════════════════════════════════════════════════════"
echo ""

export PATH=$PATH:/root/.cargo/bin

if command -v tauri &> /dev/null; then
    info "Tauri CLI уже установлен: $(tauri --version)"
else
    info "Установка Tauri CLI..."
    cargo install tauri-cli --version "^1.6"
    
    if command -v tauri &> /dev/null; then
        info "Tauri CLI установлен: $(tauri --version)"
    else
        error "Не удалось установить Tauri CLI"
        exit 1
    fi
fi

echo ""
header "╔════════════════════════════════════════════════════════════╗"
header "║          ✅ Все зависимости установлены!                   ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""
info "Теперь можете запустить сборку:"
echo "  cd /opt/VoiceHub"
echo "  sudo ./build-desktop.sh"
echo ""
