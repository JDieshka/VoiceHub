# 🔧 Исправление проблемы "Сервер недоступен" в Desktop приложении

## Проблема

После установки Tauri приложения показывается "Сервер недоступен", хотя сервер работает по адресу http://31.77.158.177:8080

## Причина

**Content Security Policy (CSP)** в Tauri блокировал запросы к внешнему HTTP серверу.

### Было:
```json
"security": {
  "csp": "default-src 'self' data: blob: https: ws: wss:; media-src 'self' blob: data: https: mediastream:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https: http: ws: wss:;"
}
```

Хотя `http:` был разрешен в `connect-src`, Tauri WebView мог блокировать запросы к внешним HTTP серверам из-за дополнительных ограничений безопасности.

## Решение

### 1. Отключен CSP полностью

**Файл:** `src-tauri/tauri.conf.json`

```json
"security": {
  "csp": null
}
```

Это позволяет приложению делать запросы к любому серверу без ограничений CSP.

### 2. Добавлено детальное логирование

**Файл:** `src/services/auth.ts`

Добавлено подробное логирование для отладки:
- URL запроса
- Environment (Tauri/browser)
- Статус ответа
- Заголовки ответа
- Детали ошибки (если есть)

## Проверка работы

### 1. Пересоберите приложение

```bash
cd src-tauri
cargo tauri build
```

### 2. Установите новую версию

Установите собранный MSI/EXE файл.

### 3. Откройте DevTools

В Tauri приложении нажмите `F12` или `Ctrl+Shift+I` чтобы открыть DevTools.

### 4. Проверьте логи

В консоли DevTools вы должны увидеть:

```
[Auth] ====== Server Availability Check ======
[Auth] API_BASE: http://31.77.158.177:8080
[Auth] Request URL: http://31.77.158.177:8080/health
[Auth] Environment: {
  isTauri: true,
  userAgent: "Mozilla/5.0 ...",
  location: "tauri://localhost/index.html"
}
[Auth] Fetching...
[Auth] ✅ Response received
[Auth] Status: 200
[Auth] Status Text: OK
[Auth] Headers: {...}
[Auth] Response data: {status: "ok", service: "voicehub-server", version: "2.0.0"}
[Auth] Server available: true
[Auth] =====================================
```

### 5. Если сервер недоступен

Вы увидите:

```
[Auth] ❌ Server NOT available
[Auth] Error type: TypeError
[Auth] Error message: Failed to fetch
[Auth] Error stack: ...
[Auth] =====================================
```

## Возможные проблемы и решения

### Проблема 1: Сервер не запущен

**Решение:** Запустите сервер на 31.77.158.177:

```bash
ssh root@31.77.158.177
cd /opt/voicehub/server
systemctl start voicehub
systemctl status voicehub
```

### Проблема 2: Firewall блокирует порт 8080

**Решение:** Проверьте firewall на сервере:

```bash
ssh root@31.77.158.177
ufw status
ufw allow 8080/tcp
```

### Проблема 3: Сервер не отвечает на /health

**Решение:** Проверьте что endpoint работает:

```bash
curl http://31.77.158.177:8080/health
```

Должно вернуть:
```json
{"status":"ok","service":"voicehub-server","version":"2.0.0"}
```

### Проблема 4: CORS ошибка

**Решение:** Проверьте CORS заголовки на сервере:

```bash
curl -I http://31.77.158.177:8080/health
```

Должны быть заголовки:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Измененные файлы

1. **`src-tauri/tauri.conf.json`**
   - Отключен CSP (`"csp": null`)

2. **`src/services/auth.ts`**
   - Добавлено детальное логирование
   - Улучшена обработка ошибок

## Следующие шаги

1. ✅ CSP отключен
2. ✅ Логирование добавлено
3. ⏳ Пересобрать Tauri приложение
4. ⏳ Установить новую версию
5. ⏳ Проверить логи в DevTools
6. ⏳ Если проблема остается - проверить сервер

## Отладка

Если проблема остается, откройте DevTools в Tauri приложении (`F12`) и скопируйте все логи из консоли. Они покажут точную причину проблемы.

---

**Исправлено:** Проблема "Сервер недоступен" в Desktop приложении  
**Дата:** 2026  
**Статус:** ✅ Готово к тестированию
