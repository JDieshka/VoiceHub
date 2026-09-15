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

export const mockUsers: User[] = [];

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
        users: [],
        bitrate: 64000,
      },
      {
        id: 'vc-2',
        name: 'Игровая комната',
        type: 'voice',
        users: [],
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
        messages: [],
      },
      {
        id: 'tc-2',
        name: 'мемы',
        messages: [],
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
        users: [],
        bitrate: 96000,
      },
      {
        id: 'vc-6',
        name: 'Код-ревью',
        type: 'voice',
        users: [],
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
        users: [],
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
