import apiClient from './client';
import type { AuthResponse, TelegramAuthRequest, User } from './types';

export const authApi = {
  async telegramAuth(authData: TelegramAuthRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/telegram/', authData);
      return response.data as AuthResponse; // Fixed type assertion
    } catch (error: any) {
      throw { message: error.message || 'Ошибка авторизации', code: error.code || 'AUTH_ERROR' };
    }
  },

  async telegramWidgetAuth(widgetData: any): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/telegram-widget/', widgetData);
      return response.data as AuthResponse;
    } catch (error: any) {
      throw { message: error.message || 'Ошибка авторизации через виджет', code: error.code || 'WIDGET_AUTH_ERROR' };
    }
  },

  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get('/auth/me/');
      return response.data as User; // Fixed type assertion
    } catch (error: any) {
      throw { message: error.message || 'Ошибка получения данных пользователя', code: error.code || 'USER_ERROR' };
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout/');
      localStorage.removeItem('auth_token');
    } catch (error: any) {
      localStorage.removeItem('auth_token');
      throw { message: error.message || 'Ошибка выхода из системы', code: error.code || 'LOGOUT_ERROR' };
    }
  },

  async validateToken(): Promise<boolean> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) { return false; }
      await apiClient.get('/auth/validate/');
      return true;
    } catch (error: any) {
      localStorage.removeItem('auth_token');
      return false;
    }
  }
}; 