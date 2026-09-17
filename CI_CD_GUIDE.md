# 🚀 Автоматическая сборка и публикация

## 📋 Что настроено

Настроены два GitHub Actions workflow:

### 1. **Release** (`.github/workflows/release.yml`)
- **Триггер**: Push тега `v*` (например, `v2.1.0`)
- **Действия**:
  - Создаёт GitHub Release
  - Собирает приложение для Windows, macOS, Linux
  - Загружает все файлы в релиз

### 2. **Build Test** (`.github/workflows/build-test.yml`)
- **Триггер**: Push в `main` или `develop`, Pull Request
- **Действия**:
  - Собирает приложение для всех платформ
  - Загружает как artifacts (для тестирования)
  - Не создаёт релиз

---

## 🎯 Как создать релиз

### Метод 1: Скрипт (рекомендуется)

```bash
# Сделайте скрипт исполняемым
chmod +x create-release.sh

# Создайте релиз
./create-release.sh 2.1.0

# Push изменений и тега
git push origin main
git push origin v2.1.0
```

### Метод 2: Вручную

```bash
# 1. Обновите версии в файлах
# package.json: "version": "2.1.0"
# src-tauri/Cargo.toml: version = "2.1.0"
# src-tauri/tauri.conf.json: "version": "2.1.0"

# 2. Закоммитьте изменения
git add .
git commit -m "Release v2.1.0"

# 3. Создайте тег
git tag -a v2.1.0 -m "Release 2.1.0"

# 4. Push
git push origin main
git push origin v2.1.0
```

### Метод 3: Через GitHub UI

1. Перейдите в репозиторий на GitHub
2. **Releases** → **Draft a new release**
3. **Choose a tag**: создайте новый тег `v2.1.0`
4. **Target**: `main`
5. **Release title**: `VoiceHub 2.1.0`
6. **Describe this release**: опишите изменения
7. **Publish release**

⚠️ **Важно**: Этот метод не обновит версии в файлах автоматически!

---

## 📦 Что будет в релизе

После завершения сборки (15-30 минут) в релизе будут:

### Windows
- `VoiceHub_2.1.0_x64_en-US.msi` — MSI установщик
- `VoiceHub_2.1.0_x64-setup.exe` — NSIS установщик

### macOS
- `VoiceHub_2.1.0_x64.dmg` — Intel Mac
- `VoiceHub_2.1.0_aarch64.dmg` — Apple Silicon (M1/M2)

### Linux
- `VoiceHub_2.1.0_amd64.AppImage` — AppImage (универсальный)
- `voicehub_2.1.0_amd64.deb` — Debian/Ubuntu пакет

---

## 🔧 Настройка GitHub

### 1. Создайте репозиторий

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/voicehub.git
git push -u origin main
```

### 2. Настройте secrets (опционально)

Если нужна подпись кода (code signing):

**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

- `WINDOWS_CREDENTIAL_FILE` — файл с credentials для подписи
- `MACOS_CERTIFICATE` — сертификат для macOS (base64)
- `MACOS_CERTIFICATE_PASSWORD` — пароль от сертификата

### 3. Включите GitHub Actions

**Settings** → **Actions** → **General**

- ✅ Allow all actions
- ✅ Allow actions created by GitHub

---

## 📊 Мониторинг сборок

### Просмотр статуса

1. Перейдите в репозиторий
2. Вкладка **Actions**
3. Выберите нужный workflow

### Логи сборки

В каждом job можно посмотреть:
- Логи установки зависимостей
- Логи компиляции
- Ошибки (если есть)

### Артефакты (для тестовых сборок)

После завершения `Build Test`:
1. Откройте workflow run
2. Прокрутите вниз до **Artifacts**
3. Скачайте нужную платформу

⚠️ Артефакты хранятся 90 дней

---

## 🛠️ Решение проблем

### Ошибка: "tauri-cli not found"

**Решение**: Увеличьте время установки в workflow:
```yaml
- name: Install Tauri CLI
  run: cargo install tauri-cli --version "^1.6"
  timeout-minutes: 30
```

### Ошибка: "WebView2 not found" (Windows)

**Решение**: Добавьте в workflow:
```yaml
- name: Install WebView2
  run: |
    Invoke-WebRequest -Uri "https://go.microsoft.com/fwlink/p/?LinkId=2124703" -OutFile "MicrosoftEdgeWebview2Setup.exe"
    Start-Process -FilePath "MicrosoftEdgeWebview2Setup.exe" -ArgumentList "/silent /install" -Wait
```

### Ошибка: "libwebkit2gtk not found" (Linux)

**Решение**: Проверьте что все зависимости установлены:
```yaml
- name: Install system dependencies
  run: |
    sudo apt-get update
    sudo apt-get install -y libwebkit2gtk-4.0-dev \
      build-essential \
      curl \
      wget \
      libssl-dev \
      libgtk-3-dev \
      libayatana-appindicator3-dev \
      librsvg2-dev
```

### Долгая сборка

**Решение**: Добавьте кэширование:
```yaml
- name: Cache Rust dependencies
  uses: actions/cache@v3
  with:
    path: |
      ~/.cargo/registry
      ~/.cargo/git
      src-tauri/target
    key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}
```

### Ошибка подписи кода (macOS)

**Решение**: Отключите подпись для тестовых сборок:
```yaml
- name: Build Tauri app
  env:
    ENABLE_CODE_SIGNING: false
  run: cargo tauri build
```

---

## 📝 Примеры использования

### Создание патч-релиза

```bash
./create-release.sh 2.1.1
git push origin main
git push origin v2.1.1
```

### Создание минорного релиза

```bash
./create-release.sh 2.2.0
git push origin main
git push origin v2.2.0
```

### Создание мажорного релиза

```bash
./create-release.sh 3.0.0
git push origin main
git push origin v3.0.0
```

### Отмена релиза

```bash
# Удалить тег локально
git tag -d v2.1.0

# Удалить тег на GitHub
git push origin :refs/tags/v2.1.0

# Удалить релиз через GitHub UI
```

---

## 🎨 Кастомизация

### Изменение имени приложения

В `src-tauri/tauri.conf.json`:
```json
{
  "package": {
    "productName": "MyApp"
  }
}
```

### Изменение иконки

Замените файлы в `src-tauri/icons/`:
- `icon.ico` (Windows)
- `icon.icns` (macOS)
- `icon.png` (Linux)

### Добавление дополнительных файлов в релиз

В workflow добавьте шаг:
```yaml
- name: Upload README
  uses: actions/github-script@v7
  with:
    script: |
      const fs = require('fs');
      await github.rest.repos.uploadReleaseAsset({
        owner: context.repo.owner,
        repo: context.repo.repo,
        release_id: '${{ needs.create-release.outputs.release_id }}',
        name: 'README.md',
        data: fs.readFileSync('README.md')
      });
```

---

## 📊 Статистика и аналитика

### Просмотр скачиваний

1. Перейдите в **Releases**
2. Выберите релиз
3. Внизу страницы — статистика скачиваний

### API для получения статистики

```bash
curl -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/YOUR_USERNAME/voicehub/releases
```

---

## 🔐 Безопасность

### Подпись кода (рекомендуется)

**Windows**:
1. Получите сертификат код-подписи
2. Добавьте в GitHub Secrets
3. Добавьте шаг подписи в workflow

**macOS**:
1. Получите Apple Developer Certificate
2. Экспортируйте в .p12
3. Конвертируйте в base64: `base64 -i certificate.p12`
4. Добавьте в GitHub Secrets

### Проверка целостности

Добавьте хеши файлов в описание релиза:
```yaml
- name: Generate checksums
  run: |
    sha256sum src-tauri/target/release/bundle/*/* > checksums.txt
    cat checksums.txt
```

---

## 🚀 Продвинутые настройки

### Автоматическое обновление

Добавьте в `tauri.conf.json`:
```json
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/YOUR_USERNAME/voicehub/releases/latest/download/latest.json"
      ],
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  }
}
```

### Beta релизы

```bash
git tag -a v2.1.0-beta.1 -m "Beta release"
git push origin v2.1.0-beta.1
```

В workflow добавьте:
```yaml
prerelease: ${{ contains(github.ref, 'beta') || contains(github.ref, 'alpha') }}
```

### Nightly builds

Добавьте в `.github/workflows/nightly.yml`:
```yaml
name: Nightly Build

on:
  schedule:
    - cron: '0 0 * * *'  # Каждый день в полночь

jobs:
  build:
    # ... аналогично build-test.yml
```

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи в **Actions**
2. Проверьте [документацию Tauri](https://tauri.app/)
3. Проверьте [документацию GitHub Actions](https://docs.github.com/en/actions)
4. Создайте issue в репозитории

---

## 🎉 Готово!

Теперь у вас есть полностью автоматизированный процесс:

1. ✅ Пишете код
2. ✅ Коммитите изменения
3. ✅ Запускаете `./create-release.sh 2.1.0`
4. ✅ Push в GitHub
5. ✅ GitHub автоматически собирает и публикует релиз
6. ✅ Пользователи скачивают готовое приложение

**Время от коммита до релиза**: ~20-30 минут

**Ручная работа**: Только запуск скрипта и push! 🚀
