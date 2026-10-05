import React from 'react';

interface TopBarProps {
  username: string;
  nickname: string;
  onProfileClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ username, nickname, onProfileClick }) => {
  return (
    <header className="topbar">
      <div className="logo">MIN</div>
      <nav>
        <a href="#">о нас</a>
        <a href="#">настройки</a>
      </nav>
      <button className="profile-chip" onClick={onProfileClick}>
        <span>
          {username}
          <br />
          #{nickname}
        </span>
        <span className="avatar a34"></span>
      </button>
    </header>
  );
};
