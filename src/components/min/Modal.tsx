import React, { useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'chat' | 'channel';
  onSubmit: (data: any) => void;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, type, onSubmit }) => {
  const [channelType, setChannelType] = useState<'text' | 'voice'>('text');
  const [limit, setLimit] = useState('5 / 5');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('name') as string;
    
    if (type === 'chat') {
      onSubmit({ name, type: 'chat' });
    } else {
      onSubmit({ 
        name, 
        type: channelType,
        limit: parseInt(limit.split('/')[0].trim())
      });
    }
    onClose();
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>{type === 'chat' ? 'НОВЫЙ ЧАТ' : 'СОЗДАТЬ КАНАЛ'}</h3>
          <button className="icon-btn" onClick={onClose}>
            <svg className="ic" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>{type === 'chat' ? 'никнейм друга' : 'название канала'}</label>
          <input className="field" type="text" name="name" required />
          
          {type === 'channel' && (
            <>
              <label>тип канала</label>
              <div className="pills">
                <button 
                  type="button"
                  className={`pill mint ${channelType === 'text' ? 'active' : ''}`}
                  onClick={() => setChannelType('text')}
                >
                  текстовый
                </button>
                <button 
                  type="button"
                  className={`pill purple ${channelType === 'voice' ? 'active' : ''}`}
                  onClick={() => setChannelType('voice')}
                >
                  голосовой
                </button>
              </div>
              <label>лимит участников</label>
              <select 
                className="field" 
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              >
                <option>2 / 5</option>
                <option>3 / 5</option>
                <option>4 / 5</option>
                <option selected>5 / 5</option>
              </select>
            </>
          )}
          
          <div className="modal-actions">
            <button className="btn pink" type="submit">
              {type === 'chat' ? 'Добавить' : 'Создать'}
            </button>
            <button className="btn gray" type="button" onClick={onClose}>
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
