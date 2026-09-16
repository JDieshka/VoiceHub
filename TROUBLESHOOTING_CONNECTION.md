# 🔧 Решение проблемы "Failed to fetch"

## Проблема

При вводе адреса сервера в приложении появляется ошибка:
```
Не удалось подключиться к серверу: Failed to fetch
```

## Возможные причины

### 1. Сервер не запущен

**Проверка:**
```bash
# На сервере
systemctl status voicehub

# Или вручную
curl http://localhost:8080/health
```

**Решение:**
```bash
# Запустите сервер
systemctl start voicehub

# Или вручную
cd /opt/voicehub/server
./voicehub-server
```

---

### 2. Firewall блокирует порт

**Проверка:**
```bash
# На сервере
ufw status

# Или
netstat -tuln | grep 8080
```

**Решение:**
```bash
# Откройте порт 8080
ufw allow 8080/tcp
ufw reload
```

---

### 3. Неправильный URL

**Проверка:**
- Убедитесь, что вводите правильный IP/домен
- Проверьте порт (по умолчанию 8080)
- Убедитесь, что указан протокол (http:// или https://)

**Примеры правильных URL:**
```
http://localhost:8080
http://192.168.1.100:8080
http://45.67.89.123:8080
https://voicehub.example.com
```

---

### 4. CORS проблемы

**Проверка:**
Откройте консоль браузера (F12) и посмотрите на ошибки CORS.

**Решение:**
CORS уже настроен на сервере. Если проблема сохраняется, проверьте логи сервера:
```bash
journalctl -u voicehub -f
```

Должны быть логи вида:
```
[CORS] GET /health from http://localhost:5173
[Health] Health check from 127.0.0.1:12345
```

---

### 5. Mixed Content (HTTPS → HTTP)

**Проблема:**
Если приложение открыто по HTTPS, а сервер по HTTP, браузер блокирует запрос.

**Решение:**
- Используйте HTTPS для сервера
- Или откройте приложение по HTTP

---

### 6. Сервер слушает только на localhost

**Проверка:**
```bash
# На сервере
netstat -tuln | grep 8080
```

Должно быть:
```
tcp   LISTEN   0   100   0.0.0.0:8080   0.0.0.0:*
```

Если видите `127.0.0.1:8080`, сервер слушает только на localhost.

**Решение:**
Сервер уже настроен слушать на всех интерфейсах (`:8080`). Если проблема сохраняется, проверьте код сервера.

---

## Диагностика

### Шаг 1: Проверьте сервер

```bash
# На сервере
curl http://localhost:8080/health
```

Должно вернуть:
```json
{"status":"ok","service":"voicehub-server","version":"2.0.0","time":"..."}
```

### Шаг 2: Проверьте из браузера

Откройте в браузере:
```
http://your-server-ip:8080/health
```

Должен увидеть тот же JSON.

### Шаг 3: Проверьте консоль браузера

1. Откройте приложение
2. Нажмите F12 (DevTools)
3. Перейдите на вкладку Console
4. Попробуйте подключиться к серверу
5. Посмотрите на ошибки

Должны быть логи вида:
```
[ServerSelection] Checking server: http://your-server:8080/health
[ServerSelection] Response status: 200
[ServerSelection] Response data: {status: "ok", ...}
```

### Шаг 4: Проверьте логи сервера

```bash
# На сервере
journalctl -u voicehub -f
```

При подключении должны быть логи:
```
[CORS] GET /health from http://localhost:5173
[Health] Health check from 127.0.0.1:12345
```

---

## Быстрые решения

### Решение 1: Перезапустите сервер

```bash
systemctl restart voicehub
```

### Решение 2: Проверьте firewall

```bash
ufw allow 8080/tcp
ufw reload
```

### Решение 3: Проверьте URL

Убедитесь, что вводите правильный URL:
- ✅ `http://localhost:8080` (локально)
- ✅ `http://192.168.1.100:8080` (локальная сеть)
- ✅ `http://45.67.89.123:8080` (VPS)
- ❌ `http://45.67.89.123` (нет порта)
- ❌ `https://45.67.89.123:8080` (HTTPS без сертификата)

### Решение 4: Используйте localhost для тестирования

Если тестируете локально:
```bash
# Терминал 1: Сервер
cd server
go run main.go

# Терминал 2: Фронтенд
npm run dev

# Браузер: http://localhost:5173
# Введите: http://localhost:8080
```

---

## Проверка CORS

### Тест через curl

```bash
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://your-server:8080/health \
     -v
```

Должны увидеть заголовки:
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

### Тест через браузер

Откройте консоль браузера и выполните:
```javascript
fetch('http://your-server:8080/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

---

## Если ничего не помогло

### 1. Проверьте версию сервера

```bash
cd /opt/voicehub/server
./voicehub-server -version
```

### 2. Проверьте логи

```bash
journalctl -u voicehub -n 100
```

### 3. Проверьте конфигурацию

```bash
cat /etc/systemd/system/voicehub.service
```

### 4. Пересоберите сервер

```bash
cd /opt/voicehub/server
go build -o voicehub-server main.go
systemctl restart voicehub
```

### 5. Проверьте порт

```bash
lsof -i :8080
```

---

## Контакты

Если проблема не решена:
1. Откройте консоль браузера (F12)
2. Скопируйте все ошибки
3. Откройте логи сервера
4. Создайте issue на GitHub с полной информацией

---

**Удачи в решении проблемы!** 🚀
