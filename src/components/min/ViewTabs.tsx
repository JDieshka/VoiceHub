import React from 'react';

interface ViewTabsProps {
  activeView: 'chats' | 'voice';
  onViewChange: (view: 'chats' | 'voice') => void;
}

export const ViewTabs: React.FC<ViewTabsProps> = ({ activeView, onViewChange }) => {
  return (
    <div className="view-tabs">
      <button 
        className={`view-tab mint ${activeView === 'chats' ? 'active' : ''}`}
        onClick={() => onViewChange('chats')}
      >
        ЧАТЫ
      </button>
      <button 
        className={`view-tab purple ${activeView === 'voice' ? 'active' : ''}`}
        onClick={() => onViewChange('voice')}
      >
        ГОЛОСОВЫЕ ЧАТЫ
      </button>
    </div>
  );
};
