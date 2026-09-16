import React, { useState, useRef, useEffect } from 'react';
import { TextChannel, Message } from '../types';

interface ChatProps {
  channel: TextChannel;
  onSendMessage: (content: string) => void;
}

const Chat: React.FC<ChatProps> = ({ channel, onSendMessage }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channel.messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Сегодня';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#313338] h-full">
      {/* Channel header */}
      <div className="h-12 px-4 flex items-center border-b border-[#1f2023] shadow-sm">
        <span className="text-[#80848e] mr-1.5">#</span>
        <h3 className="font-semibold text-white">{channel.name}</h3>
        <div className="ml-4 pl-4 border-l border-[#3f4147]">
          <span className="text-sm text-[#949ba4]">Канал для общения</span>
        </div>
        <div className="ml-auto flex items-center gap-3 text-[#b5bac1]">
          <button className="hover:text-[#dbdee1] transition-colors" title="Поиск">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.707 20.293l-5.4-5.4A7.92 7.92 0 0018 10c0-4.41-3.59-8-8-8s-8 3.59-8 8 3.59 8 8 8c1.85 0 3.55-.63 4.89-1.69l5.4 5.4a1 1 0 001.41-1.41zM10 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
            </svg>
          </button>
          <button className="hover:text-[#dbdee1] transition-colors" title="Закреплённые">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 12l-10 10-1.41-1.41L18.17 13H2v-2h16.17l-7.58-7.59L12 2l10 10z"/>
            </svg>
          </button>
          <button className="hover:text-[#dbdee1] transition-colors" title="Участники">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {channel.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">#</div>
            <h3 className="text-2xl font-bold text-white mb-2">Добро пожаловать в #{channel.name}!</h3>
            <p className="text-[#949ba4]">Это начало канала #{channel.name}.</p>
          </div>
        )}
        
        {channel.messages.map((msg, index) => {
          const showDate = index === 0 || 
            new Date(channel.messages[index - 1].timestamp).toDateString() !== new Date(msg.timestamp).toDateString();
          
          return (
            <React.Fragment key={msg.id}>
              {showDate && (
                <div className="flex items-center my-4">
                  <div className="flex-1 h-px bg-[#3f4147]"></div>
                  <span className="px-3 text-xs text-[#949ba4]">{formatDate(msg.timestamp)}</span>
                  <div className="flex-1 h-px bg-[#3f4147]"></div>
                </div>
              )}
              <div className="flex group hover:bg-[#2e3035] rounded p-1 -mx-1">
                <div className="w-10 h-10 rounded-full bg-[#5865f2] flex items-center justify-center text-lg flex-shrink-0">
                  {msg.userId === 'user-1' ? '🎮' : '👤'}
                </div>
                <div className="ml-3 min-w-0">
                  <div className="flex items-baseline">
                    <span className="font-medium text-white hover:underline cursor-pointer">
                      {msg.userName}
                    </span>
                    <span className="ml-2 text-xs text-[#949ba4]">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-[#dbdee1] text-sm leading-relaxed break-words">{msg.content}</p>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={handleSubmit} className="px-4 pb-6">
        <div className="bg-[#383a40] rounded-lg flex items-center px-4">
          <button type="button" className="text-[#b5bac1] hover:text-[#dbdee1] transition-colors mr-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Написать в #${channel.name}`}
            className="flex-1 bg-transparent py-3 text-[#dbdee1] placeholder-[#6d6f78] outline-none text-sm"
          />
          <div className="flex items-center gap-2 text-[#b5bac1]">
            <button type="button" className="hover:text-[#dbdee1] transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 12c0 1.1.9 2 2 2h2v2c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-2h2c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-2V4c0-1.1-.9-2-2-2H8C6.9 2 6 2.9 6 4v2H4c-1.1 0-2 .9-2 2v4zm6-8h8v10H8V4z"/>
              </svg>
            </button>
            <button type="button" className="hover:text-[#dbdee1] transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-6c.78 2.34 2.72 4 5 4s4.22-1.66 5-4H7zm1-2h2.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5H7.5c-.28 0-.5.22-.5.5s.22.5.5.5zM14 11.5c0 .28.22.5.5.5H17c.28 0 .5-.22.5-.5s-.22-.5-.5-.5h-2.5c-.28 0-.5.22-.5.5z"/>
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Chat;
