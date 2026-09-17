#!/bin/bash

# Скрипт для создания нового релиза VoiceHub
# Использование: ./create-release.sh [version]
# Пример: ./create-release.sh 2.1.0

set -e

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Проверка версии
if [ -z "$1" ]; then
    echo -e "${RED}❌ Укажите версию!${NC}"
    echo "Использование: $0 <version>"
    echo "Пример: $0 2.1.0"
    exit 1
fi

VERSION=$1
TAG="v$VERSION"

echo -e "${GREEN}🚀 Создание релиза VoiceHub $VERSION${NC}"
echo ""

# Проверка что мы в git репозитории
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo -e "${RED}❌ Это не git репозиторий!${NC}"
    exit 1
fi

# Проверка что нет незакоммиченных изменений
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Есть незакоммиченные изменения!${NC}"
    echo "Сначала закоммитьте все изменения:"
    echo "  git add ."
    echo "  git commit -m 'Prepare release $VERSION'"
    exit 1
fi

# Проверка что тег не существует
if git rev-parse "$TAG" >/dev/null 2>&1; then
    echo -e "${RED}❌ Тег $TAG уже существует!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Проверки пройдены${NC}"
echo ""

# Обновление версии в package.json
echo "📝 Обновление версии в package.json..."
if command -v jq &> /dev/null; then
    jq --arg version "$VERSION" '.version = $version' package.json > package.json.tmp
    mv package.json.tmp package.json
else
    echo -e "${YELLOW}⚠️  jq не установлен, пропуск обновления package.json${NC}"
    echo "Обновите версию вручную в package.json"
fi

# Обновление версии в Cargo.toml
echo "📝 Обновление версии в Cargo.toml..."
if [ -f "src-tauri/Cargo.toml" ]; then
    sed -i.bak "s/^version = \".*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml
    rm -f src-tauri/Cargo.toml.bak
fi

# Обновление версии в tauri.conf.json
echo "📝 Обновление версии в tauri.conf.json..."
if [ -f "src-tauri/tauri.conf.json" ]; then
    if command -v jq &> /dev/null; then
        jq --arg version "$VERSION" '.package.version = $version' src-tauri/tauri.conf.json > src-tauri/tauri.conf.json.tmp
        mv src-tauri/tauri.conf.json.tmp src-tauri/tauri.conf.json
    else
        echo -e "${YELLOW}⚠️  jq не установлен, пропуск обновления tauri.conf.json${NC}"
    fi
fi

echo ""
echo -e "${GREEN}✓ Версии обновлены${NC}"
echo ""

# Коммит изменений
echo "📦 Коммит изменений..."
git add -A
git commit -m "Release $VERSION" || echo -e "${YELLOW}⚠️  Нет изменений для коммита${NC}"

# Создание тега
echo "🏷️  Создание тега $TAG..."
git tag -a "$TAG" -m "Release $VERSION"

echo ""
echo -e "${GREEN}✓ Тег создан${NC}"
echo ""

# Push
echo "📤 Push в remote..."
echo ""
echo "Выполните команды:"
echo "  git push origin main"
echo "  git push origin $TAG"
echo ""
echo "После этого GitHub Actions автоматически:"
echo "  ✅ Соберёт приложение для Windows, macOS и Linux"
echo "  ✅ Создаст релиз на GitHub"
echo "  ✅ Загрузит все файлы в релиз"
echo ""
echo -e "${GREEN}🎉 Готово!${NC}"
