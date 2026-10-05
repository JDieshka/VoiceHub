# ⚡ Быстрое решение проблемы подключения

## 🎯 Что было исправлено

Найдены и исправлены **2 критические ошибки** в `src/services/tauri.ts`:

### Ошибка 1: Неправильный вызов Rust команды
```typescript
// ❌ БЫЛО (неправильно):
await invoke('check_server_health', { url });

// ✅ СТАЛО (правильно):
await invoke('check_server_health', url);
```

### Ошибка 2: Неправильная проверка ответа
```typescript
// ❌ БЫЛО (неправильно):
if (response.status !== 'ok') { ... }

// ✅ СТАЛО (правильно):
if (response && response.status === 'ok') { ... }
```

---

## 🚀 Что делать сейчас

### Шаг 1: Пересоберите desktop приложение

```bash
cd src-tauri
cargo tauri build
```

⏱️ Сборка займет 5-10 минут.

### Шаг 2: Установите новую версию

Найдите файл:
```
src-tauri/target/release/bundle/msi/VoiceHub_2.0.0_x64_en-US.msi
```

Установите его, заменив старую версию.

### Шаг 3: Проверьте подключение

1. Запустите VoiceHub
2. Введите IP сервера: `212.80.7.83`
3. Нажмите "ПОДКЛЮЧИТЬСЯ"
4. Откройте DevTools (F12) и проверьте логи

**Ожидаемые логи**:
```
[ServerSelection] Using Rust backend (check_server_health)
[Tauri] Checking server health via Rust backend: http://212.80.7.83:8080/health
[Tauri] Rust backend response: {status: "ok", ...}
[ServerSelection] ✅ Server is available, proceeding to auth
```

---

## 🔍 Если не работает

### Проверка 1: Сервер доступен?

```powershell
# На Windows PowerShell
curl http://212.80.7.83:8080/health
```

Должно вернуть:
```json
{"status":"ok","service":"voicehub-server","version":"2.0.0","time":"..."}
```

### Проверка 2: Rust команды зарегистрированы?

Проверьте `src-tauri/src/main.rs`:
```rust
.invoke_handler(tauri::generate_handler![
    // ...
    commands::check_server_health,  // ✅ Должна быть
    commands::http_request,         // ✅ Должна быть
])
```

### Проверка 3: Frontend использует Rust backend?

Откройте DevTools (F12) → Console. Должны быть логи:
```
[ServerSelection] Using Rust backend (check_server_health)
```

Если видите:
```
[ServerSelection] Using fetch API (browser mode)
```

Значит `isTauri()` возвращает `false` - проблема с Tauri API.

---

## 📋 Диагностика по шагам

### 1. Проверьте логи в DevTools

Откройте F12 → Console → попробуйте подключиться → скопируйте все логи.

### 2. Проверьте Rust backend логи

Если запускали через `cargo tauri dev`, в терминале должны быть:
```
[Rust] Checking server health: http://212.80.7.83:8080/health
[Rust] Response status: 200 OK
```

### 3. Проверьте сетевые настройки

```powershell
# Проверьте firewall
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*VoiceHub*" }

# Проверьте прокси
netsh winhttp show proxy
```

---

## 🎯 Почему это работает

### Архитектура запросов

```
┌─────────────────┐
│   Desktop App   │
│   (Tauri)       │
└────────┬────────┘
         │
         │ 1. invoke('check_server_health', url)
         │
         ▼
┌─────────────────┐
│  Rust Backend   │
│  (reqwest)      │
└────────┬────────┘
         │
         │ 2. HTTP GET http://212.80.7.83:8080/health
         │    (через системный HTTP клиент Windows)
         │
         ▼
┌─────────────────┐
│  VoiceHub       │
│  Server (Go)    │
└─────────────────┘
```

### Преимущества

✅ **Обходит CORS** - запросы идут из Rust, а не из WebView2  
✅ **Обходит WebView2 ограничения** - используется системный HTTP клиент  
✅ **Работает с любыми серверами** - HTTP, HTTPS, любые порты  
✅ **Минимальные задержки** - прямое соединение из Rust  

---

## 📞 Если ничего не помогло

Пришлите полную диагностику:

1. **Логи из DevTools** (F12 → Console)
2. **Результат curl**:
   ```powershell
   curl -v http://212.80.7.83:8080/health
   ```
3. **Версия Tauri**:
   ```bash
   cd src-tauri
   cargo tree | grep tauri
   ```
4. **Версия Rust**:
   ```bash
   rustc --version
   ```

---

## ✅ Итог

**Проблема**: Неправильный вызов Rust команд из frontend  
**Решение**: Исправлены вызовы в `src/services/tauri.ts`  
**Статус**: ✅ Исправлено, требуется пересборка desktop приложения  

**Следующий шаг**: Пересоберите desktop приложение и проверьте подключение!

---

**Подробная документация**: [DIAGNOSTICS_GUIDE.md](./DIAGNOSTICS_GUIDE.md)
