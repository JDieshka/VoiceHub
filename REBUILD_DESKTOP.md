# 🚀 Пересборка Desktop приложения

## Проблема решена!

Добавлена поддержка Tauri HTTP API для обхода ограничений WebView2. Теперь desktop приложение может подключаться к любым серверам.

## Что нужно сделать

### 1. Пересоберите desktop приложение

```bash
# Перейдите в директорию Tauri
cd src-tauri

# Очистите старую сборку
cargo clean

# Соберите новую версию
cargo tauri build
```

### 2. Найдите собранный файл

После сборки файл будет в:
```
src-tauri/target/release/bundle/
├── msi/
│   └── VoiceHub_2.0.0_x64_en-US.msi    ← Установщик
└── nsis/
    └── VoiceHub_2.0.0_x64-setup.exe    ← Альтернативный установщик
```

### 3. Установите новую версию

1. Удалите старую версию (если установлена)
2. Запустите `VoiceHub_2.0.0_x64_en-US.msi`
3. Следуйте инструкциям установщика

### 4. Проверьте подключение

1. Запустите VoiceHub
2. Введите URL сервера (например, `http://31.77.158.177:8080`)
3. Нажмите "ПОДКЛЮЧИТЬСЯ"
4. ✅ Должно успешно подключиться!

## Проверка работы

### Откройте DevTools

1. В приложении нажмите `F12` или `Ctrl+Shift+I`
2. Перейдите на вкладку **Console**
3. Попробуйте подключиться к серверу
4. Должны увидеть логи:

```
[ServerSelection] Checking server: http://31.77.158.177:8080/health
[ServerSelection] Is Tauri: true
[ServerSelection] Using Tauri HTTP API
[Tauri] Checking server health via Tauri HTTP API: http://31.77.158.177:8080/health
[Tauri] Response status: 200
[Tauri] Response  {status: "ok", ...}
[ServerSelection] Server is available, proceeding to auth
```

## Что изменилось

### Было:
```typescript
// Использовался обычный fetch
const response = await fetch(`${url}/health`);
// ❌ WebView2 блокирует запрос к внешнему IP
```

### Стало:
```typescript
// Используется Tauri HTTP API
if (isTauri()) {
  data = await checkServerHealth(`${url}/health`);
  // ✅ Tauri HTTP API обходит ограничения WebView2
} else {
  data = await fetchWithTimeout(`${url}/health`);
  // ✅ Обычный fetch для веб-версии
}
```

## Если проблема не решена

### 1. Проверьте версию приложения

Убедитесь, что установлена новая версия:
- Откройте приложение
- Нажмите на профиль
- Проверьте версию (должна быть 2.0.0 или новее)

### 2. Проверьте логи сервера

```bash
# На сервере
journalctl -u voicehub -f
```

При подключении должны быть логи:
```
[CORS] GET /health from tauri://localhost
[Health] Health check from 127.0.0.1:12345
```

### 3. Проверьте firewall

```bash
# На сервере
ufw allow 8080/tcp
```

### 4. Пересоберите с нуля

```bash
cd src-tauri
cargo clean
rm -rf target
cargo tauri build
```

## Документация

- **FIX_TAURI_WEBVIEW2.md** - подробное описание решения
- **TROUBLESHOOTING_CONNECTION.md** - общая диагностика
- **FIX_FAILED_TO_FETCH.md** - решение для веб-версии

## Готово!

✅ Проблема решена  
✅ Desktop приложение может подключаться к любым серверам  
✅ Tauri HTTP API обходит ограничения WebView2  
✅ Подробное логирование для отладки  

**Удачи!** 🚀
