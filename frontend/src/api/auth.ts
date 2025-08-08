import apiClient from './client';
import axios from 'axios';
import type { User } from './types';
import { API_CONFIG } from '../config/api';

// Тип для данных пользователя Telegram
interface TelegramWidgetUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  auth_date: number;
  hash?: string;
  photo_url?: string;
  allows_write_to_pm?: boolean;
}

// Специальный клиент для авторизации Telegram (без CSRF)
const telegramAuthClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Для обхода предупреждений ngrok
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
    console.log('=== ДИАГНОСТИКА АВТОРИЗАЦИИ ===');
    console.log('Исходные данные пользователя:', userData);
    
    // Создаем данные для отправки на сервер
    const authData = {
      telegram_id: userData.id, // Используем telegram_id для совместимости с бэкендом
      id: userData.id, // Также добавляем id для поддержки
      first_name: userData.first_name,
      last_name: userData.last_name || '',
      username: userData.username || '',
      language_code: userData.language_code || 'ru',
      is_premium: userData.is_premium || false,
      auth_date: userData.auth_date,
      hash: userData.hash || '',
      photo_url: userData.photo_url || '',
      allows_write_to_pm: userData.allows_write_to_pm || false
    };
    
    // Формируем правильный URL
    const authUrl = 'auth/telegram-widget/';
    const fullUrl = `${API_CONFIG.BASE_URL}${authUrl}`;
    
    console.log('📤 Данные для отправки:', authData);
    console.log('🌐 URL запроса:', authUrl);
    console.log('🔗 Полный URL:', fullUrl);
    console.log('🔧 Конфигурация API:', {
      BASE_URL: API_CONFIG.BASE_URL,
      isDevelopment: API_CONFIG.ENV.isDevelopment,
      isProduction: API_CONFIG.ENV.isProduction
    });
    
    // Отправляем JSON запрос
    const response = await telegramAuthClient.post(authUrl, authData, {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    });
    
    console.log('✅ Ответ авторизации:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Ошибка авторизации Telegram:', error);
    
    // Проверяем на CORS ошибку
    if (error.message?.includes('CORS') || error.message?.includes('blocked')) {
      console.error('🚫 CORS ошибка - проверьте настройки сервера');
      throw {
        message: 'Ошибка CORS. Проверьте настройки сервера и URL.',
        code: 'CORS_ERROR',
        details: {
          originalError: error.message,
          url: `${API_CONFIG.BASE_URL}auth/telegram-widget/`,
          suggestion: 'Убедитесь, что сервер запущен и доступен по HTTPS'
        }
      };
    }
    
    // Если JSON не работает, пробуем FormData
    if (error.response?.status === 400) {
      console.log('🔄 Пробуем FormData формат...');
      
      try {
        const formData = new URLSearchParams();
        
        // Основные поля пользователя
        formData.append('telegram_id', String(userData.id)); // Используем telegram_id для совместимости
        formData.append('id', String(userData.id)); // Также добавляем id для поддержки
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
        
        console.log('📤 FormData для отправки:');
        for (const [key, value] of formData.entries()) {
          console.log(`${key}: ${value}`);
        }
        
        const formResponse = await telegramAuthClient.post('auth/telegram-widget/', formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'ngrok-skip-browser-warning': 'true',
          },
        });
        
        console.log('✅ Ответ авторизации (FormData):', formResponse.data);
        return formResponse.data;
      } catch (formError: any) {
        console.error('❌ Ошибка авторизации Telegram (FormData):', formError);
        
        // Детальная обработка ошибок
        if (formError.response?.status === 400) {
          console.error('400 Bad Request - Детали ошибки:', formError.response.data);
          console.error('Заголовки ответа:', formError.response.headers);
          console.error('Статус ответа:', formError.response.status);
          throw {
            message: 'Неверные данные авторизации. Проверьте формат запроса.',
            code: 'BAD_REQUEST',
            details: formError.response.data
          };
        }
        
        throw formError;
      }
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