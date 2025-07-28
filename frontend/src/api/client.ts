import axios from 'axios';
import type { ApiResponse, ApiError } from './types';
import { API_CONFIG } from '../config/api';

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  // Отключаем withCredentials для продакшена (ngrok)
  withCredentials: API_CONFIG.ENV.isDevelopment,
});

// Функция для получения CSRF токена
const getCSRFToken = (): string | null => {
  // Пытаемся получить токен из cookie
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrftoken') {
      return value;
    }
  }
  return null;
};

apiClient.interceptors.request.use(
  (config: any) => {
    // Добавляем CSRF токен только в разработке
    if (API_CONFIG.ENV.isDevelopment) {
      const csrfToken = getCSRFToken();
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }
    
    // Добавляем токен авторизации
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Добавляем специальные заголовки для ngrok
    if (!API_CONFIG.ENV.isDevelopment) {
      config.headers['ngrok-skip-browser-warning'] = 'true';
      config.headers['Access-Control-Allow-Origin'] = '*';
    }
    
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response: any) => {
    return response;
  },
  (error: any) => {
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject({
        message: 'Ошибка сети. Проверьте подключение к интернету.',
        code: 'NETWORK_ERROR'
      });
    }

    const status = error.response.status;
    let message = 'Произошла ошибка';

    switch (status) {
      case 400: 
        message = 'Неверный запрос'; 
        console.error('400 Bad Request:', error.response.data);
        break;
      case 401: 
        message = 'Необходима авторизация'; 
        localStorage.removeItem('auth_token'); 
        console.error('401 Unauthorized:', error.response.data);
        break;
      case 403: 
        message = 'Доступ запрещен'; 
        console.error('403 Forbidden:', error.response.data);
        // Если CSRF ошибка, попробуем обновить токен
        if (error.response.data?.detail?.includes('CSRF')) {
          console.warn('CSRF токен истек, попробуйте перезагрузить страницу');
          message = 'Ошибка безопасности. Попробуйте перезагрузить страницу.';
        }
        break;
      case 404: 
        message = 'Ресурс не найден'; 
        console.error('404 Not Found:', error.response.data);
        break;
      case 500: 
        message = 'Ошибка сервера'; 
        console.error('500 Server Error:', error.response.data);
        break;
      default: 
        message = `Ошибка ${status}`;
        console.error(`${status} Error:`, error.response.data);
    }

    const apiError: ApiError = {
      message,
      code: status.toString(),
      details: error.response.data
    };

    return Promise.reject(apiError);
  }
);

export const apiUtils = {
  handleSuccess: <T>(response: any): T => {
    return response.data;
  },
  handleError: (error: any): ApiError => {
    if (error.message) {
      return error;
    }
    return { message: 'Неизвестная ошибка', code: 'UNKNOWN_ERROR' };
  },
  createApiResponse: <T>(data?: T, error?: ApiError): ApiResponse<T> => {
    return { data, error, success: !error };
  }
};

export default apiClient; 