export interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  isMuted?: boolean;
  isDeafened?: boolean;
  isStreaming?: boolean;
}

export interface VoiceChannel {
  id: string;
  name: string;
  type: 'voice' | 'stage';
  users: User[];
  bitrate: number;
  userLimit?: number;
}

export interface TextChannel {
  id: string;
  name: string;
  messages: Message[];
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system';
}

export interface Server {
  id: string;
  name: string;
  icon: string;
  voiceChannels: VoiceChannel[];
  textChannels: TextChannel[];
}

export interface StreamInfo {
  isActive: boolean;
  streamType: 'screen' | 'window' | 'application';
  viewerCount: number;
}
