import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { MainPage } from './pages/MainPage';
import { initTelegramWebApp } from './utils/telegram';

// Компонент для отображения контента в зависимости от состояния авторизации
const AppContent: React.FC = () => {
  const { state } = useAuth();

  // Инициализируем Telegram Web App при загрузке
  useEffect(() => {
    initTelegramWebApp();
  }, []);

  // Если загрузка или не авторизован - показываем страницу авторизации
  if (state.isLoading || !state.isAuthenticated) {
    return <AuthPage />;
  }

  // Если авторизован - показываем главную страницу
  return <MainPage />;
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
