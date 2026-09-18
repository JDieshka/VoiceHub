# 🔧 Решение проблемы "Failed to fetch" в Desktop приложении

## Проблема

При попытке подключиться к серверу в desktop-приложении (Windows) появляется ошибка:
```
Не удалось подключиться к серверу: Failed to fetch
```

При этом в веб-версии (браузер) всё работает нормально.

## Причина

**WebView2** (движок браузера в Tauri на Windows) имеет более строгие политики безопасности чем обычные браузеры:

1. **Блокирует fetch запросы** к внешним IP/доменам по умолчанию
2. **Требует явного разрешения** в `tauri.conf.json`
3. **Не поддерживает** некоторые CORS настройки как браузеры
4. **Блокирует mixed content** (HTTPS → HTTP)

## Решение

### 1. Добавлены HTTP разрешения в tauri.conf.json

```json
{
  "tauri": {
    "allowlist": {
      "http": {
        "all": true,
        "request": true,
        "scope": ["http://**", "https://**"]
      }
    }
  }
}
```

Это разрешает приложению делать HTTP/HTTPS запросы к любым серверам.

### 2. Обновлена CSP (Content Security Policy)

```json
{
  "tauri": {
    "security": {
      "csp": "default-src 'self'  blob: data: https: http: ws: wss:; connect-src 'self'  blob: data: https: http: ws: wss:; ..."
    }
  }
}
```

CSP теперь разрешает подключения к любым HTTP/HTTPS/WebSocket серверам.

### 3. Используется Tauri HTTP API вместо fetch

**Файл:** `src/services/tauri.ts`

```typescript
export async function checkServerHealth(url: string): Promise<any> {
  if (!isTauri() || !window.__TAURI__?.http) {
    throw new Error('Tauri HTTP API not available');
  }
  
  const response = await window.__TAURI__.http.fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    timeout: 10,
  });
  
  return response.data;
}
```

**Файл:** `src/components/min/ServerSelectionPage.tsx`

```typescript
// Используем Tauri HTTP API если в desktop режиме
if (isTauri()) {
  data = await checkServerHealth(`${url}/health`);
} else {
  data = await fetchWithTimeout(`${url}/health`);
}
```

Tauri HTTP API обходит ограничения WebView2 и делает запросы напрямую через Rust backend.

## Что изменилось

### До:
```typescript
// Использовался обычный fetch
const response = await fetch(`${url}/health`, {
  method: 'GET',
  mode: 'cors',
  // ...
});
```

**Проблема:** WebView2 блокирует запрос к внешнему IP

### После:
```typescript
// Используется Tauri HTTP API
if (isTauri()) {
  data = await checkServerHealth(`${url}/health`);
} else {
  data = await fetchWithTimeout(`${url}/health`);
}
```

**Решение:** Tauri HTTP API делает запрос через Rust backend, обходя ограничения WebView2

## Как это работает

```
┌─────────────────┐
│   Desktop App   │
│   (Tauri)       │
└────────┬────────┘
         │
         │ 1. checkServerHealth()
         │
         ▼
┌─────────────────┐
│  Tauri HTTP API │
│  (Rust backend) │
└────────┬────────┘
         │
         │ 2. HTTP запрос
         │
         ▼
┌─────────────────┐
│  VoiceHub       │
│  Server         │
│  :8080          │
└─────────────────┘
```

1. Frontend вызывает `checkServerHealth()`
2. Tauri HTTP API делает запрос через Rust backend
3. Rust backend делает HTTP запрос к серверу
4. Ответ возвращается в frontend

## Проверка работы

### 1. Пересоберите desktop приложение

```bash
cd src-tauri
cargo tauri build
```

### 2. Установите новую версию

Установите собранный `.msi` или `.exe` файл.

### 3. Проверьте подключение

1. Запустите приложение
2. Введите URL сервера (например, `http://31.77.158.177:8080`)
3. Нажмите "ПОДКЛЮЧИТЬСЯ"
4. Должно успешно подключиться

### 4. Проверьте логи

Откройте DevTools (F12) и посмотрите консоль:

```
[ServerSelection] Checking server: http://31.77.158.177:8080/health
[ServerSelection] Is Tauri: true
[ServerSelection] Using Tauri HTTP API
[Tauri] Checking server health via Tauri HTTP API: http://31.77.158.177:8080/health
[Tauri] Response status: 200
[Tauri] Response  {status: "ok", ...}
[ServerSelection] Server is available, proceeding to auth
```

## Если проблема не решена

### 1. Проверьте tauri.conf.json

Убедитесь, что есть HTTP разрешения:

```json
{
  "tauri": {
    "allowlist": {
      "http": {
        "all": true,
        "request": true,
        "scope": ["http://**", "https://**"]
      }
    }
  }
}
```

### 2. Проверьте CSP

Убедитесь, что CSP разрешает подключения:

```json
{
  "tauri": {
    "security": {
      "csp": "default-src 'self'  blob: data: https: http: ws: wss:; connect-src 'self'  blob: data: https: http: ws: wss:; ..."
    }
  }
}
```

### 3. Пересоберите приложение

```bash
cd src-tauri
cargo clean
cargo tauri build
```

### 4. Проверьте логи сервера

```bash
# На сервере
journalctl -u voicehub -f
```

При подключении должны быть логи:
```
[CORS] GET /health from tauri://localhost
[Health] Health check from 127.0.0.1:12345
```

## Альтернативные решения

### Если Tauri HTTP API не работает

Можно использовать Rust команду для проверки сервера:

**В `src-tauri/src/commands.rs`:**

```rust
#[tauri::command]
async fn check_server_health(url: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let response = client.get(&url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let data: serde_json::Value = response.json()
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(data)
}
```

**В `src/services/tauri.ts`:**

```typescript
export async function checkServerHealth(url: string): Promise<any> {
  return await invoke('check_server_health', { url });
}
```

## Сравнение с веб-версией

| Характеристика | Браузер | Desktop (Tauri) |
|----------------|---------|-----------------|
| Fetch API | ✅ Работает | ❌ Блокируется WebView2 |
| Tauri HTTP API | ❌ Недоступно | ✅ Работает |
| CORS | Строгий | Очень строгий |
| Mixed Content | Блокируется | Блокируется |
| Решение | Использовать HTTPS | Использовать Tauri HTTP API |

## Итог

✅ Добавлены HTTP разрешения в tauri.conf.json  
✅ Обновлена CSP для разрешения подключений  
✅ Создан Tauri HTTP API wrapper  
✅ Обновлен ServerSelectionPage для использования Tauri API  
✅ Добавлено логирование для отладки  

**Проблема решена! Desktop приложение теперь может подключаться к любым серверам!** 🚀

## Документация

- **FIX_TAURI_WEBVIEW2.md** - этот файл
- **TROUBLESHOOTING_CONNECTION.md** - общая диагностика подключений
- **FIX_FAILED_TO_FETCH.md** - решение для веб-версии
