import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import type { ApiResponse, ApiError } from './types';
import { API_CONFIG } from '../config/api';
import { universalStorage } from '../utils/storage';

// Типы для различных типов авторизации
export type AuthType = 'bearer' | 'token' | 'none';

// Интерфейс для конфигурации клиента
export interface UnifiedClientConfig {
  baseURL?: string;
  timeout?: number;
  authType?: AuthType;
  tokenKey?: string;
  headers?: Record<string, string>;
}

// Класс унифицированного API клиента
export class UnifiedApiClient {
  private client: AxiosInstance;
  private authType: AuthType;
  private tokenKey: string;

  constructor(config: UnifiedClientConfig = {}) {
    this.authType = config.authType || 'bearer';
    this.tokenKey = config.tokenKey || 'auth_token';

    this.client = axios.create({
      baseURL: config.baseURL || API_CONFIG.BASE_URL,
      timeout: config.timeout || API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      withCredentials: false,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: any) => {
        console.log('🌐 API запрос:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          fullURL: `${config.baseURL}${config.url}`,
          headers: config.headers,
          withCredentials: config.withCredentials
        });

        // Добавляем ngrok заголовок только для продакшена
        if (!API_CONFIG.ENV.isDevelopment) {
          config.headers['ngrok-skip-browser-warning'] = 'true';
        }

        // Добавляем CSRF токен только в разработке
        if (API_CONFIG.ENV.isDevelopment) {
          const csrfToken = this.getCSRFToken();
          if (csrfToken) {
            config.headers['X-CSRFToken'] = csrfToken;
          }
        }

        // Добавляем токен авторизации
        this.addAuthHeader(config);

        console.log('🔧 Финальные заголовки запроса:', config.headers);
        return config;
      },
      (error: any) => {
        console.error('❌ Ошибка запроса:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: any) => {
        console.log('✅ API ответ:', {
          status: response.status,
          url: response.config.url,
          data: response.data
        });
        return response;
      },
      (error: any) => this.handleResponseError(error)
    );
  }

  private getCSRFToken(): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrftoken') {
        return value;
      }
    }
    return null;
  }

  private addAuthHeader(config: any): void {
    // Позволяем принудительно пропускать добавление токена для конкретных запросов
    if (config.headers && (config.headers['X-Skip-Auth'] || config.headers['x-skip-auth'])) {
      return;
    }
    const token = universalStorage.getItem(this.tokenKey);
    if (token) {
      switch (this.authType) {
        case 'bearer':
          config.headers.Authorization = `Bearer ${token}`;
          break;
        case 'token':
          config.headers.Authorization = `Token ${token}`;
          break;
        case 'none':
        default:
          // Не добавляем заголовок авторизации
          break;
      }
    }
  }

  // Метод для проверки, можно ли повторить запрос
  private isRetryableError(error: any): boolean {
    return (
      error.code === 'NETWORK_ERROR' ||
      error.message?.includes('timeout') ||
      error.message?.includes('QUIC') ||
      error.message?.includes('Network Error') ||
      !error.response // Сетевые ошибки
    );
  }

  // Метод для повторных попыток запроса
  private async requestWithRetry<T>(
    requestFn: () => Promise<T>, 
    maxRetries: number = 3
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          throw error;
        }
        
        // Экспоненциальная задержка
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`🔄 Повтор ${attempt}/${maxRetries} через ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Все попытки исчерпаны');
  }

  private handleResponseError(error: any): Promise<never> {
    console.error('❌ API ошибка:', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data
    });

    if (!error.response) {
      console.error('🌐 Network error:', error.message);
      
      if (error.message?.includes('Network Error') || error.message?.includes('CORS')) {
        console.error('🚫 CORS/Network ошибка - попробуйте обновить страницу или проверить настройки');
        
        if (API_CONFIG.ENV.isDevelopment) {
          console.warn('💡 Для разработки попробуйте:');
          console.warn('1. Обновить страницу (Ctrl+F5)');
          console.warn('2. Проверить, что Django сервер запущен');
          console.warn('3. Проверить ngrok туннель');
        }
      }
      
      return Promise.reject({
        message: 'Ошибка сети. Проверьте подключение к интернету.',
        code: 'NETWORK_ERROR',
        details: {
          originalError: error.message,
          url: error.config?.url,
          baseURL: API_CONFIG.BASE_URL,
          suggestion: 'Проверьте, что сервер запущен и доступен'
        }
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
        universalStorage.removeItem(this.tokenKey); 
        console.error('401 Unauthorized:', error.response.data);
        break;
      case 403: 
        message = 'Доступ запрещен'; 
        console.error('403 Forbidden:', error.response.data);
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

  // Методы для HTTP запросов
  async get<T>(url: string, config?: AxiosRequestConfig, useRetry: boolean = true): Promise<T> {
    if (useRetry) {
      return this.requestWithRetry(async () => {
        const response = await this.client.get<T>(url, config);
        return response.data;
      });
    }
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // Метод для создания API ответа
  createApiResponse<T>(data?: T, error?: ApiError): ApiResponse<T> {
    return { data, error, success: !error };
  }

  // Метод для обработки успешного ответа
  handleSuccess<T>(response: AxiosResponse<T>): T {
    return response.data;
  }

  // Метод для обработки ошибки
  handleError(error: any): ApiError {
    if (error.message) {
      return error;
    }
    return { message: 'Неизвестная ошибка', code: 'UNKNOWN_ERROR' };
  }

  // Метод для установки токена
  setToken(token: string): void {
    universalStorage.setItem(this.tokenKey, token);
  }

  // Метод для получения токена
  getToken(): string | null {
    return universalStorage.getItem(this.tokenKey);
  }

  // Метод для удаления токена
  removeToken(): void {
    universalStorage.removeItem(this.tokenKey);
  }

  // Метод для проверки авторизации
  isAuthenticated(): boolean {
    const token = this.getToken();
    console.log('🔍 UnifiedClient auth check:', {
      tokenKey: this.tokenKey,
      token: !!token,
      tokenValue: token ? token.substring(0, 10) + '...' : null
    });
    return !!token;
  }
}

// Создаем экземпляры клиентов для разных типов авторизации
export const clientApi = new UnifiedApiClient({
  authType: 'bearer',
  tokenKey: 'auth_token'
});

export const operatorApi = new UnifiedApiClient({
  authType: 'token',
  tokenKey: 'operator_token'
});

export const cashierApi = new UnifiedApiClient({
  authType: 'token',
  tokenKey: 'cashier_token'
});

export const publicApi = new UnifiedApiClient({
  authType: 'none'
});

// Экспортируем утилиты для совместимости
export const apiUtils = {
  handleSuccess: <T>(response: AxiosResponse<T>): T => response.data,
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

export default clientApi;
