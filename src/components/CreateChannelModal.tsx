import React, { useState } from 'react';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelType: 'text' | 'voice';
  onCreate: (name: string, type: 'text' | 'voice') => void;
}

const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  channelType,
  onCreate,
}) => {
  const [channelName, setChannelName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!channelName.trim()) {
      setError('Введите название канала');
      return;
    }

    if (channelName.trim().length < 2) {
      setError('Название должно содержать минимум 2 символа');
      return;
    }

    if (channelName.trim().length > 50) {
      setError('Название не должно превышать 50 символов');
      return;
    }

    onCreate(channelName.trim(), channelType);
    setChannelName('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setChannelName('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#313338] rounded-lg w-[440px] shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1f2023]">
          <h2 className="text-xl font-bold text-white">
            Создать {channelType === 'text' ? 'текстовый' : 'голосовой'} канал
          </h2>
          <p className="text-sm text-[#b5bac1] mt-1">
            в {channelType === 'text' ? 'текстовых' : 'голосовых'} каналах
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
              Название канала
            </label>
            <div className="flex items-center bg-[#1e1f22] rounded px-3 py-2 border border-[#1e1f22] focus-within:border-[#5865f2]">
              <span className="text-[#80848e] mr-2">
                {channelType === 'text' ? '#' : '🔊'}
              </span>
              <input
                type="text"
                value={channelName}
                onChange={(e) => {
                  setChannelName(e.target.value);
                  setError('');
                }}
                placeholder={channelType === 'text' ? 'новый-канал' : 'Новый канал'}
                className="flex-1 bg-transparent text-[#dbdee1] outline-none"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-[#ed4245] text-xs mt-2">{error}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-[#b5bac1] hover:text-white transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-4 py-2 rounded font-medium transition-colors"
            >
              Создать канал
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChannelModal;
