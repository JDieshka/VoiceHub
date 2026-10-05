# 📦 Система автоматической сборки Desktop приложения

## Обзор

Теперь на сервере есть система для автоматической сборки desktop приложения и страница загрузок!

**URL страницы загрузок:** `http://YOUR_SERVER_IP:8080/downloads`

---

## 🚀 Как использовать

### Шаг 1: Скопируйте новые файлы на сервер

```bash
# На локальной машине
scp build-desktop.sh root@YOUR_SERVER_IP:/opt/VoiceHub/
scp server/downloads/index.html root@YOUR_SERVER_IP:/opt/VoiceHub/server/downloads/
scp server/main.go root@YOUR_SERVER_IP:/opt/VoiceHub/server/
```

### Шаг 2: Установите Rust на сервере

```bash
# На сервере
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Проверьте установку
rustc --version
cargo --version
```

### Шаг 3: Запустите сборку desktop приложения

```bash
cd /opt/VoiceHub
chmod +x build-desktop.sh
sudo ./build-desktop.sh
```

**Что делает скрипт:**
- ✅ Проверяет Rust и Tauri CLI
- ✅ Собирает frontend
- ✅ Собирает desktop приложение (5-10 минут)
- ✅ Копирует файлы в `downloads/`
- ✅ Создает `version.json` с информацией о версии

### Шаг 4: Пересоберите и перезапустите сервер

```bash
cd /opt/VoiceHub/server
go build -o voicehub-server main.go
sudo systemctl restart voicehub
```

### Шаг 5: Откройте страницу загрузок

Откройте в браузере:
```
http://YOUR_SERVER_IP:8080/downloads
```

Вы увидите красивую страницу с кнопками для скачивания desktop приложения!

---

## 📁 Структура файлов

```
/opt/VoiceHub/
├── downloads/                    # Директория для загрузок
│   ├── index.html               # HTML страница загрузок
│   ├── version.json             # Информация о версии
│   ├── VoiceHub-Setup.msi       # Windows MSI установщик
│   ├── VoiceHub-Setup.exe       # Windows EXE установщик
│   ├── VoiceHub.AppImage        # Linux AppImage
│   └── VoiceHub.deb             # Linux DEB пакет
├── build-desktop.sh             # Скрипт сборки
└── server/
    ├── main.go                  # Обновленный сервер
    └── downloads/
        └── index.html           # HTML страница загрузок
```

---

## 🌐 API Endpoints

### Страница загрузок
```
GET /downloads
```
Возвращает HTML страницу с кнопками для скачивания.

### Список файлов
```
GET /downloads/api/files
```
Возвращает JSON со списком доступных файлов:
```json
{
  "files": [
    {
      "name": "VoiceHub-Setup.msi",
      "size": 12345678,
      "date": "2026-01-20T12:34:56Z"
    }
  ],
  "count": 1
}
```

### Информация о версии
```
GET /downloads/api/version
```
Возвращает JSON с информацией о версии:
```json
{
  "version": "2.0.0",
  "build_date": "2026-01-20T12:34:56Z",
  "files": [...]
}
```

### Скачивание файла
```
GET /downloads/VoiceHub-Setup.msi
```
Скачивает файл установщика.

---

## 🔄 Автоматическая пересборка

### Ручная пересборка

```bash
cd /opt/VoiceHub
sudo ./build-desktop.sh
```

### Автоматическая пересборка (cron)

Добавьте в cron для автоматической пересборки каждый день:

```bash
# Откройте crontab
sudo crontab -e

# Добавьте строку (сборка каждый день в 3:00)
0 3 * * * /opt/VoiceHub/build-desktop.sh >> /var/log/voicehub-build.log 2>&1
```

### Пересборка при push в Git

Создайте webhook в GitHub и скрипт для автоматической пересборки при push.

---

## 🎨 Страница загрузок

Страница автоматически:
- ✅ Определяет ОС пользователя
- ✅ Показывает подходящие файлы для скачивания
- ✅ Отображает размер файлов
- ✅ Показывает дату сборки
- ✅ Автообновляется каждые 30 секунд

**Поддерживаемые платформы:**
- 🪟 Windows (MSI, EXE)
- 🍎 macOS (DMG)
- 🐧 Linux (AppImage, DEB)

---

## 📊 Мониторинг

### Проверка статуса сборки

```bash
# Список файлов в downloads
ls -lh /opt/VoiceHub/downloads/

# Информация о версии
cat /opt/VoiceHub/downloads/version.json

# Логи сборки
tail -f /var/log/voicehub-build.log
```

### Проверка работы API

```bash
# Список файлов
curl http://localhost:8080/downloads/api/files

# Информация о версии
curl http://localhost:8080/downloads/api/version

# Страница загрузок
curl http://localhost:8080/downloads
```

---

## 🐛 Решение проблем

### Проблема: Rust не установлен

**Решение:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustc --version
```

### Проблема: Tauri CLI не установлен

**Решение:**
```bash
cargo install tauri-cli --version "^1.6"
```

### Проблема: Ошибка сборки

**Решение:**
```bash
# Проверьте логи
cd /opt/VoiceHub/src-tauri
cargo build --verbose

# Очистите кэш
cargo clean
cargo build
```

### Проблема: Файлы не появляются в downloads

**Решение:**
```bash
# Проверьте права доступа
chmod 755 /opt/VoiceHub/downloads
chmod 644 /opt/VoiceHub/downloads/*

# Проверьте что скрипт скопировал файлы
ls -lh /opt/VoiceHub/downloads/
```

### Проблема: Страница загрузок не открывается

**Решение:**
```bash
# Перезапустите сервер
sudo systemctl restart voicehub

# Проверьте логи
sudo journalctl -u voicehub -n 20

# Проверьте что downloads/index.html существует
ls -lh /opt/VoiceHub/server/downloads/index.html
```

---

## 📋 Обновление версии

Когда вы хотите выпустить новую версию:

### 1. Обновите версию в package.json

```bash
cd /opt/VoiceHub
nano package.json
# Измените "version": "2.0.0" на "version": "2.1.0"
```

### 2. Обновите версию в Cargo.toml

```bash
nano src-tauri/Cargo.toml
# Измените version = "2.0.0" на version = "2.1.0"
```

### 3. Обновите версию в tauri.conf.json

```bash
nano src-tauri/tauri.conf.json
# Измените "version": "2.0.0" на "version": "2.1.0"
```

### 4. Пересоберите

```bash
sudo ./build-desktop.sh
```

### 5. Проверьте страницу загрузок

Откройте `http://YOUR_SERVER_IP:8080/downloads` и убедитесь что версия обновилась.

---

## 🎯 Преимущества

✅ **Централизованная сборка** - один раз собрали, все скачивают  
✅ **Автоматическое обновление** - пересобрали, все получают новую версию  
✅ **Красивая страница** - профессиональный вид  
✅ **Мультиплатформенность** - Windows, macOS, Linux  
✅ **API для интеграции** - можно использовать в других приложениях  
✅ **Мониторинг** - легко проверить статус и логи  

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте логи: `sudo journalctl -u voicehub -n 50`
2. Проверьте файлы: `ls -lh /opt/VoiceHub/downloads/`
3. Проверьте API: `curl http://localhost:8080/downloads/api/files`
4. Пересоберите: `sudo ./build-desktop.sh`

---

**Готово!** Теперь у вас есть полноценная система распространения desktop приложения! 🚀
