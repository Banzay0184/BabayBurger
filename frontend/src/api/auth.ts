import apiClient from './client';
import type { User } from './types';
import type { TelegramWidgetUser } from '../types/telegram';

// Специальный клиент для авторизации Telegram (без CSRF)
const telegramAuthClient = apiClient.create({
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  withCredentials: false, // Отключаем CSRF для авторизации
});

// Функция для авторизации через Telegram Widget
export const telegramAuth = async (userData: TelegramWidgetUser) => {
  try {
    console.log('Отправляем данные авторизации:', userData);
    
    // Преобразуем данные в FormData
    const formData = new URLSearchParams();
    Object.entries(userData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    
    const response = await telegramAuthClient.post('auth/telegram-widget/', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    console.log('Ответ авторизации:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Ошибка авторизации Telegram:', error);
    
    // Специальная обработка ошибок авторизации
    if (error.response?.status === 403) {
      console.error('Детали ошибки 403:', error.response.data);
      throw {
        message: 'Ошибка авторизации. Проверьте настройки бота.',
        code: 'AUTH_ERROR',
        details: error.response.data
      };
    }
    
    throw error;
  }
};

// Функция для проверки статуса авторизации
export const checkAuthStatus = async () => {
  try {
    const response = await apiClient.get('auth/status/');
    return response.data;
  } catch (error: any) {
    console.error('Ошибка проверки статуса:', error);
    throw error;
  }
};

// Функция для выхода
export const logout = async () => {
  try {
    const response = await apiClient.post('auth/logout/');
    localStorage.removeItem('auth_token');
    return response.data;
  } catch (error: any) {
    console.error('Ошибка выхода:', error);
    localStorage.removeItem('auth_token');
    throw error;
  }
};

export const authApi = {
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get('auth/user/');
      return response.data;
    } catch (error: any) {
      throw { message: error.message || 'Ошибка получения данных пользователя', code: error.code || 'USER_ERROR' };
    }
  },

  async validateToken(): Promise<boolean> {
    try {
      const response = await apiClient.get('auth/validate/');
      return response.data.valid;
    } catch (error: any) {
      return false;
    }
  },

  // Добавляем функции для совместимости
  async telegramAuth(authData: any): Promise<any> {
    return telegramAuth(authData);
  },

  async telegramWidgetAuth(widgetData: any): Promise<any> {
    return telegramAuth(widgetData);
  },

  async logout(): Promise<void> {
    return logout();
  }
}; 