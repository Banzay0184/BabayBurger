import React, { useState } from 'react';
import { useOperatorAuth } from '../../context/OperatorAuthContext';

export const OperatorLoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerData, setRegisterData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password_confirm: ''
  });

  const { state, login, register, clearError } = useOperatorAuth();

  // Обработка входа
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      return;
    }

    try {
      await login(username, password);
    } catch (error) {
      console.error('Ошибка входа:', error);
    }
  };

  // Обработка регистрации
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !registerData.first_name.trim()) {
      return;
    }

    if (password !== registerData.password_confirm) {
      alert('Пароли не совпадают');
      return;
    }

    try {
      await register({
        username,
        first_name: registerData.first_name,
        last_name: registerData.last_name,
        email: registerData.email,
        phone: registerData.phone,
        password,
        password_confirm: registerData.password_confirm
      });
    } catch (error) {
      console.error('Ошибка регистрации:', error);
    }
  };

  // Переключение между входом и регистрацией
  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    clearError();
    setUsername('');
    setPassword('');
    setRegisterData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password_confirm: ''
    });
  };

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-gray-300 text-xl">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-16 px-6">
      <div className="max-w-2xl w-full space-y-12">
        {/* Заголовок - планшетная версия */}
        <div className="text-center">
          <div className="mx-auto h-32 w-32 bg-blue-600 rounded-2xl flex items-center justify-center mb-8">
            <span className="text-white text-5xl">👨‍💼</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            {isRegistering ? 'Регистрация оператора' : 'Вход оператора'}
          </h2>
          <p className="text-gray-400 text-xl">
            {isRegistering 
              ? 'Создайте аккаунт для работы с заказами' 
              : 'Войдите в систему для управления заказами'
            }
          </p>
        </div>

        {/* Форма - планшетная версия */}
        <form className="mt-12 space-y-8" onSubmit={isRegistering ? handleRegister : handleLogin}>
          <div className="space-y-6">
            {/* Имя пользователя */}
            <div>
              <label htmlFor="username" className="block text-lg font-semibold text-gray-300 mb-3">
                Имя пользователя
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-6 py-4 border border-gray-600 rounded-xl bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                placeholder="Введите имя пользователя"
              />
            </div>

            {/* Пароль */}
            <div>
              <label htmlFor="password" className="block text-lg font-semibold text-gray-300 mb-3">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 border border-gray-600 rounded-xl bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                placeholder="Введите пароль"
              />
            </div>

            {/* Дополнительные поля для регистрации - планшетная версия */}
            {isRegistering && (
              <>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="first_name" className="block text-lg font-semibold text-gray-300 mb-3">
                      Имя
                    </label>
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      required
                      value={registerData.first_name}
                      onChange={(e) => setRegisterData({...registerData, first_name: e.target.value})}
                      className="w-full px-6 py-4 border border-gray-600 rounded-xl bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                      placeholder="Имя"
                    />
                  </div>
                  <div>
                    <label htmlFor="last_name" className="block text-lg font-semibold text-gray-300 mb-3">
                      Фамилия
                    </label>
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      value={registerData.last_name}
                      onChange={(e) => setRegisterData({...registerData, last_name: e.target.value})}
                      className="w-full px-6 py-4 border border-gray-600 rounded-xl bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                      placeholder="Фамилия"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-lg font-semibold text-gray-300 mb-3">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                    className="w-full px-6 py-4 border border-gray-600 rounded-xl bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-lg font-semibold text-gray-300 mb-3">
                    Телефон
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={registerData.phone}
                    onChange={(e) => setRegisterData({...registerData, phone: e.target.value})}
                    className="w-full px-6 py-4 border border-gray-600 rounded-xl bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    placeholder="+998 90 123 45 67"
                  />
                </div>

                <div>
                  <label htmlFor="password_confirm" className="block text-lg font-semibold text-gray-300 mb-3">
                    Подтвердите пароль
                  </label>
                  <input
                    id="password_confirm"
                    name="password_confirm"
                    type="password"
                    required
                    value={registerData.password_confirm}
                    onChange={(e) => setRegisterData({...registerData, password_confirm: e.target.value})}
                    className="w-full px-6 py-4 border border-gray-600 rounded-xl bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    placeholder="Повторите пароль"
                  />
                </div>
              </>
            )}
          </div>

          {/* Ошибка - планшетная версия */}
          {state.error && (
            <div className="bg-red-900/30 border border-red-600/50 rounded-xl p-6">
              <p className="text-red-400 text-lg">{state.error}</p>
            </div>
          )}

          {/* Кнопка отправки - планшетная версия */}
          <div>
            <button
              type="submit"
              disabled={state.isLoading}
              className="w-full flex justify-center py-4 px-6 border border-transparent rounded-xl shadow-sm text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {state.isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                isRegistering ? 'Зарегистрироваться' : 'Войти'
              )}
            </button>
          </div>

          {/* Переключение режима - планшетная версия */}
          <div className="text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-blue-400 hover:text-blue-300 text-lg transition-colors"
            >
              {isRegistering 
                ? 'Уже есть аккаунт? Войти' 
                : 'Нет аккаунта? Зарегистрироваться'
              }
            </button>
          </div>
        </form>

        {/* Дополнительная информация - планшетная версия */}
        <div className="text-center">
          <p className="text-gray-500 text-lg">
            Система управления заказами для операторов Babay Burger
          </p>
        </div>
      </div>
    </div>
  );
};
