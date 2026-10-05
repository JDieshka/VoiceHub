# 🚀 Применение изменений на сервере

## ✅ Что было сделано

Интеграция API с Frontend завершена! Теперь данные синхронизируются между клиентами в реальном времени.

**Измененные файлы:**
- `src/App.tsx` - загрузка данных с сервера, отправка данных на сервер, WebSocket listeners
- `src/services/websocket.ts` - методы для отправки событий
- `server/internal/ws/hub.go` - обработка новых событий, функция BroadcastToAll
- `src/services/api.ts` - уже был создан ранее

---

## 📋 Что нужно сделать на сервере

### Шаг 1: Скопируйте обновленные файлы на сервер

**На локальной машине:**

```bash
# Скопируйте backend файлы
scp server/internal/ws/hub.go root@YOUR_SERVER_IP:/home/VoiceHub/server/internal/ws/

# Скопируйте frontend файлы (если нужно пересобрать)
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

### Шаг 3: Пересоберите frontend (если нужно)

**На сервере:**

```bash
cd /home/VoiceHub

# Установите зависимости (если нужно)
npm install

# Пересоберите frontend
npm run build

# Перезапустите backend для применения изменений
sudo systemctl restart voicehub
```

### Шаг 4: Проверьте работу

**На сервере:**

```bash
# Проверьте health endpoint
curl http://localhost:8080/health

# Проверьте логи
sudo journalctl -u voicehub -f
```

**В браузере:**

1. Откройте `http://YOUR_SERVER_IP:8080`
2. Зарегистрируйтесь
3. Создайте сервер
4. Откройте приложение в другом браузере
5. Зарегистрируйтесь другим пользователем
6. Проверьте что сервер виден обоим пользователям
7. Проверьте логи в консоли браузера (F12)

---

## 🧪 Тестирование синхронизации

### Тест 1: Создание сервера

1. Откройте приложение в двух браузерах
2. Зарегистрируйтесь в обоих
3. В первом браузере создайте сервер
4. **Ожидаемое поведение:**
   - ✅ Сервер появляется в первом браузере
   - ✅ Сервер появляется во втором браузере (через WebSocket)
   - ✅ В консоли первого браузера: `[App] Server created: {...}`
   - ✅ В консоли второго браузера: `[App] Server created via WebSocket: {...}`

### Тест 2: Создание чата

1. В первом браузере создайте чат
2. **Ожидаемое поведение:**
   - ✅ Чат появляется в первом браузере
   - ✅ Чат появляется во втором браузере (через WebSocket)
   - ✅ В консоли первого браузера: `[App] Chat created: {...}`
   - ✅ В консоли второго браузера: `[App] Chat created via WebSocket: {...}`

### Тест 3: Обновление страницы

1. Создайте сервер и чат
2. Обновите страницу (F5)
3. **Ожидаемое поведение:**
   - ✅ Сервер и чат загружаются с сервера
   - ✅ Данные не теряются

---

## 🔍 Проверка логов

### Логи backend (на сервере)

```bash
sudo journalctl -u voicehub -f
```

**Ожидаемые логи при создании сервера:**
```
[Hub] Server created by user-123
[Hub] Broadcasting to all clients
```

### Логи frontend (в браузере)

Откройте DevTools (F12) → Console

**Ожидаемые логи:**
```
[App] Loading servers...
[App] Servers loaded: [...]
[App] Creating server: My Server
[App] Server created: {id: "...", name: "My Server", ...}
[App] Server created via WebSocket: {id: "...", name: "My Server", ...}
```

---

## 🐛 Решение проблем

### Проблема 1: Сервер не видит изменения

**Решение:**
```bash
# Перезапустите backend
sudo systemctl restart voicehub

# Проверьте что backend использует новый код
sudo journalctl -u voicehub -n 20
```

### Проблема 2: WebSocket не подключается

**Решение:**
```bash
# Проверьте что WebSocket endpoint доступен
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Host: localhost:8080" http://localhost:8080/ws

# Проверьте firewall
sudo ufw status | grep 8080
```

### Проблема 3: Данные не сохраняются

**Решение:**
```bash
# Проверьте что PostgreSQL работает
sudo systemctl status postgresql

# Проверьте что база данных существует
sudo -u postgres psql -l | grep voicehub

# Проверьте таблицы
sudo -u postgres psql -d voicehub -c "\dt"
```

### Проблема 4: Ошибки компиляции Go

**Решение:**
```bash
cd /home/VoiceHub/server

# Очистите кэш
go clean -modcache

# Загрузите зависимости заново
go mod download

# Пересоберите
go build -o voicehub-server main.go
```

---

## 📊 Проверка работы API

### Проверка endpoints

```bash
# Health check
curl http://localhost:8080/health

# Создание сервера (нужен JWT токен)
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' | jq -r '.access_token')

curl -X POST http://localhost:8080/api/servers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test Server","icon":"🎮"}'

# Получение списка серверов
curl http://localhost:8080/api/servers/list \
  -H "Authorization: Bearer $TOKEN"

# Создание чата
curl -X POST http://localhost:8080/api/chats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test Chat"}'

# Получение списка чатов
curl http://localhost:8080/api/chats/list \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 Ожидаемый результат

После применения изменений:

✅ **Серверы** создаются на сервере и сохраняются в PostgreSQL  
✅ **Чаты** создаются на сервере и сохраняются в PostgreSQL  
✅ **Данные синхронизируются** между всеми клиентами через WebSocket  
✅ **Обновление страницы** загружает данные с сервера  
✅ **Реальное время** - все клиенты видят изменения мгновенно  

---

## 📚 Документация

- **`API_INTEGRATION_COMPLETE.md`** - подробное описание интеграции
- **`NEXT_STEPS.md`** - план следующих шагов
- **`POSTGRES_AUTOSETUP.md`** - автоматическая настройка PostgreSQL

---

## 🚀 Следующие шаги

После того как синхронизация серверов и чатов заработает:

1. **Интеграция сообщений в чатах**
   - Загрузка сообщений при открытии чата
   - Отправка сообщений через API
   - Синхронизация сообщений через WebSocket

2. **Интеграция участников серверов**
   - Загрузка участников сервера
   - Синхронизация участников через WebSocket

3. **Интеграция голосовых комнат**
   - Подключение к голосовой комнате
   - Синхронизация участников комнаты
   - Интеграция WebRTC для голосовой связи

---

**Готово к тестированию!** 🎉

Примените изменения на сервере и проверьте синхронизацию данных между клиентами.
