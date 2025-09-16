import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminLoginPage: React.FC = () => {
  const { state, login } = useAdminAuth();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const ok = await login(username, password);
    if (ok) {
      navigate('/admin');
    } else {
      setError('Неверные учетные данные');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Анимированный фон */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(120,119,198,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(255,119,198,0.3),transparent_50%)]"></div>
      </div>
      
      <div className="max-w-md w-full space-y-8 p-8 relative z-10">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Логотип и заголовок */}
          <div className="text-center">
            <div className="relative mb-6">
              <div className="text-6xl mb-2 animate-bounce">🍔</div>
              <div className="absolute -top-2 -right-2 text-2xl animate-pulse">✨</div>
            </div>
            <h2 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Babay Burger
            </h2>
            <p className="text-white/80 mb-8 text-lg font-medium">
              Админ панель
            </p>
          </div>

          {/* Форма входа */}
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="space-y-5">
              <div className="group">
                <label className="block text-sm font-medium text-white/90 mb-3 flex items-center">
                  <span className="text-xl mr-2">👤</span>
                  Имя пользователя
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    className="w-full bg-white/10 backdrop-blur-sm text-white placeholder-white/60 px-4 py-4 border border-white/30 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300 hover:bg-white/20"
                    placeholder="Введите имя пользователя"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>
              
              <div className="group">
                <label className="block text-sm font-medium text-white/90 mb-3 flex items-center">
                  <span className="text-xl mr-2">🔒</span>
                  Пароль
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    className="w-full bg-white/10 backdrop-blur-sm text-white placeholder-white/60 px-4 py-4 border border-white/30 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300 hover:bg-white/20"
                    placeholder="Введите пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl p-4 animate-pulse">
                <div className="flex items-center">
                  <span className="text-red-400 mr-3 text-xl">⚠️</span>
                  <span className="text-red-100 text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            {state.error && (
              <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl p-4 animate-pulse">
                <div className="flex items-center">
                  <span className="text-red-400 mr-3 text-xl">⚠️</span>
                  <span className="text-red-100 text-sm font-medium">{state.error}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={state.isLoading}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center transform hover:scale-105 hover:shadow-2xl disabled:transform-none disabled:shadow-none"
            >
              {state.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  <span className="text-lg">Вход...</span>
                </>
              ) : (
                <>
                  <span className="mr-3 text-xl">🚀</span>
                  <span className="text-lg">Войти в админ панель</span>
                </>
              )}
            </button>
          </form>

          {/* Дополнительная информация */}
          <div className="mt-8 text-center">
            <div className="text-sm text-white/60 font-medium">
              🔐 Доступ только для администраторов
            </div>
            <div className="mt-2 text-xs text-white/40">
              © 2024 Babay Burger. Все права защищены.
            </div>
          </div>
        </div>
        
        {/* Дополнительные декоративные элементы */}
        <div className="absolute -top-10 -left-10 w-20 h-20 bg-yellow-400/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-orange-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
      </div>
    </div>
  );
};

export default AdminLoginPage;


