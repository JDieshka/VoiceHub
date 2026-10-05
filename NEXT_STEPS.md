# 🚀 Следующий шаг: Интеграция API сервиса с Frontend

## ✅ Что уже сделано

### Backend (Go)
1. ✅ Создан `ChatHandler` с endpoints:
   - `POST /api/chats` - создать чат
   - `GET /api/chats/list` - получить список чатов
   - `GET /api/chats/messages` - получить сообщения чата
   - `POST /api/chats/messages/send` - отправить сообщение

2. ✅ Создан `ChatRepository` с методами:
   - `Create()` - создать чат
   - `GetUserChats()` - получить чаты пользователя
   - `AddMember()` - добавить участника
   - `GetMembers()` - получить участников

3. ✅ Обновлена модель `Message`:
   - Добавлено поле `ChatID` (nullable)
   - Добавлено поле `ChannelID` (nullable)
   - Добавлена проверка: сообщение должно быть либо в канале, либо в чате

4. ✅ Обновлена миграция БД:
   - Создана таблица `chats`
   - Создана таблица `chat_members`
   - Обновлена таблица `messages` (добавлен `chat_id`)

5. ✅ Зарегистрированы endpoints в `main.go`

### Frontend (React)
1. ✅ Создан `src/services/api.ts` с методами:
   - `createServer()` - создать сервер
   - `getServers()` - получить серверы
   - `createRoom()` - создать комнату
   - `getRooms()` - получить комнаты
   - `createChat()` - создать чат
   - `getChats()` - получить чаты
   - `sendMessage()` - отправить сообщение
   - `getMessages()` - получить сообщения

---

## 🎯 Что нужно сделать дальше

### Задача 1: Обновить App.tsx для загрузки данных с сервера

**Текущая проблема:**
```typescript
// App.tsx:33-48
const [chats, setChats] = useState([]); // ❌ Пустой массив при старте
const [servers, setServers] = useState([]); // ❌ Пустой массив при старте
```

**Решение:**
```typescript
// Загружаем данные с сервера при старте
useEffect(() => {
  if (isAuthenticated) {
    loadServers();
    loadChats();
  }
}, [isAuthenticated]);

const loadServers = async () => {
  try {
    const servers = await apiService.getServers();
    setServers(servers);
  } catch (error) {
    console.error('Failed to load servers:', error);
  }
};

const loadChats = async () => {
  try {
    const chats = await apiService.getChats();
    setChats(chats);
  } catch (error) {
    console.error('Failed to load chats:', error);
  }
};
```

### Задача 2: Обновить обработчики создания данных

**Текущая проблема:**
```typescript
// App.tsx:136-165
const handleModalSubmit = (data: any) => {
  if (modalType === 'chat') {
    const newChat = { id: Date.now().toString(), name: data.name };
    setChats([...chats, newChat]); // ❌ Только локально!
  }
};
```

**Решение:**
```typescript
const handleModalSubmit = async (data: any) => {
  try {
    if (modalType === 'chat') {
      // Отправляем на сервер
      const newChat = await apiService.createChat(data.name);
      setChats([...chats, newChat]);
      
      // Уведомляем других через WebSocket
      websocketService.sendChatCreate(newChat);
    } else if (modalType === 'server') {
      const newServer = await apiService.createServer(data.name, data.icon);
      setServers([...servers, newServer]);
      websocketService.sendServerCreate(newServer);
    } else if (modalType === 'channel') {
      const newRoom = await apiService.createRoom(servers[0].id, data.name, data.type);
      const updatedServers = [...servers];
      updatedServers[0].rooms.push(newRoom);
      setServers(updatedServers);
      websocketService.sendRoomCreate(newRoom);
    }
  } catch (error) {
    console.error('Failed to create:', error);
    alert('Ошибка создания. Попробуйте еще раз.');
  }
};
```

### Задача 3: Добавить WebSocket listeners для синхронизации

**Добавить в App.tsx:**
```typescript
useEffect(() => {
  if (isAuthenticated) {
    // Подписываемся на события от других клиентов
    websocketService.onServerCreated((server) => {
      setServers(prev => [...prev, server]);
    });
    
    websocketService.onRoomCreated((room) => {
      setServers(prev => prev.map(s => 
        s.id === room.serverId 
          ? { ...s, rooms: [...s.rooms, room] }
          : s
      ));
    });
    
    websocketService.onChatCreated((chat) => {
      setChats(prev => [...prev, chat]);
    });
    
    websocketService.onChatMessage((chatId, message) => {
      // Обновляем сообщения в чате
      // ...
    });
  }
}, [isAuthenticated]);
```

### Задача 4: Обновить WebSocket сервис

**Добавить в `src/services/websocket.ts`:**
```typescript
// Отправка событий
sendServerCreate(server: Server) {
  this.send({ type: 'server-create', payload: server });
}

sendRoomCreate(room: Room) {
  this.send({ type: 'room-create', payload: room });
}

sendChatCreate(chat: Chat) {
  this.send({ type: 'chat-create', payload: chat });
}

sendChatMessage(chatId: string, message: Message) {
  this.send({ type: 'chat-message', payload: { chatId, message } });
}

// Подписка на события
onServerCreated(handler: (server: Server) => void) {
  this.on('server-created', handler);
}

onRoomCreated(handler: (room: Room) => void) {
  this.on('room-created', handler);
}

onChatCreated(handler: (chat: Chat) => void) {
  this.on('chat-created', handler);
}

onChatMessage(handler: (chatId: string, message: Message) => void) {
  this.on('chat-message-received', handler);
}
```

### Задача 5: Обновить WebSocket Hub на сервере

**Добавить в `server/internal/ws/hub.go`:**
```go
func (h *Hub) handleMessage(client *Client, msg Message) {
  switch msg.Type {
  case "server-create":
    h.handleServerCreate(client, msg)
  case "room-create":
    h.handleRoomCreate(client, msg)
  case "chat-create":
    h.handleChatCreate(client, msg)
  case "chat-message":
    h.handleChatMessage(client, msg)
  // ... существующие обработчики
  }
}

func (h *Hub) handleChatCreate(client *Client, msg Message) {
  // Сохраняем в БД
  chat := msg.Payload.(Chat)
  db.CreateChat(chat)
  
  // Отправляем всем клиентам
  h.broadcast(Message{
    Type: "chat-created",
    Payload: chat,
  })
}
```

---

## 📋 Чек-лист реализации

### Frontend
- [ ] Обновить `App.tsx` - загрузка данных при старте
- [ ] Обновить `App.tsx` - отправка данных на сервер
- [ ] Обновить `App.tsx` - обработка WebSocket событий
- [ ] Обновить `websocket.ts` - добавить новые методы
- [ ] Тестирование создания серверов
- [ ] Тестирование создания комнат
- [ ] Тестирование создания чатов
- [ ] Тестирование отправки сообщений

### Backend
- [ ] Обновить `hub.go` - добавить обработчики событий
- [ ] Обновить `hub.go` - broadcast событий клиентам
- [ ] Тестирование WebSocket синхронизации
- [ ] Тестирование сохранения в БД

### Интеграция
- [ ] Тестирование полного цикла создания сервера
- [ ] Тестирование полного цикла создания чата
- [ ] Тестирование синхронизации между клиентами
- [ ] Тестирование сохранения после обновления страницы

---

## 🎯 Ожидаемый результат

После реализации:

✅ **Серверы:**
- Создаются на сервере и сохраняются в БД
- Видны всем пользователям
- Синхронизируются в реальном времени через WebSocket

✅ **Комнаты:**
- Создаются на сервере и сохраняются в БД
- Видны всем участникам сервера
- Синхронизируются в реальном времени

✅ **Чаты:**
- Создаются на сервере и сохраняются в БД
- Видны всем участникам чата
- Синхронизируются в реальном времени

✅ **Сообщения:**
- Отправляются на сервер и сохраняются в БД
- Видны всем участникам чата
- Синхронизируются в реальном времени

✅ **Обновление страницы:**
- Все данные загружаются с сервера
- Ничего не теряется

---

## 🚀 Приоритет задач

1. **Критично** (без этого не работает):
   - Обновить `App.tsx` для загрузки данных с сервера
   - Обновить `App.tsx` для отправки данных на сервер
   - Обновить WebSocket сервис

2. **Важно** (улучшает UX):
   - Добавить WebSocket listeners
   - Обновить WebSocket Hub на сервере
   - Тестирование синхронизации

3. **Опционально** (nice to have):
   - Индикаторы загрузки
   - Обработка ошибок
   - Retry механизмы

---

## 📞 Следующие шаги

1. Начать с **Задачи 1**: Обновить `App.tsx` для загрузки данных
2. Перейти к **Задаче 2**: Обновить обработчики создания
3. Добавить **Задачу 3**: WebSocket listeners
4. Обновить **Задачу 4**: WebSocket сервис
5. Обновить **Задачу 5**: WebSocket Hub на сервере
6. Тестирование полного цикла

---

**Статус:** 📋 План готов, можно начинать реализацию  
**Приоритет:** 🔴 КРИТИЧНО  
**Оценка времени:** 2-3 часа
