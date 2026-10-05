# 🔧 Полное руководство по диагностике подключения Tauri к серверу

## 🎯 Найденные и исправленные проблемы

### Проблема 1: Неправильный вызов Rust команды ✅ ИСПРАВЛЕНО

**Было** (`src/services/tauri.ts:36`):
```typescript
const response = await (window as any).__TAURI__.invoke('check_server_health', { url });
```

**Стало**:
```typescript
const response = await (window as any).__TAURI__.invoke('check_server_health', url);
```

**Объяснение**: В Tauri v1, когда Rust функция принимает `url: String`, нужно передавать строку напрямую, а не как объект `{ url }`.

### Проблема 2: Неправильная проверка ответа ✅ ИСПРАВЛЕНО

**Было** (`src/services/tauri.ts:40`):
```typescript
if (response.status !== 'ok') {
    throw new Error('Сервер не ответил корректно');
}
```

**Стало**:
```typescript
if (response && response.status === 'ok') {
    return response;
} else {
    throw new Error('Сервер не ответил корректно');
}
```

**Объяснение**: Rust команда возвращает JSON ответ сервера напрямую (например, `{"status":"ok","service":"voicehub-server",...}`), а не объект с полем `status`.

---

## 📋 Пошаговый чек-лист диагностики

### Шаг 1: Проверка сервера с Windows ПК

Откройте PowerShell на Windows и выполните:

```powershell
# 1.1 Проверка доступности сервера
curl -v http://212.80.7.83:8080/health

# Ожидаемый ответ:
# HTTP/1.1 200 OK
# {"status":"ok","service":"voicehub-server","version":"2.0.0","time":"..."}

# 1.2 Проверка CORS preflight
curl -X OPTIONS -v http://212.80.7.83:8080/health \
  -H "Origin: tauri://localhost" \
  -H "Access-Control-Request-Method: GET"

# Ожидаемые заголовки:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
# Access-Control-Allow-Headers: Content-Type, Authorization, Accept

# 1.3 Проверка POST запроса (авторизация)
curl -X POST -v http://212.80.7.83:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Шаг 2: Проверка в desktop приложении

1. Запустите VoiceHub desktop приложение
2. Нажмите **F12** для открытия DevTools
3. Перейдите на вкладку **Console**
4. Введите IP сервера: `212.80.7.83`
5. Нажмите "ПОДКЛЮЧИТЬСЯ"
6. Скопируйте **все логи** из консоли

**Ожидаемые логи** (если всё работает):
```
[ServerSelection] ========== НАЧАЛО ПОДКЛЮЧЕНИЯ ==========
[ServerSelection] Input: 212.80.7.83
[ServerSelection] Normalized URL: http://212.80.7.83:8080
[ServerSelection] Health URL: http://212.80.7.83:8080/health
[ServerSelection] Is Tauri: true
[ServerSelection] Tauri available: true
[ServerSelection] Using Rust backend (check_server_health)
[Tauri] Checking server health via Rust backend: http://212.80.7.83:8080/health
[Tauri] Rust backend response: {status: "ok", service: "voicehub-server", ...}
[ServerSelection] Rust backend success: {status: "ok", ...}
[ServerSelection] ✅ Server is available, proceeding to auth
[ServerSelection] ========== КОНЕЦ ПОДКЛЮЧЕНИЯ ==========
```

**Если видите ошибки**:
```
[ServerSelection] Rust backend error: ...
[ServerSelection] Falling back to fetch API
[ServerSelection] Fetch fallback error: Failed to fetch
```

Это означает что Rust backend не работает, и fallback на fetch тоже не работает (CORS).

### Шаг 3: Проверка Rust backend логов

Если вы запустили приложение через `cargo tauri dev`, в терминале должны быть логи:

```
[Rust] Checking server health: http://212.80.7.83:8080/health
[Rust] Response status: 200 OK
[Rust] Response : Object {"status": String("ok"), "service": String("voicehub-server"), ...}
```

**Если видите ошибки**:
```
[Rust] HTTP request failed: error sending request for url
```

Это означает сетевую проблему на уровне Rust/Windows.

### Шаг 4: Проверка Windows Firewall

```powershell
# Проверьте что VoiceHub.exe не заблокирован
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*VoiceHub*" }

# Если правило не найдено, создайте его
New-NetFirewallRule -DisplayName "VoiceHub Desktop" -Direction Outbound -Program "C:\path\to\VoiceHub.exe" -Action Allow
```

### Шаг 5: Проверка прокси/VPN

```powershell
# Проверьте настройки прокси
netsh winhttp show proxy

# Если прокси установлен, попробуйте отключить его
netsh winhttp reset proxy
```

---

## 🔍 Диагностика по симптомам

### Симптом 1: "Не удалось подключиться к серверу"

**Возможные причины**:
1. ❌ Rust backend не работает
2. ❌ Windows Firewall блокирует
3. ❌ Прокси/VPN блокирует
4. ❌ Антивирус блокирует

**Диагностика**:
```powershell
# Проверьте что curl работает
curl http://212.80.7.83:8080/health

# Если curl работает, но приложение нет - проблема в Tauri/Windows
```

**Решение**:
1. Отключите антивирус временно
2. Добавьте VoiceHub.exe в исключения Windows Firewall
3. Отключите прокси/VPN

### Симптом 2: "Ошибка CORS"

**Возможные причины**:
1. ❌ Сервер не отправляет CORS заголовки
2. ❌ Frontend использует fetch вместо Rust backend
3. ❌ CSP блокирует подключения

**Диагностика**:
```powershell
# Проверьте CORS заголовки
curl -I http://212.80.7.83:8080/health | findstr "Access-Control"
```

**Решение**:
1. Убедитесь что frontend использует Rust backend (не fetch)
2. Проверьте что Rust команды зарегистрированы в `main.rs`
3. Проверьте CSP в `tauri.conf.json`

### Симптом 3: "Таймаут подключения"

**Возможные причины**:
1. ❌ Сервер не отвечает
2. ❌ Сетевая проблема
3. ❌ Firewall блокирует

**Диагностика**:
```powershell
# Проверьте доступность порта
Test-NetConnection -ComputerName 212.80.7.83 -Port 8080

# Проверьте трассировку
tracert 212.80.7.83
```

**Решение**:
1. Проверьте что сервер запущен
2. Проверьте firewall на сервере
3. Проверьте сетевое подключение

---

## 🛠️ Исправления в коде

### Исправление 1: `src/services/tauri.ts` ✅ ПРИМЕНЕНО

```typescript
// Было:
const response = await (window as any).__TAURI__.invoke('check_server_health', { url });

// Стало:
const response = await (window as any).__TAURI__.invoke('check_server_health', url);
```

### Исправление 2: Проверка ответа ✅ ПРИМЕНЕНО

```typescript
// Было:
if (response.status !== 'ok') {
    throw new Error('Сервер не ответил корректно');
}

// Стало:
if (response && response.status === 'ok') {
    return response;
} else {
    throw new Error('Сервер не ответил корректно');
}
```

### Исправление 3: `src/services/tauri.ts` - httpRequest ✅ ПРИМЕНЕНО

```typescript
// Было:
headers: options.headers ? JSON.stringify(options.headers) : null,

// Стало:
headers: options.headers || null,
```

---

## 📊 Проверка после исправлений

### 1. Пересоберите frontend

```bash
npm run build
```

### 2. Пересоберите desktop приложение

```bash
cd src-tauri
cargo tauri build
```

### 3. Установите новую версию

```
src-tauri/target/release/bundle/msi/VoiceHub_2.0.0_x64_en-US.msi
```

### 4. Проверьте подключение

1. Запустите VoiceHub
2. Введите IP сервера: `212.80.7.83`
3. Нажмите "ПОДКЛЮЧИТЬСЯ"
4. Откройте DevTools (F12) и проверьте логи

---

## 🎯 Наиболее надёжное решение

### Использование Rust backend для всех HTTP запросов

**Преимущества**:
- ✅ Полностью обходит CORS
- ✅ Не зависит от WebView2 ограничений
- ✅ Работает через системный HTTP клиент Windows
- ✅ Поддерживает все протоколы (HTTP, HTTPS)

**Как это работает**:
```
Frontend (TypeScript)
    ↓ invoke('check_server_health', url)
Tauri IPC
    ↓
Rust Backend (reqwest)
    ↓ HTTP запрос
Сервер (Go)
```

**Код уже исправлен** ✅

---

## 📞 Если проблема не решена

### Соберите полную диагностику

Выполните эти команды и пришлите результат:

**На Windows (PowerShell)**:
```powershell
# 1. Проверка сервера
curl -v http://212.80.7.83:8080/health

# 2. Проверка CORS
curl -X OPTIONS -v http://212.80.7.83:8080/health -H "Origin: tauri://localhost"

# 3. Проверка порта
Test-NetConnection -ComputerName 212.80.7.83 -Port 8080

# 4. Проверка firewall
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*VoiceHub*" }
```

**В desktop приложении (DevTools F12)**:
- Скопируйте все логи из Console
- Скопируйте все запросы из Network вкладки

**На сервере**:
```bash
# 1. Статус сервиса
sudo systemctl status voicehub

# 2. Логи
sudo journalctl -u voicehub -n 50

# 3. Проверка портов
sudo ss -tuln | grep 8080

# 4. Проверка CORS
curl -I http://localhost:8080/health | grep "Access-Control"
```

---

## ✅ Итоговый чек-лист

- [x] Исправлен вызов Rust команды в `tauri.ts`
- [x] Исправлена проверка ответа в `tauri.ts`
- [x] Исправлена передача headers в `httpRequest`
- [x] Frontend пересобран
- [ ] Desktop приложение пересобрано
- [ ] Новая версия установлена
- [ ] Подключение проверено
- [ ] Логи проверены

---

## 📚 Дополнительные ресурсы

- [Tauri v1 Documentation](https://v1.tauri.app/)
- [Tauri HTTP Plugin](https://v1.tauri.app/plugins/http/)
- [CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Windows Firewall](https://docs.microsoft.com/en-us/windows/security/identity-protection/windows-firewall/)

---

**Дата**: 2026-01-20  
**Статус**: ✅ Исправления применены, требуется пересборка desktop приложения
