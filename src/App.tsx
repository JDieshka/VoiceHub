import React, { useState, useEffect } from 'react';
import { AuthPage } from './components/min/AuthPage';
import { TopBar } from './components/min/TopBar';
import { ViewTabs } from './components/min/ViewTabs';
import { ChatView } from './components/min/ChatView';
import { VoiceView } from './components/min/VoiceView';
import { ProfileView } from './components/min/ProfileView';
import { Modal } from './components/min/Modal';
import { authService } from './services/auth';
import { websocketService } from './services/websocket';
import './styles/min.css';

// Импортируем шрифт
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

function App() {
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
    username: 'профиль 1',
    nickname: 'никнейм',
    email: 'anna@min.me',
    status: 'в сети'
  });

  // Загрузка пользователя при аутентификации
  useEffect(() => {
    if (isAuthenticated) {
      const currentUser = authService.getUser();
      if (currentUser) {
        setUserId(currentUser.id || 'user-' + Date.now());
        setUserName(currentUser.username || currentUser.email || 'User');
      }
    }
  }, [isAuthenticated]);

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
    setActiveRoomId(null);
  };

  // Обработчики для чатов
  const handleAddChat = () => {
    setModalType('chat');
  };

  const handleModalSubmit = (data: any) => {
    if (modalType === 'chat') {
      const newChat = {
        id: Date.now().toString(),
        name: data.name,
        lastMessage: ''
      };
      setChats([...chats, newChat]);
    } else if (modalType === 'server') {
      const newServer = {
        id: Date.now().toString(),
        name: data.name,
        availableSlots: 5,
        totalSlots: 5,
        rooms: []
      };
      setServers([...servers, newServer]);
    } else if (modalType === 'channel') {
      // Добавить комнату в первый сервер
      if (servers.length > 0) {
        const updatedServers = [...servers];
        updatedServers[0].rooms.push({
          id: Date.now().toString(),
          name: data.name,
          participants: []
        });
        setServers(updatedServers);
      }
    }
  };

  // Обработчики для голосовых чатов
  const handleRoomSelect = (roomId: string) => {
    setActiveRoomId(roomId);
  };

  const handleLeaveRoom = () => {
    setActiveRoomId(null);
  };

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
          onEdit={() => console.log('Edit profile')}
          onLogout={handleLogout}
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
