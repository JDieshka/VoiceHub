import React, { useState, useEffect } from 'react';
import { authService } from '../services/auth';

interface AuthPageProps {
  onAuthenticated: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('🎮');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null);

  const avatars = ['🎮', '🦊', '🌸', '🎸', '🎨', '🚀', '🌟', '🎯', '🎵', '💻'];

  // Проверка доступности сервера при загрузке
  useEffect(() => {
    const checkServer = async () => {
      const available = await authService.checkServerAvailability();
      setServerAvailable(available);
    };
    checkServer();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Проверяем доступность сервера перед отправкой
      const available = await authService.checkServerAvailability();
      if (!available) {
        setError('Сервер недоступен. Проверьте подключение к интернету или обратитесь к администратору.');
        setLoading(false);
        return;
      }

      if (isLogin) {
        await authService.login({ email, password });
      } else {
        await authService.register({ username, email, password, avatar });
      }
      onAuthenticated();
    } catch (err: any) {
      console.error('[AuthPage] Error:', err);
      
      // Более понятные сообщения об ошибках
      if (err.message.includes('Не удалось подключиться')) {
        setError(err.message);
      } else if (err.message.includes('User already exists')) {
        setError('Пользователь с таким email уже существует');
      } else if (err.message.includes('Invalid credentials')) {
        setError('Неверный email или пароль');
      } else if (err.message.includes('fetch')) {
        setError('Не удалось подключиться к серверу. Проверьте подключение к интернету.');
      } else {
        setError(err.message || 'Произошла ошибка. Попробуйте еще раз.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#5865f2]">
      <div className="bg-[#313338] rounded-lg shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">VoiceHub</h1>
          <p className="text-[#b5bac1]">
            {isLogin ? 'Добро пожаловать!' : 'Создать аккаунт'}
          </p>
          {serverAvailable !== null && (
            <div className={`mt-2 text-xs flex items-center justify-center gap-1 ${
              serverAvailable ? 'text-[#23a559]' : 'text-[#ed4245]'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                serverAvailable ? 'bg-[#23a559]' : 'bg-[#ed4245]'
              }`}></div>
              {serverAvailable ? 'Сервер доступен' : 'Сервер недоступен'}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                  Имя пользователя
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={50}
                  className="w-full bg-[#1e1f22] text-[#dbdee1] rounded px-3 py-2.5 border border-[#1e1f22] focus:border-[#5865f2] outline-none transition-colors"
                  placeholder="Введите имя пользователя"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                  Аватар
                </label>
                <div className="flex gap-2 flex-wrap">
                  {avatars.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAvatar(a)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                        avatar === a
                          ? 'bg-[#5865f2] ring-2 ring-white'
                          : 'bg-[#1e1f22] hover:bg-[#2b2d31]'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#1e1f22] text-[#dbdee1] rounded px-3 py-2.5 border border-[#1e1f22] focus:border-[#5865f2] outline-none transition-colors"
              placeholder="Введите email"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-[#1e1f22] text-[#dbdee1] rounded px-3 py-2.5 border border-[#1e1f22] focus:border-[#5865f2] outline-none transition-colors"
              placeholder="Введите пароль"
            />
          </div>

          {error && (
            <div className="bg-[#ed4245]/10 border border-[#ed4245] rounded p-3 text-sm text-[#ed4245]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || serverAvailable === false}
            className="w-full bg-[#5865f2] hover:bg-[#4752c4] disabled:bg-[#4752c4] text-white rounded py-2.5 font-medium transition-colors"
          >
            {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <span className="text-[#b5bac1] text-sm">
            {isLogin ? "Нет аккаунта? " : 'Уже есть аккаунт? '}
          </span>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-[#00a8fc] hover:underline text-sm font-medium"
          >
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
