import apiClient from './client';
import type { ApiResponse } from './types';
import type {
  ApiMenuItem,
  ApiCategory,
  ApiPromotion,
  ApiMenuResponse,
  ApiSearchParams,
  ApiPriceRange,
  ApiStatistics
} from './menuTypes';

// API функции для меню
export const menuApi = {
  // Получить все меню
  async getMenu(): Promise<ApiResponse<ApiMenuResponse>> {
    try {
      const response = await apiClient.get('menu/');
      return { data: response.data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Получить категории
  async getCategories(): Promise<ApiResponse<ApiCategory[]>> {
    try {
      const response = await apiClient.get('categories/');
      return { data: response.data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Получить товары категории
  async getCategoryItems(categoryId: number): Promise<ApiResponse<ApiMenuItem[]>> {
    try {
      const response = await apiClient.get(`categories/${categoryId}/items/`);
      return { data: response.data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Получить детали товара
  async getMenuItem(itemId: number): Promise<ApiResponse<ApiMenuItem>> {
    try {
      const response = await apiClient.get(`menu/items/${itemId}/`);
      return { data: response.data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Получить хиты
  async getHits(): Promise<ApiResponse<ApiMenuItem[]>> {
    try {
      const response = await apiClient.get('menu/hits/');
      return { data: response.data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Получить новинки
  async getNewItems(): Promise<ApiResponse<ApiMenuItem[]>> {
    try {
      const response = await apiClient.get('menu/new/');
      return { data: response.data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Получить рекомендуемые
  async getFeatured(): Promise<ApiResponse<ApiMenuItem[]>> {
    try {
      const response = await apiClient.get('menu/featured/');
      return { data: response.data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Поиск товаров
  async searchItems(params: ApiSearchParams): Promise<ApiResponse<ApiMenuItem[]>> {
    try {
      // Преобразуем параметры для соответствия API бэкенда
      const apiParams: any = {};
      
      if (params.query) {
        apiParams.q = params.query; // Бэкенд ожидает 'q' вместо 'query'
      }
      
      if (params.category) {
        apiParams.category = params.category;
      }
      
      if (params.min_price) {
        apiParams.min_price = params.min_price;
      }
      
      if (params.max_price) {
        apiParams.max_price = params.max_price;
      }
      
      if (params.is_hit !== undefined) {
        apiParams.is_hit = params.is_hit;
      }
      
      if (params.is_new !== undefined) {
        apiParams.is_new = params.is_new;
      }
      
      if (params.is_featured !== undefined) {
        apiParams.is_featured = params.is_featured;
      }

      const response = await apiClient.get('menu/search/', { params: apiParams });
      return { data: response.data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Получить диапазон цен
  async getPriceRange(): Promise<ApiResponse<ApiPriceRange>> {
    try {
      const response = await apiClient.get('menu/price-range/');
      return { data: response.data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Получить акции
  async getPromotions(): Promise<ApiResponse<ApiPromotion[]>> {
    try {
      const response = await apiClient.get('promotions/');
      return { data: response.data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Получить статистику
  async getStatistics(): Promise<ApiResponse<ApiStatistics>> {
    try {
      const response = await apiClient.get('statistics/');
      return { data: response.data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  }
};

// Реэкспортируем типы для удобства
export type {
  ApiMenuItem,
  ApiCategory,
  ApiPromotion,
  ApiMenuResponse,
  ApiSearchParams,
  ApiPriceRange,
  ApiStatistics
} from './menuTypes'; 