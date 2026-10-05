/**
 * API Service для работы с сервером VoiceHub
 * Синхронизация данных между клиентами
 */

import { authService } from './auth';
import { getServerUrl } from './auth';

// Типы данных
export interface Server {
  id: string;
  name: string;
  icon: string;
  ownerId: string;
  createdAt: string;
  rooms?: Room[];
}

export interface Room {
  id: string;
  serverId: string;
  name: string;
  type: 'text' | 'voice';
  createdAt: string;
  participants?: Participant[];
}

export interface Participant {
  id: string;
  name: string;
  isMuted: boolean;
}

export interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  userId: string;
  content: string;
  createdAt: string;
}

class ApiService {
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders()
    };
  }

  // ========== СЕРВЕРЫ ==========

  /**
   * Создать новый сервер
   */
  async createServer(name: string, icon: string = '🎮'): Promise<Server> {
    console.log('[API] Creating server:', name);
    
    const response = await fetch(`${getServerUrl()}/api/servers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, icon })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create server: ${error}`);
    }

    const server = await response.json();
    console.log('[API] Server created:', server);
    return server;
  }

  /**
   * Получить список серверов пользователя
   */
  async getServers(): Promise<Server[]> {
    console.log('[API] Fetching servers...');
    
    const response = await fetch(`${getServerUrl()}/api/servers/list`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch servers: ${error}`);
    }

    const servers = await response.json();
    console.log('[API] Servers loaded:', servers);
    return servers || [];
  }

  /**
   * Получить сервер с комнатами
   */
  async getServer(serverId: string): Promise<Server> {
    console.log('[API] Fetching server:', serverId);
    
    const response = await fetch(`${getServerUrl()}/api/servers/get?id=${serverId}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch server: ${error}`);
    }

    const server = await response.json();
    console.log('[API] Server loaded:', server);
    return server;
  }

  // ========== КОМНАТЫ ==========

  /**
   * Создать комнату в сервере
   */
  async createRoom(serverId: string, name: string, type: 'text' | 'voice' = 'voice'): Promise<Room> {
    console.log('[API] Creating room:', name, 'in server:', serverId);
    
    const response = await fetch(`${getServerUrl()}/api/servers/${serverId}/rooms`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, type })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create room: ${error}`);
    }

    const room = await response.json();
    console.log('[API] Room created:', room);
    return room;
  }

  /**
   * Получить комнаты сервера
   */
  async getRooms(serverId: string): Promise<Room[]> {
    console.log('[API] Fetching rooms for server:', serverId);
    
    const response = await fetch(`${getServerUrl()}/api/servers/${serverId}/rooms`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch rooms: ${error}`);
    }

    const rooms = await response.json();
    console.log('[API] Rooms loaded:', rooms);
    return rooms || [];
  }

  // ========== ЧАТЫ ==========

  /**
   * Создать новый чат
   */
  async createChat(name: string): Promise<Chat> {
    console.log('[API] Creating chat:', name);
    
    const response = await fetch(`${getServerUrl()}/api/chats`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create chat: ${error}`);
    }

    const chat = await response.json();
    console.log('[API] Chat created:', chat);
    return chat;
  }

  /**
   * Получить список чатов пользователя
   */
  async getChats(): Promise<Chat[]> {
    console.log('[API] Fetching chats...');
    
    const response = await fetch(`${getServerUrl()}/api/chats`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch chats: ${error}`);
    }

    const chats = await response.json();
    console.log('[API] Chats loaded:', chats);
    return chats || [];
  }

  // ========== СООБЩЕНИЯ ==========

  /**
   * Отправить сообщение в чат
   */
  async sendMessage(chatId: string, content: string): Promise<Message> {
    console.log('[API] Sending message to chat:', chatId);
    
    const response = await fetch(`${getServerUrl()}/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ content })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send message: ${error}`);
    }

    const message = await response.json();
    console.log('[API] Message sent:', message);
    return message;
  }

  /**
   * Получить сообщения чата
   */
  async getMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    console.log('[API] Fetching messages for chat:', chatId);
    
    const response = await fetch(
      `${getServerUrl()}/api/chats/${chatId}/messages?limit=${limit}&offset=${offset}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch messages: ${error}`);
    }

    const messages = await response.json();
    console.log('[API] Messages loaded:', messages);
    return messages || [];
  }
}

export const apiService = new ApiService();
export default apiService;
