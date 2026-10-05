# 🐛 Исправление проблемы с отсутствием файлов в релизе

## Проблема

После создания релиза в GitHub Releases не было файлов:
- ❌ Отсутствовали MSI и EXE установщики
- ❌ Отсутствовала web-версия
- ❌ Релиз создавался, но был пустым

## Причина

Проблема была в структуре workflow `auto-release.yml`:

1. **Раздельная сборка на разных runner'ах**
   - Frontend собирался на Ubuntu
   - Windows приложение собиралось на Windows
   - Артефакты загружались через `upload-artifact`/`download-artifact`

2. **Сложная структура путей**
   - Файлы из разных job загружались в разные директории
   - Пути в секции `files:` не совпадали с реальной структурой
   - Frontend файлы из `dist/` не попадали в релиз

3. **Проблемы с Windows командами**
   - Команды `copy` и `xcopy` могли не работать правильно
   - Пути с обратными слэшами могли вызывать проблемы

## Решение

### 1. Упрощена структура workflow

**Было:**
```yaml
jobs:
  check-version:      # Проверка версии
  build-frontend:     # Сборка frontend (Ubuntu)
  build-windows:      # Сборка Windows (Windows)
  create-release:     # Создание релиза (Ubuntu)
```

**Стало:**
```yaml
jobs:
  check-version:      # Проверка версии
  build-all:          # Сборка всего на Windows
  create-release:     # Создание релиза
```

### 2. Всё собирается на одном runner'е

Теперь всё собирается на Windows runner:
- ✅ Frontend (`npm run build`)
- ✅ Windows приложение (`cargo tauri build`)
- ✅ Подготовка файлов в одну директорию

### 3. Упрощена подготовка файлов

Создается единая директория `release/`:
```
release/
├── VoiceHub_0.0.1_x64_en-US.msi
├── VoiceHub_0.0.1_x64-setup.exe
└── web/
    ├── index.html
    └── assets/
        ├── index-*.css
        └── index-*.js
```

### 4. Упрощены пути в секции files

**Было:**
```yaml
files: |
  windows/*.msi
  windows/*.exe
  dist/**
```

**Стало:**
```yaml
files: |
  release/*.msi
  release/*.exe
  release/web/**
```

### 5. Добавлена отладка

Добавлен шаг для просмотра файлов:
```yaml
- name: List release files
  run: |
    echo "📦 Release files:"
    find release -type f
    echo ""
    echo "📊 File count:"
    find release -type f | wc -l
```

## Измененные файлы

1. **`package.json`**
   - Изменена версия с `2.0.0` на `0.0.1` для тестирования

2. **`.github/workflows/auto-release.yml`**
   - Упрощена структура workflow
   - Всё собирается на одном runner'е (Windows)
   - Упрощены пути к файлам
   - Добавлена отладка

## Как проверить

### 1. Закоммитьте изменения

```bash
git add .
git commit -m "fix: simplify release workflow and fix file paths"
git push origin main
```

### 2. Дождитесь сборки

1. Перейдите в **Actions** на GitHub
2. Найдите workflow **Auto Tag & Release**
3. Дождитесь завершения всех job

### 3. Проверьте логи

В job `create-release` должен быть шаг **List release files** с выводом:
```
📦 Release files:
release/VoiceHub_0.0.1_x64_en-US.msi
release/VoiceHub_0.0.1_x64-setup.exe
release/web/index.html
release/web/assets/index-*.css
release/web/assets/index-*.js

📊 File count:
5
```

### 4. Проверьте релиз

1. Перейдите в **Releases** на GitHub
2. Найдите релиз `v0.0.1`
3. Проверьте что есть файлы:
   - ✅ MSI установщик
   - ✅ EXE установщик
   - ✅ Web-версия (папка `web`)

## Ожидаемые файлы в релизе

### Windows установщики
- `VoiceHub_0.0.1_x64_en-US.msi` (~10 MB)
- `VoiceHub_0.0.1_x64-setup.exe` (~8 MB)

### Web-версия
- `web/index.html`
- `web/assets/index-*.css`
- `web/assets/index-*.js`

## Если проблема не решена

### Проверьте логи сборки

В job `build-all` проверьте шаг **Prepare release files**:
```bash
# Должно показать:
mkdir release
copy src-tauri\target\release\bundle\msi\*.msi release\
copy src-tauri\target\release\bundle\nsis\*.exe release\
mkdir release\web
xcopy /E /I /Y dist release\web
dir release
```

### Проверьте загрузку артефактов

В job `create-release` проверьте шаг **Download release files**:
- Артефакт `release-files` должен успешно загрузиться
- Директория `release/` должна содержать файлы

### Проверьте пути в files

Убедитесь что пути совпадают:
```yaml
files: |
  release/*.msi      # MSI файлы в корне release
  release/*.exe      # EXE файлы в корне release
  release/web/**     # Все файлы в папке web
```

## Преимущества нового подхода

✅ **Проще** - всё собирается на одном runner'е  
✅ **Надежнее** - меньше перемещений файлов  
✅ **Быстрее** - нет необходимости в download-artifact для frontend  
✅ **Понятнее** - простая структура директорий  
✅ **Легче отлаживать** - все файлы в одном месте  

## Версионирование

Версия изменена на `0.0.1` для тестирования системы автоматических релизов.

После успешного теста можно увеличить до `2.0.0` или другой версии.

## Следующие шаги

1. ✅ Закоммитить изменения
2. ✅ Запушить в main
4. ✅ Дождаться автоматической сборки
6. ✅ Проверить что файлы есть в релизе
8. ✅ Если всё работает - увеличить версию до 2.0.0

---

**Исправлено:** Проблема с отсутствием файлов в релизе  
**Дата:** 2026  
**Статус:** ✅ Готово к тестированию
