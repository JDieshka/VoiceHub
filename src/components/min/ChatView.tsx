import React, { useState } from 'react';

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  avatar?: string;
}

interface Message {
  id: string;
  text: string;
  isOutgoing: boolean;
  timestamp: Date;
}

interface ChatViewProps {
  chats: Chat[];
  activeChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onAddChat: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ 
  chats, 
  activeChatId, 
  onChatSelect,
  onAddChat 
}) => {
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = () => {
    if (!activeChatId || !inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      isOutgoing: true,
      timestamp: new Date()
    };

    setMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMessage]
    }));

    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="view" id="view-chats">
      <aside className="sidebar mint-side">
        <div className="list">
          {chats.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: '9px', opacity: 0.6 }}>
              Нет чатов. Нажмите "Добавить" чтобы создать новый чат.
            </div>
          ) : (
            chats.map(chat => (
              <div 
                key={chat.id}
                className={`chat-item ${activeChatId === chat.id ? 'active' : ''}`}
                onClick={() => onChatSelect(chat.id)}
              >
                <span className="avatar a34"></span>
                <div>
                  <div className="name">{chat.name}</div>
                  <div className="prev">{chat.lastMessage || 'Нет сообщений'}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <button className="btn pink side-btn" onClick={onAddChat}>
          Добавить
          <svg className="ic" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </aside>

      <main className="chat-area">
        <div className="messages">
          {activeChatId ? (
            messages[activeChatId] && messages[activeChatId].length > 0 ? (
              messages[activeChatId].map(msg => (
                <div key={msg.id} className={`msg ${msg.isOutgoing ? 'out' : ''}`}>
                  {!msg.isOutgoing && <span className="avatar a26"></span>}
                  <div className="bubble">{msg.text}</div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', fontSize: '10px', opacity: 0.6 }}>
                Нет сообщений. Начните общение!
              </div>
            )
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', fontSize: '10px' }}>
              Выберите чат для начала общения
            </div>
          )}
        </div>
        <div className="chat-input">
          <input 
            type="text" 
            placeholder="..." 
            disabled={!activeChatId}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button 
            className="icon-btn" 
            title="отправить"
            onClick={handleSendMessage}
            disabled={!activeChatId || !inputValue.trim()}
          >
            <svg className="ic" viewBox="0 0 24 24">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
            </svg>
          </button>
          <button className="icon-btn" title="файлы">
            <svg className="ic" viewBox="0 0 24 24">
              <path d="M3 7h6l2 2h10v10H3z"/>
            </svg>
          </button>
        </div>
      </main>
    </div>
  );
};
