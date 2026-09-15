import React, { useState } from 'react';

interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, icon: string) => void;
}

const CreateServerModal: React.FC<CreateServerModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [serverName, setServerName] = useState('');
  const [serverIcon, setServerIcon] = useState('🎮');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const icons = ['🎮', '💼', '🎓', '🎵', '🎬', '🎨', '💻', '🚀', '🌟', '🎯', '📚', '🏆'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!serverName.trim()) {
      setError('Введите название сервера');
      return;
    }

    if (serverName.trim().length < 2) {
      setError('Название должно содержать минимум 2 символа');
      return;
    }

    if (serverName.trim().length > 50) {
      setError('Название не должно превышать 50 символов');
      return;
    }

    onCreate(serverName.trim(), serverIcon);
    setServerName('');
    setServerIcon('🎮');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setServerName('');
    setServerIcon('🎮');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#313338] rounded-lg w-[440px] shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1f2023]">
          <h2 className="text-xl font-bold text-white">Создать сервер</h2>
          <p className="text-sm text-[#b5bac1] mt-1">
            Создайте свой сервер и пригласите друзей
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
              Иконка сервера
            </label>
            <div className="flex gap-2 flex-wrap">
              {icons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setServerIcon(icon)}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-all ${
                    serverIcon === icon
                      ? 'bg-[#5865f2] ring-2 ring-white'
                      : 'bg-[#1e1f22] hover:bg-[#2b2d31]'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
              Название сервера
            </label>
            <input
              type="text"
              value={serverName}
              onChange={(e) => {
                setServerName(e.target.value);
                setError('');
              }}
              placeholder="Мой крутой сервер"
              className="w-full bg-[#1e1f22] text-[#dbdee1] rounded px-3 py-2 border border-[#1e1f22] focus:border-[#5865f2] outline-none"
              autoFocus
            />
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
              Создать сервер
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateServerModal;
