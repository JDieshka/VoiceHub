# 🔴 КРИТИЧЕСКАЯ ПРОБЛЕМА: Данные не сохраняются на сервере

## Анализ проблемы

### Симптомы
1. При создании чата/сервера/комнаты - данные появляются только локально
2. У другого пользователя данные не видны
3. После обновления страницы данные исчезают

### Причина
Данные хранятся **только в локальном состоянии React** (`useState`), но:
- ❌ Не отправляются на сервер через API
- ❌ Не сохраняются в базу данных PostgreSQL
- ❌ Не синхронизируются между клиентами через WebSocket

### Текущая реализация (App.tsx:136-165)
```typescript
const handleModalSubmit = (data: any) => {
  if (modalType === 'chat') {
    const newChat = {
      id: Date.now().toString(),
      name: data.name,
      lastMessage: ''
    };
    setChats([...chats, newChat]); // ❌ Только локально!
  } else if (modalType === 'server') {
    const newServer = { ... };
    setServers([...servers, newServer]); // ❌ Только локально!
  }
};
```

---

## 🎯 План исправления

### Фаза 1: Backend API (Go)

#### 1.1 Создать API endpoints

**Серверы:**
- `POST /api/servers` - создать сервер
- `GET /api/servers` - получить список серверов пользователя
- `GET /api/servers/:id` - получить сервер с комнатами
- `PUT /api/servers/:id` - обновить сервер
- `DELETE /api/servers/:id` - удалить сервер

**Комнаты:**
- `POST /api/servers/:id/rooms` - создать комнату
- `GET /api/rooms/:id` - получить комнату
- `PUT /api/rooms/:id` - обновить комнату
- `DELETE /api/rooms/:id` - удалить комнату

**Чаты:**
- `POST /api/chats` - создать чат
- `GET /api/chats` - получить список чатов пользователя
- `GET /api/chats/:id/messages` - получить сообщения чата
- `POST /api/chats/:id/messages` - отправить сообщение

**Сообщения:**
- `POST /api/messages` - отправить сообщение
- `GET /api/messages/:id` - получить сообщение

#### 1.2 Добавить WebSocket события

**События от клиента к серверу:**
- `server-create` - создать сервер
- `server-update` - обновить сервер
- `server-delete` - удалить сервер
- `room-create` - создать комнату
- `room-update` - обновить комнату
- `room-delete` - удалить комнату
- `chat-create` - создать чат
- `chat-message` - отправить сообщение

**События от сервера к клиентам:**
- `server-created` - сервер создан (broadcast всем)
- `server-updated` - сервер обновлен
- `server-deleted` - сервер удален
- `room-created` - комната создана
- `room-updated` - комната обновлена
- `room-deleted` - комната удалена
- `chat-created` - чат создан
- `chat-message-received` - получено сообщение

#### 1.3 Обновить базу данных

**Таблицы:**
- `servers` - серверы (уже есть)
- `rooms` - комнаты (уже есть как voice_channels)
- `chats` - чаты (НУЖНО ДОБАВИТЬ)
- `messages` - сообщения (уже есть)
- `server_members` - участники серверов (уже есть)
- `chat_members` - участники чатов (НУЖНО ДОБАВИТЬ)

---

### Фаза 2: Frontend API Service (React)

#### 2.1 Создать API сервис

**Файл:** `src/services/api.ts`

```typescript
export const apiService = {
  // Серверы
  async createServer(name: string, icon: string): Promise<Server> {
    const response = await fetch(`${getServerUrl()}/api/servers`, {
      method: 'POST',
      headers: { ...authService.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon })
    });
    return response.json();
  },
  
  async getServers(): Promise<Server[]> {
    const response = await fetch(`${getServerUrl()}/api/servers`, {
      headers: authService.getAuthHeaders()
    });
    return response.json();
  },
  
  // Комнаты
  async createRoom(serverId: string, name: string, type: string): Promise<Room> {
    const response = await fetch(`${getServerUrl()}/api/servers/${serverId}/rooms`, {
      method: 'POST',
      headers: { ...authService.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type })
    });
    return response.json();
  },
  
  // Чаты
  async createChat(name: string): Promise<Chat> {
    const response = await fetch(`${getServerUrl()}/api/chats`, {
      method: 'POST',
      headers: { ...authService.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    return response.json();
  },
  
  async getChats(): Promise<Chat[]> {
    const response = await fetch(`${getServerUrl()}/api/chats`, {
      headers: authService.getAuthHeaders()
    });
    return response.json();
  },
  
  // Сообщения
  async sendMessage(chatId: string, content: string): Promise<Message> {
    const response = await fetch(`${getServerUrl()}/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: { ...authService.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    return response.json();
  },
  
  async getMessages(chatId: string): Promise<Message[]> {
    const response = await fetch(`${getServerUrl()}/api/chats/${chatId}/messages`, {
      headers: authService.getAuthHeaders()
    });
    return response.json();
  }
};
```

#### 2.2 Обновить WebSocket сервис

**Файл:** `src/services/websocket.ts`

Добавить методы для отправки событий:
```typescript
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
```

Добавить listeners для получения событий:
```typescript
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

---

### Фаза 3: Обновить Frontend компоненты

#### 3.1 Обновить App.tsx

**Загрузка данных при старте:**
```typescript
useEffect(() => {
  if (isAuthenticated) {
    // Загружаем серверы, чаты с сервера
    loadServers();
    loadChats();
  }
}, [isAuthenticated]);

const loadServers = async () => {
  const servers = await apiService.getServers();
  setServers(servers);
};

const loadChats = async () => {
  const chats = await apiService.getChats();
  setChats(chats);
};
```

**Обновить обработчики:**
```typescript
const handleModalSubmit = async (data: any) => {
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
    // Обновляем локальное состояние
    const updatedServers = [...servers];
    updatedServers[0].rooms.push(newRoom);
    setServers(updatedServers);
    websocketService.sendRoomCreate(newRoom);
  }
};
```

**Добавить WebSocket listeners:**
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

---

### Фаза 4: WebSocket синхронизация на сервере

#### 4.1 Обновить WebSocket Hub (Go)

**Файл:** `server/internal/ws/hub.go`

Добавить обработку новых событий:
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

func (h *Hub) handleServerCreate(client *Client, msg Message) {
  // Сохраняем в БД
  server := msg.Payload.(Server)
  db.CreateServer(server)
  
  // Отправляем всем клиентам
  h.broadcast(Message{
    Type: "server-created",
    Payload: server,
  })
}
```

---

## 📋 Приоритет задач

### Критично (без этого не работает)
1. ✅ Создать API endpoints для серверов, комнат, чатов
2. ✅ Создать API сервис на frontend
3. ✅ Обновить App.tsx для работы с API
4. ✅ Добавить WebSocket события для синхронизации

### Важно (улучшает UX)
5. ✅ Загрузка данных при старте приложения
6. ✅ Обработка ошибок API
7. ✅ Индикаторы загрузки
8. ✅ Retry механизмы

### Опционально (nice to have)
9. ⏳ Кэширование данных на клиенте
10. ⏳ Offline режим
11. ⏳ Оптимистичные обновления UI

---

## 🚀 План реализации

### День 1: Backend API
- [ ] Создать handlers для серверов
- [ ] Создать handlers для комнат
- [ ] Создать handlers для чатов
- [ ] Создать handlers для сообщений
- [ ] Обновить базу данных (добавить таблицы chats, chat_members)
- [ ] Тестирование API через curl/Postman

### День 2: Frontend API Service
- [ ] Создать `src/services/api.ts`
- [ ] Реализовать методы для серверов
- [ ] Реализовать методы для комнат
- [ ] Реализовать методы для чатов
- [ ] Реализовать методы для сообщений
- [ ] Тестирование API сервисов

### День 3: WebSocket синхронизация
- [ ] Обновить `websocket.ts` - добавить новые события
- [ ] Обновить `hub.go` - добавить обработчики событий
- [ ] Тестирование синхронизации между клиентами

### День 4: Интеграция с UI
- [ ] Обновить `App.tsx` - загрузка данных при старте
- [ ] Обновить `App.tsx` - отправка данных на сервер
- [ ] Обновить `App.tsx` - обработка WebSocket событий
- [ ] Тестирование полного цикла

### День 5: Тестирование и отладка
- [ ] Тестирование создания серверов
- [ ] Тестирование создания комнат
- [ ] Тестирование создания чатов
- [ ] Тестирование отправки сообщений
- [ ] Тестирование синхронизации между клиентами
- [ ] Исправление багов

---

## 📊 Ожидаемый результат

После реализации:

✅ **Серверы:**
- Создаются на сервере и сохраняются в БД
- Видны всем пользователям
- Синхронизируются в реальном времени

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

## 🎯 Следующие шаги

1. Начать с **Фазы 1: Backend API**
2. Создать API endpoints для серверов
3. Протестировать через curl
4. Перейти к **Фазе 2: Frontend API Service**
5. Интегрировать с UI
6. Добавить WebSocket синхронизацию
7. Тестирование полного цикла

---

**Статус:** 📋 План готов, можно начинать реализацию  
**Приоритет:** 🔴 КРИТИЧНО  
**Оценка времени:** 5 дней
