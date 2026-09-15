import React from 'react';
import { Server } from '../types';

interface ServerSidebarProps {
  servers: Server[];
  activeServer: string;
  onSelectServer: (id: string) => void;
}

const ServerSidebar: React.FC<ServerSidebarProps> = ({ servers, activeServer, onSelectServer }) => {
  return (
    <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 gap-2 overflow-y-auto">
      {/* Home button */}
      <button className="w-12 h-12 rounded-2xl bg-[#5865f2] flex items-center justify-center text-white hover:rounded-xl transition-all duration-200 hover:bg-[#4752c4]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.73 4.87l-15.46 6.27a.5.5 0 00.01.94l5.27 1.66 1.96 5.53a.5.5 0 00.93.05l2.41-4.82 5.37 1.69a.5.5 0 00.62-.66L19.73 4.87a.5.5 0 00-.63-.35l.63.35z"/>
        </svg>
      </button>
      
      <div className="w-8 h-[2px] bg-[#35363c] rounded-full my-1"></div>
      
      {/* Server icons */}
      {servers.map((server) => (
        <div key={server.id} className="relative group">
          {/* Active indicator */}
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 rounded-r-full bg-white transition-all duration-200 ${
            activeServer === server.id ? 'h-10' : 'h-0 group-hover:h-5'
          }`}></div>
          
          <button
            onClick={() => onSelectServer(server.id)}
            className={`w-12 h-12 flex items-center justify-center text-xl transition-all duration-200 ${
              activeServer === server.id 
                ? 'rounded-xl bg-[#5865f2]' 
                : 'rounded-3xl bg-[#313338] hover:rounded-xl hover:bg-[#5865f2]'
            }`}
            title={server.name}
          >
            {server.icon}
          </button>
        </div>
      ))}
      
      {/* Add server button */}
      <button className="w-12 h-12 rounded-3xl bg-[#313338] flex items-center justify-center text-[#23a559] hover:rounded-xl hover:bg-[#23a559] hover:text-white transition-all duration-200">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
        </svg>
      </button>
    </div>
  );
};

export default ServerSidebar;
