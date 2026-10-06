# 🔧 Исправление проблем с серверами, комнатами и чатами

## 📋 Найденные и исправленные проблемы

### 1. ✅ WebSocket подключается к неправильному пути
**Проблема:** WebSocket пытался подключиться к `ws://212.80.7.83:8080/` вместо `ws://212.80.7.83:8080/ws`

**Решение:** Добавлен вызов `setWebSocketUrl(url)` в `App.tsx` при выборе сервера

**Файл:** `src/App.tsx`

### 2. ✅ Отсутствует endpoint для создания комнат
**Проблема:** `POST /api/servers/:id/rooms` возвращал 404

**Решение:** 
- Создан метод `CreateRoom` в `server/internal/handlers/server_handler.go`
- Зарегистрирован endpoint в `server/main.go`

**Файлы:** 
- `server/internal/handlers/server_handler.go`
- `server/main.go`

### 3. ✅ Ошибка getUserMedia без HTTPS
**Проблема:** Браузер блокирует доступ к микрофону/камере при работе по HTTP

**Решение:** Добавлена проверка поддержки `getUserMedia` и обработка ошибок с понятным сообщением для пользователя

**Файл:** `src/components/min/VoiceView.tsx`

---

## 🚀 Применение исправлений на сервере

### Шаг 1: Скопируйте обновленные файлы на сервер

**На локальной машине:**

```bash
# Скопируйте backend файлы
scp server/main.go root@YOUR_SERVER_IP:/home/VoiceHub/server/
scp server/internal/handlers/server_handler.go root@YOUR_SERVER_IP:/home/VoiceHub/server/internal/handlers/

# Скопируйте frontend файлы
scp -r src root@YOUR_SERVER_IP:/home/VoiceHub/
scp package.json root@YOUR_SERVER_IP:/home/VoiceHub/
```

### Шаг 2: Пересоберите backend на сервере

**На сервере:**

```bash
cd /home/VoiceHub/server

# Пересоберите backend
go build -o voicehub-server main.go

# Перезапустите сервис
sudo systemctl restart voicehub

# Проверьте статус
sudo systemctl status voicehub
```

### Шаг 3: Пересоберите frontend на сервере

**На сервере:**

```bash
cd /home/VoiceHub

# Пересоберите frontend
npm run build

# Перезапустите backend для применения изменений
sudo systemctl restart voicehub
```

### Шаг 4: Проверьте работу

**В браузере:**

1. Откройте `http://YOUR_SERVER_IP:8080`
2. Зарегистрируйтесь или войдите
3. Создайте сервер
4. Создайте комнату (голосовую или текстовую)
5. Создайте чат

**Ожидаемое поведение:**
- ✅ Сервер создается и сохраняется
- ✅ Комнаты создаются и появляются в списке
- ✅ Чаты создаются и появляются в списке
- ✅ WebSocket подключается корректно
- ✅ Если нет HTTPS - показывается предупреждение о микрофоне/камере, но текстовый чат работает

---

## 🔍 Проверка в консоли браузера

Откройте DevTools (F12) → Console

**Ожидаемые логи при создании сервера:**
```
[App] Creating server: test
[API] Creating server: test
[API] Server created: {id: "...", name: "test", ...}
[App] Server created: {id: "...", name: "test", ...}
```

**Ожидаемые логи при создании комнаты:**
```
[App] Creating room: test2 in server: ...
[API] Creating room: test2 in server: ...
[API] Room created: {id: "...", name: "test2", ...}
[App] Room created: {id: "...", name: "test2", ...}
```

**Ожидаемые логи при создании чата:**
```
[App] Creating chat: username
[API] Creating chat: username
[API] Chat created: {id: "...", name: "username", ...}
[App] Chat created: {id: "...", name: "username", ...}
```

**Ожидаемые логи WebSocket:**
```
[WS] WebSocket URL set to: ws://212.80.7.83:8080/ws
[WS] Connected to server
```

---

## 🐛 Решение проблем

### Проблема 1: Комнаты всё ещё не создаются (404)

**Решение:**
```bash
# Проверьте что endpoint зарегистрирован
curl -X POST http://localhost:8080/api/servers/YOUR_SERVER_ID/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"test","type":"voice"}'

# Должно вернуть JSON с созданной комнатой
```

Если всё ещё 404:
```bash
# Пересоберите backend
cd /home/VoiceHub/server
go build -o voicehub-server main.go
sudo systemctl restart voicehub
```

### Проблема 2: Чаты не создаются (ERR_EMPTY_RESPONSE)

**Решение:**
```bash
# Проверьте логи backend
sudo journalctl -u voicehub -n 50 | grep -i "chat"

# Проверьте что endpoint зарегистрирован
curl -X POST http://localhost:8080/api/chats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"test"}'

# Должно вернуть JSON с созданным чатом
```

Если бэкенд не отвечает:
```bash
# Перезапустите backend
sudo systemctl restart voicehub

# Проверьте что backend запущен
sudo systemctl status voicehub
```

### Проблема 3: WebSocket не подключается

**Решение:**
```bash
# Проверьте что WebSocket endpoint работает
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Host: localhost:8080" http://localhost:8080/ws

# Должно вернуть 101 Switching Protocols
```

Если не работает:
```bash
# Проверьте логи backend
sudo journalctl -u voicehub -n 50 | grep -i "websocket"

# Перезапустите backend
sudo systemctl restart voicehub
```

### Проблема 4: Ошибка getUserMedia

**Причина:** Браузер блокирует доступ к микрофону/камере без HTTPS

**Решение:**
- Для полноценной работы с голосом/видео нужен HTTPS
- Текстовый чат будет работать без HTTPS
- Для тестирования можно использовать `http://localhost:8080` (localhost исключение)

**Настройка HTTPS (опционально):**
```bash
# Установите certbot
sudo apt-get install certbot python3-certbot-nginx

# Получите SSL сертификат (нужен домен)
sudo certbot --nginx -d yourdomain.com

# Или используйте самоподписанный сертификат для тестирования
```

---

## 📊 Проверка работы API

### Создание сервера
```bash
# Получите токен
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' | jq -r '.access_token')

# Создайте сервер
curl -X POST http://localhost:8080/api/servers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test Server","icon":"🎮"}'
```

### Создание комнаты
```bash
# Получите ID сервера
SERVER_ID=$(curl -s http://localhost:8080/api/servers/list \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')

# Создайте голосовую комнату
curl -X POST http://localhost:8080/api/servers/$SERVER_ID/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"General Voice","type":"voice"}'

# Создайте текстовую комнату
curl -X POST http://localhost:8080/api/servers/$SERVER_ID/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"General Text","type":"text"}'
```

### Создание чата
```bash
curl -X POST http://localhost:8080/api/chats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Private Chat"}'
```

---

## ✅ Итоговый чек-лист

- [ ] Скопированы обновленные файлы на сервер
- [ ] Пересобран backend (`go build`)
- [ ] Перезапущен backend (`systemctl restart voicehub`)
- [ ] Пересобран frontend (`npm run build`)
- [ ] WebSocket подключается к правильному пути (`/ws`)
- [ ] Серверы создаются успешно
- [ ] Комнаты создаются успешно (голосовые и текстовые)
- [ ] Чаты создаются успешно
- [ ] Данные синхронизируются между клиентами через WebSocket
- [ ] После обновления страницы данные загружаются с сервера

---

## 📚 Документация

- **`FIX_SERVER_ROOMS_CHATS.md`** - этот файл
- **`API_INTEGRATION_COMPLETE.md`** - описание интеграции API
- **`APPLY_CHANGES.md`** - инструкция по применению изменений

---

**Все проблемы исправлены! Применяйте изменения на сервере и тестируйте!** 🚀
