import React, { useState, useEffect } from 'react';
import { AuthPage } from './components/min/AuthPage';
import { TopBar } from './components/min/TopBar';
import { ViewTabs } from './components/min/ViewTabs';
import { ChatView } from './components/min/ChatView';
import { VoiceView } from './components/min/VoiceView';
import { ProfileView } from './components/min/ProfileView';
import { Modal } from './components/min/Modal';
import { authService } from './services/auth';
import './styles/min.css';

// Импортируем шрифт
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [currentView, setCurrentView] = useState<'chats' | 'voice' | 'profile'>('chats');
  const [modalType, setModalType] = useState<'chat' | 'channel' | null>(null);
  
  // Состояния для чатов
  const [chats, setChats] = useState([
    { id: '1', name: 'AnnaEoglain', lastMessage: 'Сообщение которое' },
    { id: '2', name: 'AnnaEoglain', lastMessage: 'Сообщение которое' },
    { id: '3', name: 'AnnaEoglain', lastMessage: 'Сообщение которое' },
    { id: '4', name: 'AnnaEoglain', lastMessage: 'Сообщение которое' },
  ]);
  const [activeChatId, setActiveChatId] = useState<string | null>('1');
  
  // Состояния для голосовых чатов
  const [servers, setServers] = useState([
    {
      id: '1',
      name: 'Сервер 1',
      availableSlots: 2,
      totalSlots: 5,
      rooms: [
        {
          id: 'r1',
          name: 'Комната 1',
          participants: [
            { id: 'p1', name: 'JDie-', isMuted: false },
            { id: 'p2', name: 'Илюша', isMuted: true }
          ]
        },
        { id: 'r2', name: 'Комната 2', participants: [] },
        { id: 'r3', name: 'Комната 3', participants: [] }
      ]
    },
    {
      id: '2',
      name: 'Сервер 2',
      availableSlots: 0,
      totalSlots: 5,
      rooms: []
    },
    {
      id: '3',
      name: 'Сервер 3',
      availableSlots: 0,
      totalSlots: 5,
      rooms: []
    },
    {
      id: '4',
      name: 'Сервер 4',
      availableSlots: 0,
      totalSlots: 5,
      rooms: []
    }
  ]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  
  // Состояния для голосовых контролов
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // Пользователь
  const [user, setUser] = useState({
    username: 'профиль 1',
    nickname: 'никнейм',
    email: 'anna@min.me',
    status: 'в сети'
  });

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
    setIsAuthenticated(false);
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
    } else if (modalType === 'channel') {
      // Добавить канал в первый сервер
      const updatedServers = [...servers];
      updatedServers[0].rooms.push({
        id: Date.now().toString(),
        name: data.name,
        participants: []
      });
      setServers(updatedServers);
    }
  };

  // Обработчики для голосовых чатов
  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleToggleCamera = () => {
    setIsCameraOn(!isCameraOn);
  };

  const handleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
  };

  const handleLeaveRoom = () => {
    setActiveRoomId(null);
    setIsMuted(false);
    setIsCameraOn(false);
    setIsScreenSharing(false);
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
          onRoomSelect={setActiveRoomId}
          onCreateChannel={() => setModalType('channel')}
          onToggleMute={handleToggleMute}
          onToggleCamera={handleToggleCamera}
          onScreenShare={handleScreenShare}
          onLeave={handleLeaveRoom}
          isMuted={isMuted}
          isCameraOn={isCameraOn}
          isScreenSharing={isScreenSharing}
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
