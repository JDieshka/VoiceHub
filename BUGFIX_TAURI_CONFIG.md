# 🐛 Исправление ошибки конфигурации Tauri

## Проблема

При сборке Tauri приложения в GitHub Actions возникла ошибка:

```
Error `tauri.conf.json` error on `tauri`: Additional properties are not allowed ('permission' was unexpected)
Error: Process completed with exit code 1.
```

## Причина

В файле `src-tauri/tauri.conf.json` присутствовало недопустимое поле `permission`:

```json
"permission": {
  "microphone": true,
  "camera": false
}
```

**Это поле не поддерживается в Tauri 1.x!**

В Tauri 1.x разрешения настраиваются через:
1. **`allowlist`** - для API Tauri
2. **CSP (Content Security Policy)** - для веб-API (уже настроен)
3. **Нативные Rust команды** - для доступа к системным ресурсам

## Решение

Удалено недопустимое поле `permission` из `src-tauri/tauri.conf.json`.

### Было:
```json
{
  "tauri": {
    "allowlist": { ... },
    "permission": {
      "microphone": true,
      "camera": false
    },
    "bundle": { ... }
  }
}
```

### Стало:
```json
{
  "tauri": {
    "allowlist": { ... },
    "bundle": { ... }
  }
}
```

## Как работает доступ к микрофону

### 1. CSP (Content Security Policy)

Уже настроен в `tauri.conf.json`:

```json
"security": {
  "csp": "default-src 'self' data: blob: https: ws: wss:; media-src 'self' blob: data: https: mediastream:; ..."
}
```

Поле `media-src` разрешает использование медиа-устройств.

### 2. Нативные Rust команды

Добавлены команды для работы с микрофоном:

```rust
#[tauri::command]
pub fn check_microphone_availability() -> Result<bool, String> {
    let host = cpal::default_host();
    match host.input_devices() {
        Ok(devices) => Ok(devices.count() > 0),
        Err(e) => Err(format!("Не удалось получить список устройств: {}", e))
    }
}

#[tauri::command]
pub fn get_microphone_info() -> Result<serde_json::Value, String> {
    // Получает информацию о доступных микрофонах
}
```

### 3. TypeScript wrapper

Добавлены методы в `src/services/tauri.ts`:

```typescript
checkMicrophoneAvailability: async (): Promise<boolean> => {
  if (!isTauri()) {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
  return invoke<boolean>('check_microphone_availability');
},

getMicrophoneInfo: async () => {
  if (!isTauri()) {
    // Browser API
  }
  return invoke('get_microphone_info');
},
```

## Проверка

Frontend успешно собирается:

```
✓ 49 modules transformed.
dist/index.html                   0.62 kB
dist/assets/index-CCYKjs-V.css   10.96 kB
dist/assets/index-BgcsUWJy.js   250.70 kB
✓ built in 2.31s
```

## Следующие шаги

1. ✅ Конфигурация Tauri исправлена
2. ⏳ Закоммитить изменения
3. ⏳ Запушить в main
4. ⏳ Дождаться сборки в GitHub Actions
5. ⏳ Проверить что Tauri приложение собирается

## Измененные файлы

- `src-tauri/tauri.conf.json` - удалено недопустимое поле `permission`

---

**Исправлено:** Ошибка конфигурации Tauri  
**Дата:** 2026  
**Статус:** ✅ Готово к коммиту
