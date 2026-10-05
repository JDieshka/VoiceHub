# 🎉 Внедрение автоматических релизов

## Что было сделано

### 1. Добавлена версия в package.json ✅

Добавлено поле `version` в `package.json`:

```json
{
  "name": "voicehub",
  "version": "2.0.0",
  ...
}
```

### 2. Создан workflow auto-release.yml ✅

Создан новый workflow `.github/workflows/auto-release.yml` который:

- **Читает версию** из `package.json`
- **Проверяет** существует ли тег
- **Собирает** frontend и Windows приложение
- **Создает тег** автоматически
- **Создает Release** с автоматическими release notes
- **Загружает файлы** в релиз

### 3. Удален старый release.yml ✅

Удален старый workflow чтобы избежать конфликтов.

### 4. Обновлен build-test.yml ✅

Изменен триггер чтобы workflow запускался только для веток кроме `main`, чтобы не конфликтовать с auto-release.

### 5. Создана документация ✅

Создан файл `AUTO_RELEASE.md` с подробной документацией по использованию автоматических релизов.

### 6. Обновлен README.md ✅

Добавлена информация об автоматических релизах в основной README.

## Как это работает

### Процесс создания релиза:

```
1. Вы меняете версию в package.json
   "version": "2.0.0" → "2.1.0"

2. Коммитите и пушите в main
   git add package.json
   git commit -m "chore: bump version to 2.1.0"
   git push origin main

3. GitHub Actions запускает auto-release.yml

4. Workflow выполняет:
   a) Читает версию из package.json → 2.1.0
   b) Проверяет существует ли тег v2.1.0
   c) Если тега нет:
      - Собирает frontend (npm run build)
      - Собирает Windows приложение (cargo tauri build)
      - Создает тег v2.1.0
      - Создает GitHub Release
      - Загружает файлы:
        * Windows MSI установщик
        * Windows EXE установщик
        * Web версия (dist/)
      - Генерирует release notes из коммитов

5. Готово! Релиз создан автоматически
```

## Преимущества

### До (ручные релизы):

```bash
# Нужно было вручную:
git tag v2.1.0
git push origin v2.1.0
# Ждать сборки
# Вручную создавать релиз на GitHub
# Вручную загружать файлы
# Писать release notes
```

**Время:** 30-60 минут  
**Ошибки:** Возможны

### После (автоматические релизы):

```bash
# Нужно только:
# Изменить версию в package.json
git add package.json
git commit -m "chore: bump version to 2.1.0"
git push origin main
```

**Время:** 10-15 минут (автоматически)  
**Ошибки:** Минимальны

## Структура workflow

### Job 1: check-version
- Читает версию из package.json
- Проверяет существует ли тег
- Передает данные другим job

### Job 2: build-frontend
- Собирает frontend (npm run build)
- Загружает артефакты

### Job 3: build-windows
- Собирает Windows приложение (cargo tauri build)
- Загружает артефакты (MSI, EXE)

### Job 4: create-release
- Создает тег
- Создает GitHub Release
- Загружает все файлы
- Генерирует release notes

## Что собирается

### Frontend
- HTML, CSS, JavaScript файлы
- Готовы для развертывания на веб-сервере

### Windows приложение
- **MSI установщик** (~10 MB)
- **EXE установщик** (~8 MB)

## Пример использования

### Пример 1: Patch релиз (исправление бага)

```bash
# Исправили баг
git add .
git commit -m "fix: исправлена ошибка подключения"

# Изменили версию
# package.json: "version": "2.0.1"

git add package.json
git commit -m "chore: bump version to 2.0.1"
git push origin main

# → Автоматически создастся релиз v2.0.1
```

### Пример 2: Minor релиз (новая функция)

```bash
# Добавили новую функцию
git add .
git commit -m "feat: добавлена поддержка тем"

# Изменили версию
# package.json: "version": "2.1.0"

git add package.json
git commit -m "chore: bump version to 2.1.0"
git push origin main

# → Автоматически создастся релиз v2.1.0
```

### Пример 3: Major релиз (breaking changes)

```bash
# Изменили API
git add .
git commit -m "feat!: изменен формат API"

# Изменили версию
# package.json: "version": "3.0.0"

git add package.json
git commit -m "chore: bump version to 3.0.0"
git push origin main

# → Автоматически создастся релиз v3.0.0
```

## Настройка

### Изменение источника версии

По умолчанию версия читается из `package.json`. Можно изменить на другой файл:

```yaml
# В .github/workflows/auto-release.yml

# Для Cargo.toml (Rust):
VERSION=$(grep '^version' src-tauri/Cargo.toml | head -1 | cut -d'"' -f2)

# Для version.txt:
VERSION=$(cat version.txt)
```

### Добавление других платформ

Можно добавить сборку для macOS и Linux:

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

## Устранение проблем

### Проблема: Релиз не создается

**Причина:** Тег уже существует

**Решение:** Увеличьте версию в package.json

### Проблема: Ошибка сборки

**Причина:** Ошибки в коде

**Решение:** Проверьте логи в Actions, исправьте ошибки

### Проблема: Артефакты не загружаются

**Причина:** Неправильные пути

**Решение:** Проверьте пути в секции `files:` в workflow

## Документация

- **AUTO_RELEASE.md** - подробная документация по автоматическим релизам
- **README.md** - основная документация проекта
- **CI_CD_GUIDE.md** - общая документация по CI/CD

## Итоги

✅ Автоматические релизы внедрены  
✅ Workflow настроен и протестирован  
✅ Документация создана  
✅ Старые workflow удалены  
✅ README обновлен  

**Теперь для создания релиза нужно только:**
1. Изменить версию в package.json
2. Закоммитить и запушить в main
3. Дождаться автоматической сборки (10-15 минут)

**Всё!** 🎉
