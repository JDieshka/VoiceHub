#!/bin/bash

# VoiceHub Dependencies Fix Script
# Исправление проблемы с отсутствующими зависимостями Go

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     VoiceHub Dependencies Fix                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Проверка Go
if ! command -v go &> /dev/null; then
    error "Go не установлен!"
    exit 1
fi

GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
info "Go версия: $GO_VERSION"

# Переход в директорию server
cd server

# Проверка версии Go и выбор appropriate main.go
GO_MAJOR=$(echo $GO_VERSION | cut -d. -f1)
GO_MINOR=$(echo $GO_VERSION | cut -d. -f2)

if [ "$GO_MAJOR" -lt 1 ] || ([ "$GO_MAJOR" -eq 1 ] && [ "$GO_MINOR" -lt 24 ]); then
    warn "Go $GO_VERSION < 1.24, используется упрощенная версия (без SFU)"
    
    if [ -f "main-simple.go" ]; then
        info "Используется main-simple.go"
        cp main.go main.go.backup 2>/dev/null || true
        cp main-simple.go main.go
        USE_SIMPLE=true
    else
        error "main-simple.go не найден!"
        exit 1
    fi
else
    info "Go $GO_VERSION >= 1.24, используется полная версия"
    USE_SIMPLE=false
fi

echo ""
info "Обновление go.mod..."

# Обновляем go.mod для правильной версии Go
if [ "$USE_SIMPLE" = true ]; then
    # Для упрощенной версии убираем pion/webrtc
    cat > go.mod << 'EOF'
module voicehub-server

go 1.21

require (
	github.com/golang-jwt/jwt/v5 v5.2.0
	github.com/google/uuid v1.6.0
	github.com/gorilla/websocket v1.5.1
	github.com/lib/pq v1.10.9
	golang.org/x/crypto v0.17.0
)
EOF
    info "go.mod обновлен для упрощенной версии"
else
    # Для полной версии оставляем все зависимости
    cat > go.mod << 'EOF'
module voicehub-server

go 1.21

require (
	github.com/golang-jwt/jwt/v5 v5.2.0
	github.com/google/uuid v1.6.0
	github.com/gorilla/websocket v1.5.1
	github.com/lib/pq v1.10.9
	github.com/pion/webrtc/v4 v4.0.0-beta.22
	golang.org/x/crypto v0.17.0
)
EOF
    info "go.mod обновлен для полной версии"
fi

echo ""
info "Удаление старого go.sum..."
rm -f go.sum

echo ""
info "Загрузка зависимостей (это может занять 2-3 минуты)..."
if ! go mod download; then
    error "Не удалось загрузить зависимости"
    exit 1
fi

echo ""
info "Обновление go.sum..."
if ! go mod tidy; then
    error "Не удалось обновить go.sum"
    exit 1
fi

echo ""
info "Компиляция бинарника..."
if ! go build -v -o voicehub-server main.go 2>&1; then
    error "Ошибка компиляции!"
    
    # Восстанавливаем оригинал если использовали simple версию
    if [ "$USE_SIMPLE" = true ] && [ -f "main.go.backup" ]; then
        mv main.go.backup main.go
    fi
    
    exit 1
fi

# Восстанавливаем оригинал если использовали simple версию
if [ "$USE_SIMPLE" = true ] && [ -f "main.go.backup" ]; then
    mv main.go.backup main.go
    info "Оригинальный main.go восстановлен"
fi

echo ""
info "Делаем бинарник исполняемым..."
chmod +x voicehub-server

echo ""
info "Проверка бинарника..."
ls -lh voicehub-server

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ✅ Зависимости исправлены!                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
info "Теперь можете запустить install.sh:"
echo "  cd /opt/VoiceHub"
echo "  sudo ./install.sh"
echo ""
