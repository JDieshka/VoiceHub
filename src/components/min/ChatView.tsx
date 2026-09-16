import React, { useState } from 'react';

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  avatar?: string;
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
            <>
              <div className="msg">
                <span className="avatar a26"></span>
                <div className="bubble">Привет!<br/>Как дела?</div>
              </div>
              <div className="msg out">
                <div className="bubble">)))</div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', fontSize: '10px' }}>
              Выберите чат для начала общения
            </div>
          )}
        </div>
        <div className="chat-input">
          <input type="text" placeholder="..." disabled={!activeChatId} />
          <button className="icon-btn" title="файлы">
            <svg className="ic" viewBox="0 0 24 24">
              <path d="M3 7h6l2 2h10v10H3z"/>
            </svg>
          </button>
          <button className="icon-btn" title="оформление">
            <svg className="ic" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"/>
              <circle className="dot" cx="9" cy="9" r="1.4"/>
              <circle className="dot" cx="14" cy="8" r="1.4"/>
              <circle className="dot" cx="16" cy="12" r="1.4"/>
            </svg>
          </button>
        </div>
      </main>
    </div>
  );
};
