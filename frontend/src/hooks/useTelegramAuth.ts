import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTelegramId, getTelegramUser, initTelegramWebApp, isTelegramWebApp } from '../utils/telegram';

export const useTelegramAuth = () => {
  const { login, logout, state } = useAuth();

  const authenticate = useCallback(async (): Promise<boolean> => {
    try {
      // Проверяем доступность Telegram Web App
      if (!isTelegramWebApp()) {
        throw new Error('Telegram Web App недоступен');
      }

      // Инициализируем Telegram Web App
      initTelegramWebApp();

      // Получаем данные пользователя
      const telegramId = getTelegramId();
      const telegramUser = getTelegramUser();

      if (!telegramId || !telegramUser) {
        throw new Error('Не удалось получить данные пользователя из Telegram');
      }

      // Выполняем авторизацию
      await login();
      return true;
    } catch (error: any) {
      console.error('Ошибка авторизации через Telegram:', error);
      return false;
    }
  }, [login]);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await logout();
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  }, [logout]);

  return {
    authenticate,
    signOut,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    user: state.user,
  };
}; 