import { Server, User, Message } from './types';

export const currentUser: User = {
  id: 'user-1',
  name: 'Вы',
  avatar: '🎮',
  status: 'online',
  isMuted: false,
  isDeafened: false,
  isStreaming: false,
};

export const mockUsers: User[] = [
  { id: 'user-2', name: 'Алексей', avatar: '🦊', status: 'online' },
  { id: 'user-3', name: 'Мария', avatar: '🌸', status: 'online' },
  { id: 'user-4', name: 'Дмитрий', avatar: '🎸', status: 'idle' },
  { id: 'user-5', name: 'Елена', avatar: '🎨', status: 'dnd' },
  { id: 'user-6', name: 'Игорь', avatar: '🚀', status: 'online' },
  { id: 'user-7', name: 'Анна', avatar: '🌟', status: 'online' },
  { id: 'user-8', name: 'Сергей', avatar: '🎯', status: 'offline' },
];

export const servers: Server[] = [
  {
    id: 'server-1',
    name: 'Игровой сервер',
    icon: '🎮',
    voiceChannels: [
      {
        id: 'vc-1',
        name: 'Общий',
        type: 'voice',
        users: [mockUsers[0], mockUsers[1]],
        bitrate: 64000,
      },
      {
        id: 'vc-2',
        name: 'Игровая комната',
        type: 'voice',
        users: [mockUsers[2], mockUsers[3]],
        bitrate: 96000,
      },
      {
        id: 'vc-3',
        name: 'Музыка',
        type: 'voice',
        users: [],
        bitrate: 128000,
      },
      {
        id: 'vc-4',
        name: 'AFK',
        type: 'voice',
        users: [],
        bitrate: 64000,
      },
    ],
    textChannels: [
      {
        id: 'tc-1',
        name: 'общий-чат',
        messages: [
          { id: 'm1', userId: 'user-2', userName: 'Алексей', content: 'Привет всем! Кто играет сегодня?', timestamp: new Date(Date.now() - 3600000), type: 'text' },
          { id: 'm2', userId: 'user-3', userName: 'Мария', content: 'Я буду онлайн через час 🎮', timestamp: new Date(Date.now() - 3000000), type: 'text' },
          { id: 'm3', userId: 'user-4', userName: 'Дмитрий', content: 'Давайте в кооператив!', timestamp: new Date(Date.now() - 2400000), type: 'text' },
          { id: 'm4', userId: 'user-2', userName: 'Алексей', content: 'Отлично, собираемся в 20:00 в игровой комнате', timestamp: new Date(Date.now() - 1800000), type: 'text' },
          { id: 'm5', userId: 'user-5', userName: 'Елена', content: 'Я тоже хочу! Можно посмотреть трансляцию?', timestamp: new Date(Date.now() - 1200000), type: 'text' },
        ],
      },
      {
        id: 'tc-2',
        name: 'мемы',
        messages: [
          { id: 'm6', userId: 'user-6', userName: 'Игорь', content: 'Посмотрите что нашёл 😂', timestamp: new Date(Date.now() - 7200000), type: 'text' },
          { id: 'm7', userId: 'user-7', userName: 'Анна', content: 'Классика! 🤣', timestamp: new Date(Date.now() - 6000000), type: 'text' },
        ],
      },
    ],
  },
  {
    id: 'server-2',
    name: 'Разработка',
    icon: '💻',
    voiceChannels: [
      {
        id: 'vc-5',
        name: 'Стендап',
        type: 'stage',
        users: [mockUsers[4]],
        bitrate: 96000,
      },
      {
        id: 'vc-6',
        name: 'Код-ревью',
        type: 'voice',
        users: [mockUsers[5]],
        bitrate: 64000,
      },
      {
        id: 'vc-7',
        name: 'Трансляция',
        type: 'stage',
        users: [],
        bitrate: 128000,
      },
    ],
    textChannels: [
      {
        id: 'tc-3',
        name: 'разработка',
        messages: [
          { id: 'm8', userId: 'user-6', userName: 'Игорь', content: 'Кто может глянуть мой PR?', timestamp: new Date(Date.now() - 5400000), type: 'text' },
          { id: 'm9', userId: 'user-7', userName: 'Анна', content: 'Скинь ссылку, посмотрю', timestamp: new Date(Date.now() - 4800000), type: 'text' },
        ],
      },
    ],
  },
  {
    id: 'server-3',
    name: 'Музыка',
    icon: '🎵',
    voiceChannels: [
      {
        id: 'vc-8',
        name: 'Lo-Fi комната',
        type: 'voice',
        users: [],
        bitrate: 128000,
      },
      {
        id: 'vc-9',
        name: 'Джем-сейшн',
        type: 'stage',
        users: [mockUsers[6]],
        bitrate: 128000,
      },
    ],
    textChannels: [
      {
        id: 'tc-4',
        name: 'плейлисты',
        messages: [],
      },
    ],
  },
];

export function generateMessage(content: string): Message {
  return {
    id: `m-${Date.now()}`,
    userId: currentUser.id,
    userName: currentUser.name,
    content,
    timestamp: new Date(),
    type: 'text',
  };
}
