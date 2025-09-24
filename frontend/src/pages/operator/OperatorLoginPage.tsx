import React, { useState } from 'react';
import { useOperatorAuth } from '../../context/OperatorAuthContext';
import { PWADebugInfo, SimplePWAInstallButton } from '../../components/operator/PWADebug';
import { PWAForceInstall, PWAHealthCheck } from '../../components/operator/PWAForceInstall';
import { ManifestTester } from '../../components/operator/ManifestTester';
import { PWAFileChecker } from '../../components/operator/PWAFileChecker';
import { PWAManifestCreator } from '../../components/operator/PWAManifestCreator';

export const OperatorLoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const { state, login } = useOperatorAuth();

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
        {/* PWA Manifest Creator */}
        <PWAManifestCreator />
        
        {/* PWA File Checker */}
        <PWAFileChecker />
        
        {/* Manifest Tester */}
        <ManifestTester />
        
        {/* PWA Health Check */}
        <PWAHealthCheck />
        
        {/* PWA отладка */}
        <PWADebugInfo />
        
        {/* PWA принудительная установка */}
        <PWAForceInstall />
        
        {/* PWA установка */}
        <SimplePWAInstallButton />
        
        {/* Заголовок - планшетная версия */}
        <div className="text-center">
          <div className="mx-auto h-32 w-32 bg-blue-600 rounded-2xl flex items-center justify-center mb-8">
            <span className="text-white text-5xl">👨‍💼</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Вход оператора
          </h2>
          <p className="text-gray-400 text-xl">
            Войдите в систему для управления заказами
          </p>
        </div>

        {/* Форма - планшетная версия */}
        <form className="mt-12 space-y-8" onSubmit={handleLogin}>
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
                'Войти'
              )}
            </button>
          </div>
        </form>

        {/* Дополнительная информация - планшетная версия */}
        <div className="text-center">
          <p className="text-gray-500 text-lg">
            Система управления заказами для операторов Babay Food
          </p>
        </div>
      </div>
    </div>
  );
};
