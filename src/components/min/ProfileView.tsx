import React from 'react';

interface ProfileViewProps {
  username: string;
  nickname: string;
  email: string;
  status: string;
  onEdit: () => void;
  onLogout: () => void;
  onChangePassword: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  username,
  nickname,
  email,
  status,
  onEdit,
  onLogout,
  onChangePassword
}) => {
  return (
    <div className="view" id="view-profile">
      <div className="profile-wrap">
        <div className="profile-card">
          <span className="avatar a120"></span>
          <h2>{username}</h2>
          <div className="nick">#{nickname}</div>
          <div className="prow">
            <span>никнейм</span>
            <b>{nickname}</b>
          </div>
          <div className="prow">
            <span>email</span>
            <b>{email}</b>
          </div>
          <div className="prow">
            <span>пароль</span>
            <button className="btn gray" onClick={onChangePassword}>изменить</button>
          </div>
          <div className="prow">
            <span>статус</span>
            <b>{status}</b>
          </div>
          <div className="profile-actions">
            <button className="btn pink" onClick={onEdit}>редактировать</button>
            <button className="btn gray" onClick={onLogout}>выйти</button>
          </div>
        </div>
      </div>
    </div>
  );
};
