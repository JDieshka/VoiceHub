import React from 'react';

interface AuthPageProps {
  onLogin: (username: string, password: string) => void;
  onRegister: (username: string, email: string, password: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = React.useState(true);

  const handleLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    onLogin(username, password);
  };

  const handleRegisterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    onRegister(username, email, password);
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="logo">MIN</div>
        <div className="auth-tabs">
          <button 
            className={`btn pink ${isLogin ? 'active' : ''}`} 
            onClick={() => setIsLogin(true)}
          >
            Вход
          </button>
          <button 
            className={`btn mint ${!isLogin ? 'active' : ''}`} 
            onClick={() => setIsLogin(false)}
          >
            Регистрация
          </button>
        </div>

        <form className={`auth-form ${!isLogin ? 'hidden' : ''}`} onSubmit={handleLoginSubmit}>
          <label>никнейм/логин</label>
          <input className="field" type="text" name="username" required />
          <label>пароль</label>
          <input className="field" type="password" name="password" required />
          <a className="forgot" href="#">ЗАБЫЛИ ПАРОЛЬ?</a>
          <button className="btn pink" type="submit">ВОЙТИ</button>
        </form>

        <form className={`auth-form ${isLogin ? 'hidden' : ''}`} onSubmit={handleRegisterSubmit}>
          <label>никнейм</label>
          <input className="field" type="text" name="username" required />
          <label>email</label>
          <input className="field" type="email" name="email" required />
          <label>пароль</label>
          <input className="field" type="password" name="password" required />
          <label>повторите пароль</label>
          <input className="field" type="password" name="passwordConfirm" required />
          <button className="btn pink" type="submit">ВОЙТИ</button>
        </form>
      </div>
    </section>
  );
};
