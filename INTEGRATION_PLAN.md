# 📋 План интеграции нового дизайна MIN

## ✅ Что уже сделано

### 1. Структура файлов создана
- `src/styles/min.css` - все стили нового дизайна
- `src/components/min/AuthPage.tsx` - страница входа/регистрации
- `src/components/min/TopBar.tsx` - верхняя панель
- `src/components/min/ViewTabs.tsx` - вкладки ЧАТЫ/ГОЛОСОВЫЕ ЧАТЫ
- `src/components/min/ChatView.tsx` - текстовые чаты
- `src/components/min/VoiceView.tsx` - голосовые чаты
- `src/components/min/ProfileView.tsx` - профиль пользователя
- `src/components/min/Modal.tsx` - модальные окна
- `src/services/auth.ts` - сервис аутентификации
- `src/App.tsx` - главный компонент обновлен

### 2. Дизайн интегрирован
- Пиксельный стиль (Press Start 2P)
- Цветовая палитра (mint, pink, purple, gray)
- Адаптивный дизайн
- Все компоненты из оригинального HTML

---

## 🎯 Рекомендация: P2P или SFU?

### **Рекомендую: P2P (Mesh)**

#### Почему P2P лучше для MIN:

1. **Масштаб проекта**
   - MIN - это небольшой мессенджер
   - Ожидаемое количество пользователей: 2-10 в комнате
   - P2P идеально подходит для малых групп

2. **Простота развертывания**
   - Не нужен SFU сервер
   - Меньше нагрузки на сервер
   - Проще поддерживать

3. **Минимальная задержка**
   - Прямое соединение между участниками
   - Нет промежуточного сервера
   - Лучше для голосовых чатов

4. **Экономия ресурсов**
   - Сервер не тратит ресурсы на пересылку медиа
   - Можно использовать более дешевый VPS
   - Масштабируется за счет клиентов

5. **Приватность**
   - Медиа не проходит через сервер
   - Лучше для конфиденциальных разговоров

#### Когда нужен SFU:

- 10+ участников в комнате
- Нужна запись сессий
- Требуется модерация контента
- Большая нагрузка на сервер

---

## 📝 План интеграции P2P

### Этап 1: WebSocket сигнализация (уже есть)

**Файлы:**
- `src/services/websocket.ts` - WebSocket клиент
- `server/internal/ws/hub.go` - WebSocket сервер

**Что делает:**
- Управление комнатами
- Обмен SDP offer/answer
- Обмен ICE candidates
- Синхронизация состояния

**Статус:** ✅ Уже реализовано

### Этап 2: WebRTC P2P (нужно интегрировать)

**Файлы для создания:**
- `src/services/webrtc.ts` - WebRTC менеджер

**Что нужно сделать:**
1. Создать WebRTC менеджер
2. Интегрировать с VoiceView
3. Добавить обработку медиа потоков
4. Добавить управление mute/camera/screen

**Пример кода:**
```typescript
// src/services/webrtc.ts
class WebRTCService {
  private localStream: MediaStream | null = null;
  private peers: Map<string, RTCPeerConnection> = new Map();
  
  async initLocalStream() {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    });
  }
  
  async createPeerConnection(userId: string) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    // Add local tracks
    this.localStream?.getTracks().forEach(track => {
      pc.addTrack(track, this.localStream!);
    });
    
    // Handle remote tracks
    pc.ontrack = (event) => {
      // Update UI with remote stream
    };
    
    this.peers.set(userId, pc);
  }
}
```

### Этап 3: Интеграция с VoiceView

**Что нужно изменить в `VoiceView.tsx`:**

1. Добавить WebRTC сервис
2. При выборе комнаты:
   - Подключиться к WebSocket комнате
   - Инициализировать локальный медиа поток
   - Создать peer connections с другими участниками
3. Обновить UI с реальными видео потоками
4. Добавить контроль mute/camera/screen через WebRTC

**Пример:**
```typescript
const handleRoomSelect = async (roomId: string) => {
  setActiveRoomId(roomId);
  
  // Connect to WebSocket room
  await websocketService.joinRoom(roomId);
  
  // Initialize local media
  await webrtcService.initLocalStream();
  
  // Create peer connections
  // (will be triggered by WebSocket events)
};
```

### Этап 4: Текстовые чаты

**Файлы для создания:**
- `src/services/chat.ts` - менеджер чатов

**Что нужно сделать:**
1. Создать менеджер чатов
2. Интегрировать с ChatView
3. Добавить отправку/получение сообщений через WebSocket
4. Добавить историю сообщений

### Этап 5: Серверная часть (уже есть)

**Файлы:**
- `server/main.go` - главный сервер
- `server/internal/ws/hub.go` - WebSocket hub
- `server/internal/auth/` - аутентификация
- `server/internal/database/` - база данных

**Что уже реализовано:**
- ✅ JWT аутентификация
- ✅ WebSocket signaling
- ✅ Управление комнатами
- ✅ PostgreSQL база данных

---

## 🔄 План миграции

### Шаг 1: Удалить старые компоненты

```bash
# Удалить старые компоненты
rm -rf src/components/ServerSidebar.tsx
rm -rf src/components/ChannelList.tsx
rm -rf src/components/Chat.tsx
rm -rf src/components/VoiceView.tsx  # старая версия
rm -rf src/components/MembersList.tsx
rm -rf src/components/AuthPage.tsx  # старая версия
```

### Шаг 2: Создать WebRTC сервис

```bash
# Создать файл
touch src/services/webrtc.ts
```

**Содержимое:**
```typescript
import { websocketService } from './websocket';

class WebRTCService {
  private localStream: MediaStream | null = null;
  private peers: Map<string, RTCPeerConnection> = new Map();
  private onRemoteStream?: (userId: string, stream: MediaStream) => void;
  
  async initLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      return this.localStream;
    } catch (error) {
      console.error('[WebRTC] Failed to get local stream:', error);
      throw error;
    }
  }
  
  async createPeerConnection(userId: string) {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    
    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        websocketService.sendICECandidate(userId, event.candidate);
      }
    };
    
    // Handle remote tracks
    pc.ontrack = (event) => {
      if (this.onRemoteStream && event.streams[0]) {
        this.onRemoteStream(userId, event.streams[0]);
      }
    };
    
    this.peers.set(userId, pc);
    return pc;
  }
  
  async handleOffer(userId: string, offer: RTCSessionDescriptionInit) {
    const pc = await this.createPeerConnection(userId);
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    websocketService.sendAnswer(userId, answer);
  }
  
  async handleAnswer(userId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peers.get(userId);
    if (pc) {
      await pc.setRemoteDescription(answer);
    }
  }
  
  async handleICECandidate(userId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peers.get(userId);
    if (pc) {
      await pc.addIceCandidate(candidate);
    }
  }
  
  setOnRemoteStream(callback: (userId: string, stream: MediaStream) => void) {
    this.onRemoteStream = callback;
  }
  
  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled;
      }
    }
    return false;
  }
  
  toggleCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return !videoTrack.enabled;
      }
    }
    return false;
  }
  
  async startScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      
      // Replace video track in all peer connections
      const screenTrack = screenStream.getVideoTracks()[0];
      this.peers.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });
      
      return screenStream;
    } catch (error) {
      console.error('[WebRTC] Failed to start screen share:', error);
      throw error;
    }
  }
  
  stopScreenShare() {
    // Restore camera track
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      this.peers.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });
    }
  }
  
  leaveRoom() {
    this.peers.forEach(pc => pc.close());
    this.peers.clear();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }
}

export const webrtcService = new WebRTCService();
export default webrtcService;
```

### Шаг 3: Обновить VoiceView

**Что нужно добавить:**
1. Импортировать WebRTC сервис
2. Добавить обработку медиа потоков
3. Обновить UI с реальными видео
4. Добавить контроль через WebRTC

### Шаг 4: Обновить WebSocket сервис

**Что нужно добавить:**
1. Обработка событий user-joined/user-left
2. Автоматическое создание peer connections
3. Обмен SDP и ICE candidates

### Шаг 5: Тестирование

1. Запустить сервер: `cd server && go run main.go`
2. Запустить фронтенд: `npm run dev`
3. Открыть в двух браузерах
4. Зарегистрироваться
5. Создать голосовую комнату
6. Подключиться к комнате
7. Проверить голосовую связь
8. Проверить видео
9. Проверить расшаривание экрана

---

## 📊 Сравнение P2P vs SFU

| Характеристика | P2P (Mesh) | SFU |
|----------------|------------|-----|
| **Задержка** | Минимальная (прямое соединение) | Средняя (через сервер) |
| **Нагрузка на сервер** | Минимальная (только сигнализация) | Высокая (пересылка медиа) |
| **Масштабируемость** | До 10 участников | 100+ участников |
| **Сложность** | Простая | Сложная |
| **Стоимость** | Дешевле | Дороже |
| **Приватность** | Высокая (медиа не через сервер) | Средняя |
| **Запись сессий** | Сложно | Легко |
| **Модерация** | Сложно | Легко |

---

## 🎯 Итоговая рекомендация

**Используйте P2P (Mesh) для MIN**, потому что:

1. ✅ Простота реализации
2. ✅ Минимальная задержка
3. ✅ Низкая нагрузка на сервер
4. ✅ Подходит для малых групп (2-10 человек)
5. ✅ Лучшая приватность
6. ✅ Экономия ресурсов

**Переходите на SFU только если:**
- Нужно 10+ участников в комнате
- Требуется запись сессий
- Нужна модерация контента
- Большая нагрузка на сервер

---

## 📝 Следующие шаги

1. ✅ Дизайн интегрирован
2. ⏳ Создать WebRTC сервис
3. ⏳ Интегрировать WebRTC с VoiceView
4. ⏳ Обновить WebSocket сервис
5. ⏳ Тестирование голосовой связи
6. ⏳ Тестирование видео
7. ⏳ Тестирование расшаривания экрана
8. ⏳ Оптимизация производительности

---

**Готово к интеграции!** 🚀
