import axios from 'axios';
import type { ApiResponse, ApiError } from './types';
import { API_CONFIG } from '../config/api';

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Важно для работы с CSRF токенами
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
    // Добавляем CSRF токен к запросам
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    
    // Добавляем токен авторизации
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      case 400: message = 'Неверный запрос'; break;
      case 401: message = 'Необходима авторизация'; localStorage.removeItem('auth_token'); break;
      case 403: 
        message = 'Доступ запрещен'; 
        // Если CSRF ошибка, попробуем обновить токен
        if (error.response.data?.detail?.includes('CSRF')) {
          console.warn('CSRF токен истек, попробуйте перезагрузить страницу');
        }
        break;
      case 404: message = 'Ресурс не найден'; break;
      case 500: message = 'Ошибка сервера'; break;
      default: message = `Ошибка ${status}`;
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