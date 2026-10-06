import React, { useState, useEffect } from 'react';
import { ServerSelectionPage } from './components/min/ServerSelectionPage';
import { AuthPage } from './components/min/AuthPage';
import { TopBar } from './components/min/TopBar';
import { ViewTabs } from './components/min/ViewTabs';
import { ChatView } from './components/min/ChatView';
import { VoiceView } from './components/min/VoiceView';
import { ProfileView } from './components/min/ProfileView';
import { Modal } from './components/min/Modal';
import { authService, setServerUrl, getServerUrl } from './services/auth';
import { websocketService, setWebSocketUrl } from './services/websocket';
import { apiService } from './services/api';
import './styles/min.css';

// Импортируем шрифт
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

function App() {
  // Состояние выбора сервера
  const [serverUrl, setServerUrlState] = useState<string>(() => {
    return localStorage.getItem('voicehub-server-url') || '';
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [currentView, setCurrentView] = useState<'chats' | 'voice' | 'profile'>('chats');
  const [modalType, setModalType] = useState<'chat' | 'channel' | 'server' | null>(null);
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  
  // Состояния для чатов
  const [chats, setChats] = useState<Array<{ id: string; name: string; lastMessage: string }>>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  // Состояния для голосовых чатов
  const [servers, setServers] = useState<Array<{
    id: string;
    name: string;
    availableSlots: number;
    totalSlots: number;
    rooms: Array<{
      id: string;
      name: string;
      participants: Array<{ id: string; name: string; isMuted: boolean }>;
    }>;
  }>>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  
  // Пользователь
  const [user, setUser] = useState({
    username: '',
    nickname: '',
    email: '',
    status: 'offline'
  });

  // Функция загрузки серверов с сервера
  const loadServers = async () => {
    try {
      console.log('[App] Loading servers...');
      const serversData = await apiService.getServers();
      console.log('[App] Servers loaded:', serversData);
      
      // Преобразуем данные серверов в формат для UI
      const formattedServers = serversData.map((server: any) => ({
        id: server.id,
        name: server.name,
        availableSlots: 5, // TODO: Получить реальное значение
        totalSlots: 5,
        rooms: server.rooms || []
      }));
      
      setServers(formattedServers);
    } catch (error) {
      console.error('[App] Failed to load servers:', error);
    }
  };

  // Функция загрузки чатов с сервера
  const loadChats = async () => {
    try {
      console.log('[App] Loading chats...');
      const chatsData = await apiService.getChats();
      console.log('[App] Chats loaded:', chatsData);
      
      // Преобразуем данные чатов в формат для UI
      const formattedChats = chatsData.map((chat: any) => ({
        id: chat.id,
        name: chat.name,
        lastMessage: chat.lastMessage || ''
      }));
      
      setChats(formattedChats);
    } catch (error) {
      console.error('[App] Failed to load chats:', error);
    }
  };

  // Загрузка пользователя и данных при аутентификации
  useEffect(() => {
    if (isAuthenticated) {
      const currentUser = authService.getUser();
      if (currentUser) {
        setUserId(currentUser.id || 'user-' + Date.now());
        setUserName(currentUser.username || currentUser.email || 'User');
        
        // Обновляем данные профиля реальными данными из БД
        setUser({
          username: currentUser.username || 'Пользователь',
          nickname: currentUser.username || 'user',
          email: currentUser.email || '',
          status: currentUser.status || 'online'
        });
        
        // Загружаем данные с сервера
        loadServers();
        loadChats();
        
        // Подключаемся к WebSocket
        if (!websocketService.isConnected()) {
          websocketService.connect(currentUser.id, currentUser.username);
        }
      }
    }
  }, [isAuthenticated]);

  // WebSocket listeners для синхронизации в реальном времени
  useEffect(() => {
    if (!isAuthenticated) return;

    // Обработчик создания сервера
    const handleServerCreated = (server: any) => {
      console.log('[App] Server created via WebSocket:', server);
      setServers(prev => [...prev, {
        id: server.id,
        name: server.name,
        availableSlots: 5,
        totalSlots: 5,
        rooms: server.rooms || []
      }]);
    };

    // Обработчик создания комнаты
    const handleRoomCreated = (room: any) => {
      console.log('[App] Room created via WebSocket:', room);
      setServers(prev => prev.map(s => 
        s.id === room.serverId 
          ? { ...s, rooms: [...s.rooms, room] }
          : s
      ));
    };

    // Обработчик создания чата
    const handleChatCreated = (chat: any) => {
      console.log('[App] Chat created via WebSocket:', chat);
      setChats(prev => [...prev, {
        id: chat.id,
        name: chat.name,
        lastMessage: chat.lastMessage || ''
      }]);
    };

    // Обработчик нового сообщения
    const handleChatMessage = (message: any) => {
      console.log('[App] Chat message received via WebSocket:', message);
      // TODO: Обновить сообщения в чате
    };

    // Подписываемся на события
    websocketService.on('server-created', handleServerCreated);
    websocketService.on('room-created', handleRoomCreated);
    websocketService.on('chat-created', handleChatCreated);
    websocketService.on('chat-message', handleChatMessage);

    // Отписываемся при размонтировании
    return () => {
      websocketService.off('server-created', handleServerCreated);
      websocketService.off('room-created', handleRoomCreated);
      websocketService.off('chat-created', handleChatCreated);
      websocketService.off('chat-message', handleChatMessage);
    };
  }, [isAuthenticated]);

  // Обработчик выбора сервера
  const handleServerSelect = (url: string) => {
    // Сохраняем URL сервера
    localStorage.setItem('voicehub-server-url', url);
    setServerUrlState(url);
    
    // Устанавливаем URL в сервисах
    setServerUrl(url);
    setWebSocketUrl(url);
    
    console.log('[App] Server selected:', url);
  };

  // Обработчик смены сервера
  const handleChangeServer = () => {
    // Выходим из аккаунта
    authService.logout();
    websocketService.disconnect();
    
    // Очищаем URL сервера
    localStorage.removeItem('voicehub-server-url');
    setServerUrlState('');
    setIsAuthenticated(false);
    setActiveRoomId(null);
    
    console.log('[App] Server changed, returning to server selection');
  };

  // Обработчики аутентификации
  const handleLogin = async (username: string, password: string) => {
    try {
      await authService.login({ email: username, password });
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
      alert('Ошибка входа. Проверьте данные.');
    }
  };

  const handleRegister = async (username: string, email: string, password: string) => {
    try {
      await authService.register({ username, email, password });
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Ошибка регистрации.');
    }
  };

  const handleLogout = () => {
    authService.logout();
    websocketService.disconnect();
    setIsAuthenticated(false);
  };

  // Обработчики для чатов
  const handleAddChat = () => {
    setModalType('chat');
  };

  const handleModalSubmit = async (data: any) => {
    try {
      if (modalType === 'chat') {
        console.log('[App] Creating chat:', data.name);
        // Отправляем на сервер
        const newChat = await apiService.createChat(data.name);
        console.log('[App] Chat created:', newChat);
        
        // Добавляем в локальное состояние
        setChats([...chats, {
          id: newChat.id,
          name: newChat.name,
          lastMessage: ''
        }]);
        
        // Уведомляем других через WebSocket
        websocketService.send({
          type: 'chat-created',
          payload: newChat
        });
        
      } else if (modalType === 'server') {
        console.log('[App] Creating server:', data.name);
        // Отправляем на сервер
        const newServer = await apiService.createServer(data.name, data.icon || '🎮');
        console.log('[App] Server created:', newServer);
        
        // Добавляем в локальное состояние
        setServers([...servers, {
          id: newServer.id,
          name: newServer.name,
          availableSlots: 5,
          totalSlots: 5,
          rooms: []
        }]);
        
        // Уведомляем других через WebSocket
        websocketService.send({
          type: 'server-created',
          payload: newServer
        });
        
      } else if (modalType === 'channel') {
        // Добавить комнату в первый сервер
        if (servers.length > 0) {
          const serverId = servers[0].id;
          console.log('[App] Creating room:', data.name, 'in server:', serverId);
          
          // Отправляем на сервер
          const newRoom = await apiService.createRoom(serverId, data.name, data.type || 'voice');
          console.log('[App] Room created:', newRoom);
          
          // Добавляем в локальное состояние
          const updatedServers = [...servers];
          const serverIndex = updatedServers.findIndex(s => s.id === serverId);
          if (serverIndex !== -1) {
            updatedServers[serverIndex].rooms.push({
              id: newRoom.id,
              name: newRoom.name,
              participants: []
            });
            setServers(updatedServers);
          }
          
          // Уведомляем других через WebSocket
          websocketService.send({
            type: 'room-created',
            payload: { ...newRoom, serverId }
          });
        }
      }
      
      // Закрываем модальное окно
      setModalType(null);
      
    } catch (error) {
      console.error('[App] Failed to create:', error);
      alert('Ошибка создания. Проверьте подключение к серверу.');
    }
  };

  // Обработчики для голосовых чатов
  const handleRoomSelect = (roomId: string) => {
    setActiveRoomId(roomId);
  };

  const handleLeaveRoom = () => {
    setActiveRoomId(null);
  };

  // Если сервер не выбран - показываем страницу выбора сервера
  if (!serverUrl) {
    return (
      <ServerSelectionPage 
        onServerSelect={handleServerSelect}
        lastServerUrl={localStorage.getItem('voicehub-server-url') || undefined}
      />
    );
  }

  // Если не авторизован - показываем страницу авторизации
  if (!isAuthenticated) {
    return <AuthPage onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <section className="app">
      <TopBar 
        username={user.username}
        nickname={user.nickname}
        onProfileClick={() => setCurrentView('profile')}
      />
      
      {currentView !== 'profile' && (
        <ViewTabs 
          activeView={currentView}
          onViewChange={(view) => setCurrentView(view)}
        />
      )}

      {currentView === 'chats' && (
        <ChatView 
          chats={chats}
          activeChatId={activeChatId}
          onChatSelect={setActiveChatId}
          onAddChat={handleAddChat}
        />
      )}

      {currentView === 'voice' && (
        <VoiceView 
          servers={servers}
          activeRoomId={activeRoomId}
          onRoomSelect={handleRoomSelect}
          onCreateChannel={() => setModalType('channel')}
          onCreateServer={() => setModalType('server')}
          onLeave={handleLeaveRoom}
          userId={userId}
          userName={userName}
        />
      )}

      {currentView === 'profile' && (
        <ProfileView 
          username={user.username}
          nickname={user.nickname}
          email={user.email}
          status={user.status}
          serverUrl={serverUrl}
          onEdit={() => console.log('Edit profile')}
          onLogout={handleLogout}
          onChangeServer={handleChangeServer}
          onChangePassword={() => console.log('Change password')}
        />
      )}

      {modalType && (
        <Modal 
          isOpen={true}
          onClose={() => setModalType(null)}
          type={modalType}
          onSubmit={handleModalSubmit}
        />
      )}
    </section>
  );
}

export default App;
