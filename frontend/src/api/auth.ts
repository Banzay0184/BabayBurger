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

// Функция для тестирования подключения к API
export const testApiConnection = async () => {
  try {
    console.log('Тестируем подключение к API...');
    const response = await apiClient.get('auth/test/');
    console.log('API подключение успешно:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Ошибка подключения к API:', error);
    throw error;
  }
};

// Функция для авторизации через Telegram Widget
export const telegramAuth = async (userData: TelegramWidgetUser) => {
  try {
    console.log('Отправляем данные авторизации:', userData);
    
    // Преобразуем данные в правильный формат для Django
    const formData = new URLSearchParams();
    
    // Основные поля пользователя
    formData.append('id', String(userData.id));
    formData.append('first_name', userData.first_name);
    if (userData.last_name) {
      formData.append('last_name', userData.last_name);
    }
    if (userData.username) {
      formData.append('username', userData.username);
    }
    formData.append('language_code', userData.language_code || 'ru');
    formData.append('is_premium', String(userData.is_premium || false));
    
    // Поля авторизации
    formData.append('auth_date', String(userData.auth_date));
    if (userData.hash) {
      formData.append('hash', userData.hash);
    }
    if (userData.photo_url) {
      formData.append('photo_url', userData.photo_url);
    }
    formData.append('allows_write_to_pm', String(userData.allows_write_to_pm || false));
    
    console.log('Формированные данные для отправки:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }
    
    const response = await telegramAuthClient.post('auth/telegram-widget/', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    console.log('Ответ авторизации:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Ошибка авторизации Telegram:', error);
    
    // Детальная обработка ошибок
    if (error.response?.status === 400) {
      console.error('400 Bad Request - Детали ошибки:', error.response.data);
      throw {
        message: 'Неверные данные авторизации. Проверьте формат запроса.',
        code: 'BAD_REQUEST',
        details: error.response.data
      };
    }
    
    if (error.response?.status === 403) {
      console.error('403 Forbidden - Детали ошибки:', error.response.data);
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