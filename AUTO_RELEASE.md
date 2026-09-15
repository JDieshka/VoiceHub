# 🚀 Автоматические релизы VoiceHub

## Как это работает

Система автоматических релизов создает новый релиз каждый раз, когда вы меняете версию в `package.json` и пушите изменения в ветку `main`.

### Процесс:

```
1. Вы меняете версию в package.json (например, с 2.0.0 на 2.1.0)
2. Коммитите и пушите в main
3. GitHub Actions автоматически:
   - Читает версию из package.json
   - Проверяет, существует ли тег v2.1.0
   - Если тега нет:
     * Собирает frontend
     * Собирает Windows приложение
     * Создает тег v2.1.0
     * Создает GitHub Release
     * Загружает все файлы в релиз
4. Готово! Пользователи могут скачать новую версию
```

## Как создать новый релиз

### Шаг 1: Измените версию в package.json

Откройте `package.json` и измените поле `version`:

```json
{
  "name": "voicehub",
  "version": "2.1.0",  // ← Измените версию
  ...
}
```

### Шаг 2: Сделайте коммит и пуш

```bash
git add package.json
git commit -m "chore: bump version to 2.1.0"
git push origin main
```

### Шаг 3: Дождитесь завершения сборки

1. Перейдите в **Actions** на GitHub
2. Найдите workflow **Auto Tag & Release**
3. Дождитесь завершения всех job (обычно 10-15 минут)

### Шаг 4: Проверьте релиз

1. Перейдите в **Releases** на GitHub
2. Найдите новый релиз `v2.1.0`
3. Проверьте, что все файлы загружены:
   - Windows MSI установщик
   - Windows EXE установщик
   - Web версия

## Версионирование

Рекомендуем использовать [Semantic Versioning](https://semver.org/):

### MAJOR (2.0.0 → 3.0.0)
Изменения, которые ломают обратную совместимость:
- Удаление старых API
- Изменение формата данных
- Удаление функциональности

### MINOR (2.0.0 → 2.1.0)
Новая функциональность с обратной совместимостью:
- Новые функции
- Новые команды
- Улучшения UI

### PATCH (2.0.0 → 2.0.1)
Исправления ошибок:
- Багфиксы
- Улучшения производительности
- Безопасность

## Примеры

### Пример 1: Исправление бага

```bash
# Исправили баг
git add .
git commit -m "fix: исправлена ошибка подключения к серверу"

# Увеличили patch версию
# package.json: "version": "2.0.1"

git add package.json
git commit -m "chore: bump version to 2.0.1"
git push origin main

# → Автоматически создастся релиз v2.0.1
```

### Пример 2: Новая функция

```bash
# Добавили новую функцию
git add .
git commit -m "feat: добавлена поддержка темной темы"

# Увеличили minor версию
# package.json: "version": "2.1.0"

git add package.json
git commit -m "chore: bump version to 2.1.0"
git push origin main

# → Автоматически создастся релиз v2.1.0
```

### Пример 3: Breaking changes

```bash
# Изменили API
git add .
git commit -m "feat!: изменен формат API авторизации"

# Увеличили major версию
# package.json: "version": "3.0.0"

git add package.json
git commit -m "chore: bump version to 3.0.0"
git push origin main

# → Автоматически создастся релиз v3.0.0
```

## Что собирается

### Frontend
- HTML, CSS, JavaScript файлы
- Готовы для развертывания на любом веб-сервере

### Windows приложение
- **MSI установщик** - рекомендуется для большинства пользователей
- **EXE установщик** - альтернативный вариант

## Настройка

### Изменение источника версии

По умолчанию версия читается из `package.json`. Если хотите использовать другой файл, измените в `.github/workflows/auto-release.yml`:

```yaml
- name: Read version
  id: ver
  run: |
    # Для Cargo.toml (Rust):
    VERSION=$(grep '^version' src-tauri/Cargo.toml | head -1 | cut -d'"' -f2)
    
    # Для version.txt:
    # VERSION=$(cat version.txt)
    
    echo "version=$VERSION" >> $GITHUB_OUTPUT
    echo "tag=v$VERSION" >> $GITHUB_OUTPUT
```

### Добавление других платформ

Чтобы добавить сборку для macOS или Linux, добавьте новые job в `auto-release.yml`:

```yaml
build-macos:
  name: Build macOS App
  needs: check-version
  if: needs.check-version.outputs.exists == 'false'
  runs-on: macos-latest
  steps:
    # ... аналогично Windows

build-linux:
  name: Build Linux App
  needs: check-version
  if: needs.check-version.outputs.exists == 'false'
  runs-on: ubuntu-latest
  steps:
    # ... аналогично Windows
```

Не забудьте добавить загрузку артефактов в job `create-release`:

```yaml
- name: Download macOS artifacts
  uses: actions/download-artifact@v4
  with:
    name: macos-app
    path: macos/

- name: Download Linux artifacts
  uses: actions/download-artifact@v4
  with:
    name: linux-app
    path: linux/
```

И добавьте файлы в релиз:

```yaml
files: |
  windows/*.msi
  windows/*.exe
  macos/*.dmg
  linux/*.AppImage
  linux/*.deb
  dist/**
```

## Ручной запуск

Если нужно запустить релиз вручную (например, для тестирования):

1. Перейдите в **Actions** → **Auto Tag & Release**
2. Нажмите **Run workflow**
3. Выберите ветку (обычно `main`)
4. Нажмите **Run workflow**

## Устранение проблем

### Проблема: Релиз не создается

**Причина:** Тег уже существует

**Решение:**
```bash
# Проверьте существующие теги
git tag -l

# Если нужно пересоздать релиз, увеличьте версию
# package.json: "version": "2.0.1" (вместо 2.0.0)
```

### Проблема: Ошибка сборки

**Причина:** Ошибки в коде

**Решение:**
1. Проверьте логи в **Actions**
2. Исправьте ошибки
3. Закоммитьте и запушите снова

### Проблема: Артефакты не загружаются

**Причина:** Неправильные пути в workflow

**Решение:**
Проверьте пути в секции `files:` в `auto-release.yml`

## Автоматическое обновление версии

Можно использовать скрипт для автоматического обновления версии:

```bash
#!/bin/bash
# bump-version.sh

CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Парсинг версии
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Увеличение patch версии
NEW_PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"

echo "New version: $NEW_VERSION"

# Обновление package.json
node -e "
const fs = require('fs');
const pkg = require('./package.json');
pkg.version = '$NEW_VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

echo "✅ Version updated to $NEW_VERSION"
```

Использование:

```bash
chmod +x bump-version.sh
./bump-version.sh
git add package.json
git commit -m "chore: bump version"
git push origin main
```

## Преимущества автоматических релизов

✅ **Не нужно вручную создавать теги** - версия в package.json = тег  
✅ **Автоматическая сборка** - все платформы собираются автоматически  
✅ **Автоматические release notes** - генерируются из коммитов  
✅ **История версий** - все релизы сохраняются на GitHub  
✅ **Воспроизводимость** - каждый релиз можно пересобрать  
✅ **Быстрота** - релиз создается за 10-15 минут  

## Сравнение с ручными релизами

| Аспект | Ручной релиз | Автоматический релиз |
|--------|--------------|----------------------|
| Создание тега | Вручную `git tag` | Автоматически |
| Сборка | Вручную или CI | Автоматически |
| Загрузка файлов | Вручную | Автоматически |
| Release notes | Вручную | Автоматически |
| Время | 30-60 минут | 10-15 минут |
| Ошибки | Возможны | Минимальны |

## Заключение

Автоматические релизы значительно упрощают процесс выпуска новых версий. Просто меняйте версию в `package.json`, коммитьте и пушьте - GitHub Actions сделает все остальное!

**Документация:**
- [CI_CD_GUIDE.md](./CI_CD_GUIDE.md) - общая документация по CI/CD
- [README.md](./README.md) - основная документация проекта
