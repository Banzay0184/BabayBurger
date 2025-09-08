import { clientApi } from './unifiedClient';
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
      const response = await clientApi.get<ApiMenuResponse>('menu/');
      return { data: response, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Получить категории
  async getCategories(): Promise<ApiResponse<ApiCategory[]>> {
    try {
      const response = await clientApi.get<ApiCategory[]>('categories/');
      return { data: response, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Получить товары категории
  async getCategoryItems(categoryId: number): Promise<ApiResponse<ApiMenuItem[]>> {
    try {
      const response = await clientApi.get<ApiMenuItem[]>(`categories/${categoryId}/items/`);
      return { data: response, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Получить детали товара
  async getMenuItem(itemId: number): Promise<ApiResponse<ApiMenuItem>> {
    try {
      const response = await clientApi.get<ApiMenuItem>(`menu/items/${itemId}/`);
      return { data: response, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Получить хиты
  async getHits(): Promise<ApiResponse<ApiMenuItem[]>> {
    try {
      const response = await clientApi.get<ApiMenuItem[]>('menu/hits/');
      return { data: response, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Получить новинки
  async getNewItems(): Promise<ApiResponse<ApiMenuItem[]>> {
    try {
      const response = await clientApi.get<ApiMenuItem[]>('menu/new/');
      return { data: response, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Получить рекомендуемые
  async getFeatured(): Promise<ApiResponse<ApiMenuItem[]>> {
    try {
      const response = await clientApi.get<ApiMenuItem[]>('menu/featured/');
      return { data: response, success: true };
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

      const response = await clientApi.get<ApiMenuItem[]>('menu/search/', { params: apiParams });
      return { data: response, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Получить диапазон цен
  async getPriceRange(): Promise<ApiResponse<ApiPriceRange>> {
    try {
      const response = await clientApi.get<ApiPriceRange>('menu/price-range/');
      return { data: response, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Получить акции
  async getPromotions(): Promise<ApiResponse<ApiPromotion[]>> {
    try {
      const response = await clientApi.get<ApiPromotion[]>('promotions/');
      return { data: response, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Получить статистику
  async getStatistics(): Promise<ApiResponse<ApiStatistics>> {
    try {
      const response = await clientApi.get<ApiStatistics>('statistics/');
      return { data: response, success: true };
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

// --- Admin: Categories CRUD (uses categories-admin endpoints) ---
export interface AdminCategoryCreateInput {
  name: string;
  description?: string;
}

export interface AdminCategoryUpdateInput {
  name?: string;
  description?: string;
}

export const adminCategoriesApi = {
  async list() {
    try {
      const raw = await clientApi.get<any>('categories-admin/');
      const list: ApiCategory[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.results)
          ? raw.results
          : Array.isArray(raw?.items)
            ? raw.items
            : [];
      return { data: list, success: true } as ApiResponse<ApiCategory[]>;
    } catch (error: any) {
      return { error, success: false } as ApiResponse<ApiCategory[]>;
    }
  },
  async create(payload: AdminCategoryCreateInput) {
    try {
      const data = await clientApi.post<ApiCategory>('categories-admin/', payload);
      return { data, success: true } as ApiResponse<ApiCategory>;
    } catch (error: any) {
      return { error, success: false } as ApiResponse<ApiCategory>;
    }
  },
  async update(id: number, payload: AdminCategoryUpdateInput) {
    try {
      const data = await clientApi.patch<ApiCategory>(`categories-admin/${id}/`, payload);
      return { data, success: true } as ApiResponse<ApiCategory>;
    } catch (error: any) {
      return { error, success: false } as ApiResponse<ApiCategory>;
    }
  },
  async remove(id: number) {
    try {
      await clientApi.delete(`categories-admin/${id}/`);
      return { success: true } as ApiResponse<null>;
    } catch (error: any) {
      return { error, success: false } as ApiResponse<null>;
    }
  },
};