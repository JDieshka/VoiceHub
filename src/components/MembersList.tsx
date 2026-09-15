import React from 'react';
import { User } from '../types';
import { mockUsers } from '../store';

const MembersList: React.FC = () => {
  const onlineUsers = mockUsers.filter(u => u.status !== 'offline');
  const offlineUsers = mockUsers.filter(u => u.status === 'offline');

  return (
    <div className="w-60 bg-[#2b2d31] border-l border-[#1f2023] flex flex-col h-full overflow-y-auto">
      {/* Online */}
      <div className="px-4 pt-6 pb-2">
        <h4 className="text-xs font-semibold text-[#949ba4] uppercase tracking-wide">
          В сети — {onlineUsers.length}
        </h4>
      </div>
      <div className="px-2 space-y-0.5">
        {onlineUsers.map((user) => (
          <UserItem key={user.id} user={user} />
        ))}
      </div>

      {/* Offline */}
      {offlineUsers.length > 0 && (
        <>
          <div className="px-4 pt-6 pb-2">
            <h4 className="text-xs font-semibold text-[#949ba4] uppercase tracking-wide">
              Не в сети — {offlineUsers.length}
            </h4>
          </div>
          <div className="px-2 space-y-0.5 pb-4">
            {offlineUsers.map((user) => (
              <UserItem key={user.id} user={user} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

interface UserItemProps {
  user: User;
}

const UserItem: React.FC<UserItemProps> = ({ user }) => {
  const isOffline = user.status === 'offline';

  return (
    <div className={`flex items-center px-2 py-1.5 rounded cursor-pointer hover:bg-[#35373c] transition-colors ${
      isOffline ? 'opacity-40' : ''
    }`}>
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-lg">
          {user.avatar}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2b2d31] ${
          user.status === 'online' ? 'bg-[#23a559]' :
          user.status === 'idle' ? 'bg-[#f0b232]' :
          user.status === 'dnd' ? 'bg-[#ed4245]' : 'bg-[#80848e]'
        }`}></div>
      </div>
      <div className="ml-2 min-w-0">
        <div className="text-sm text-[#dbdee1] truncate font-medium">{user.name}</div>
        <div className="text-xs text-[#949ba4] truncate">
          {user.status === 'online' ? 'В сети' :
           user.status === 'idle' ? 'Не активен' :
           user.status === 'dnd' ? 'Не беспокоить' : 'Не в сети'}
        </div>
      </div>
    </div>
  );
};

export default MembersList;
