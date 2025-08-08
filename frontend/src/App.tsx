import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MenuProvider } from './context/MenuContext';
import { AuthPage } from './pages/AuthPage';
import { MainPage } from './pages/MainPage';
import ApiTestPage from './pages/ApiTestPage';
import { initTelegramWebApp } from './utils/telegram';

// Компонент для отображения контента в зависимости от состояния авторизации
const AppContent: React.FC = () => {
  const { state } = useAuth();

  // Инициализируем Telegram Web App при загрузке
  useEffect(() => {
    initTelegramWebApp();
  }, []);

  // Проверяем, есть ли параметр для тестовой страницы
  const urlParams = new URLSearchParams(window.location.search);
  const isTestMode = urlParams.get('test') === 'api';

  // Если включен тестовый режим - показываем тестовую страницу
  if (isTestMode) {
    return <ApiTestPage />;
  }

  // Если загрузка или не авторизован - показываем страницу авторизации
  if (state.isLoading || !state.isAuthenticated) {
    return <AuthPage />;
  }

  // Если авторизован - показываем главную страницу с меню
  return (
    <MenuProvider>
      <MainPage />
    </MenuProvider>
  );
};

// Главный компонент приложения
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
