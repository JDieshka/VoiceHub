import React, { useState } from 'react';
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

  const avatars = ['🎮', '🦊', '🌸', '🎸', '🎨', '🚀', '🌟', '🎯', '🎵', '💻'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await authService.login({ email, password });
      } else {
        await authService.register({ username, email, password, avatar });
      }
      onAuthenticated();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
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
            {isLogin ? 'Welcome back!' : 'Create an account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={50}
                  className="w-full bg-[#1e1f22] text-[#dbdee1] rounded px-3 py-2.5 border border-[#1e1f22] focus:border-[#5865f2] outline-none transition-colors"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                  Avatar
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
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-[#1e1f22] text-[#dbdee1] rounded px-3 py-2.5 border border-[#1e1f22] focus:border-[#5865f2] outline-none transition-colors"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="bg-[#ed4245]/10 border border-[#ed4245] rounded p-3 text-sm text-[#ed4245]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5865f2] hover:bg-[#4752c4] disabled:bg-[#4752c4] text-white rounded py-2.5 font-medium transition-colors"
          >
            {loading ? 'Loading...' : isLogin ? 'Log In' : 'Register'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <span className="text-[#b5bac1] text-sm">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
          </span>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-[#00a8fc] hover:underline text-sm font-medium"
          >
            {isLogin ? 'Register' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
