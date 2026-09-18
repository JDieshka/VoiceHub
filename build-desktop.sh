#!/bin/bash

# Desktop Build Script
# Автоматическая сборка desktop приложения

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
header "║     Сборка Desktop Приложения                              ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""

# Проверка прав root
if [ "$EUID" -ne 0 ]; then
    error "Этот скрипт должен быть запущен с правами root"
    echo "Использование: sudo ./build-desktop.sh"
    exit 1
fi

# Проверка наличия зависимостей
header "Проверка зависимостей..."

MISSING_DEPS=()

# Проверка pkg-config
if ! command -v pkg-config &> /dev/null; then
    MISSING_DEPS+=("pkg-config")
fi

# Проверка Rust
if ! command -v rustc &> /dev/null; then
    MISSING_DEPS+=("rust")
fi

# Проверка Tauri CLI
export PATH=$PATH:/root/.cargo/bin
if ! command -v tauri &> /dev/null; then
    MISSING_DEPS+=("tauri-cli")
fi

# Проверка GTK3
if ! pkg-config --exists gtk+-3.0 2>/dev/null; then
    MISSING_DEPS+=("gtk3")
fi

# Проверка WebKitGTK
if ! pkg-config --exists webkit2gtk-4.0 2>/dev/null; then
    MISSING_DEPS+=("webkit2gtk")
fi

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    error "Отсутствуют необходимые зависимости: ${MISSING_DEPS[*]}"
    echo ""
    echo "Установите зависимости:"
    echo "  sudo ./install-tauri-deps.sh"
    echo ""
    exit 1
fi

info "Все зависимости установлены"
echo ""

# Переход в директорию проекта
PROJECT_DIR="/opt/VoiceHub"
if [ ! -d "$PROJECT_DIR" ]; then
    error "Директория проекта не найдена: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

# Очистка старых сборок
header "Очистка старых сборок..."
if [ -d "src-tauri/target" ]; then
    rm -rf src-tauri/target/release/bundle
    info "Старые файлы удалены"
else
    info "Старых файлов нет"
fi
echo ""

# Сборка frontend
header "Сборка frontend..."
if ! npm run build; then
    error "Ошибка сборки frontend!"
    exit 1
fi
info "Frontend собран"
echo ""

# Сборка desktop приложения
header "Сборка desktop приложения (это может занять 5-10 минут)..."
cd src-tauri

if ! cargo tauri build; then
    error "Ошибка сборки desktop приложения!"
    exit 1
fi

info "Desktop приложение собрано"
echo ""

# Создание директории downloads
DOWNLOADS_DIR="$PROJECT_DIR/downloads"
mkdir -p "$DOWNLOADS_DIR"
chmod 755 "$DOWNLOADS_DIR"

# Копирование файлов в downloads
header "Копирование файлов в директорию загрузок..."

# Windows MSI
if [ -f "target/release/bundle/msi/VoiceHub_2.0.0_x64_en-US.msi" ]; then
    cp "target/release/bundle/msi/VoiceHub_2.0.0_x64_en-US.msi" "$DOWNLOADS_DIR/VoiceHub-Setup.msi"
    info "Windows MSI скопирован: VoiceHub-Setup.msi"
fi

# Windows EXE
if [ -f "target/release/bundle/nsis/VoiceHub_2.0.0_x64-setup.exe" ]; then
    cp "target/release/bundle/nsis/VoiceHub_2.0.0_x64-setup.exe" "$DOWNLOADS_DIR/VoiceHub-Setup.exe"
    info "Windows EXE скопирован: VoiceHub-Setup.exe"
fi

# Linux AppImage
if ls target/release/bundle/appimage/*.AppImage 1> /dev/null 2>&1; then
    cp target/release/bundle/appimage/*.AppImage "$DOWNLOADS_DIR/VoiceHub.AppImage"
    chmod +x "$DOWNLOADS_DIR/VoiceHub.AppImage"
    info "Linux AppImage скопирован: VoiceHub.AppImage"
fi

# Linux DEB
if ls target/release/bundle/deb/*.deb 1> /dev/null 2>&1; then
    cp target/release/bundle/deb/*.deb "$DOWNLOADS_DIR/VoiceHub.deb"
    info "Linux DEB скопирован: VoiceHub.deb"
fi

cd "$PROJECT_DIR"
echo ""

# Создание файла с информацией о версии
header "Создание файла версии..."
cat > "$DOWNLOADS_DIR/version.json" << EOF
{
  "version": "2.0.0",
  "build_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "files": [
EOF

# Добавление информации о файлах
FIRST=true
for file in "$DOWNLOADS_DIR"/*; do
    if [ -f "$file" ] && [ "$(basename "$file")" != "version.json" ]; then
        if [ "$FIRST" = true ]; then
            FIRST=false
        else
            echo "," >> "$DOWNLOADS_DIR/version.json"
        fi
        
        FILENAME=$(basename "$file")
        FILESIZE=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
        FILEDATE=$(stat -c%y "$file" 2>/dev/null || stat -f%m "$file")
        
        cat >> "$DOWNLOADS_DIR/version.json" << EOF
    {
      "name": "$FILENAME",
      "size": $FILESIZE,
      "date": "$FILEDATE"
    }
EOF
    fi
done

cat >> "$DOWNLOADS_DIR/version.json" << EOF
  ]
}
EOF

info "Файл версии создан: version.json"
echo ""

# Установка прав
header "Установка прав доступа..."
chmod 644 "$DOWNLOADS_DIR"/*
info "Права установлены"
echo ""

# Список файлов
header "Файлы для загрузки:"
ls -lh "$DOWNLOADS_DIR" | grep -v "^total" | grep -v "version.json"
echo ""

# Финальное сообщение
header "╔════════════════════════════════════════════════════════════╗"
header "║              ✅ Сборка завершена!                          ║"
header "╚════════════════════════════════════════════════════════════╝"
echo ""
info "Файлы доступны по адресу:"
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "   http://$SERVER_IP:8080/downloads"
echo ""
info "Полезные команды:"
echo "   Список файлов: ls -lh $DOWNLOADS_DIR"
echo "   Удалить файлы: rm -rf $DOWNLOADS_DIR/*"
echo "   Пересобрать:   sudo ./build-desktop.sh"
echo ""
