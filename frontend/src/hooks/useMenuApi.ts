import { useState, useCallback } from 'react';
import { menuApi } from '../api/menu';
import type { MenuItem, Category, Promotion, ApiSearchParams, ApiPriceRange, ApiStatistics } from '../types/menu';

interface UseMenuApiReturn {
  // Состояния
  isLoading: boolean;
  error: string | null;
  
  // Данные
  menuItems: MenuItem[];
  categories: Category[];
  promotions: Promotion[];
  
  // Функции
  fetchMenu: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchPromotions: () => Promise<void>;
  fetchMenuItem: (id: number) => Promise<MenuItem | null>;
  fetchCategoryItems: (categoryId: number) => Promise<MenuItem[]>;
  fetchHits: () => Promise<MenuItem[]>;
  fetchNewItems: () => Promise<MenuItem[]>;
  fetchFeatured: () => Promise<MenuItem[]>;
  searchItems: (params: ApiSearchParams) => Promise<MenuItem[]>;
  fetchPriceRange: () => Promise<ApiPriceRange | null>;
  fetchStatistics: () => Promise<ApiStatistics | null>;
  
  // Утилиты
  clearError: () => void;
  resetState: () => void;
}

export const useMenuApi = (): UseMenuApiReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetState = useCallback(() => {
    setMenuItems([]);
    setCategories([]);
    setPromotions([]);
    setError(null);
  }, []);

  const fetchMenu = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await menuApi.getMenu();
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Ошибка загрузки меню');
      }
      
      if (response.data) {
        setMenuItems(response.data.items || []);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Ошибка загрузки меню';
      setError(errorMessage);
      console.error('Error fetching menu:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await menuApi.getCategories();
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Ошибка загрузки категорий');
      }
      
      setCategories(response.data || []);
    } catch (err: any) {
      const errorMessage = err?.message || 'Ошибка загрузки категорий';
      setError(errorMessage);
      console.error('Error fetching categories:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPromotions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await menuApi.getPromotions();
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Ошибка загрузки акций');
      }
      
      setPromotions(response.data || []);
    } catch (err: any) {
      const errorMessage = err?.message || 'Ошибка загрузки акций';
      setError(errorMessage);
      console.error('Error fetching promotions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMenuItem = useCallback(async (id: number): Promise<MenuItem | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await menuApi.getMenuItem(id);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Ошибка загрузки товара');
      }
      
      return response.data || null;
    } catch (err: any) {
      const errorMessage = err?.message || 'Ошибка загрузки товара';
      setError(errorMessage);
      console.error('Error fetching menu item:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCategoryItems = useCallback(async (categoryId: number): Promise<MenuItem[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await menuApi.getCategoryItems(categoryId);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Ошибка загрузки товаров категории');
      }
      
      return response.data || [];
    } catch (err: any) {
      const errorMessage = err?.message || 'Ошибка загрузки товаров категории';
      setError(errorMessage);
      console.error('Error fetching category items:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchHits = useCallback(async (): Promise<MenuItem[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await menuApi.getHits();
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Ошибка загрузки хитов');
      }
      
      return response.data || [];
    } catch (err: any) {
      const errorMessage = err?.message || 'Ошибка загрузки хитов';
      setError(errorMessage);
      console.error('Error fetching hits:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchNewItems = useCallback(async (): Promise<MenuItem[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await menuApi.getNewItems();
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Ошибка загрузки новинок');
      }
      
      return response.data || [];
    } catch (err: any) {
      const errorMessage = err?.message || 'Ошибка загрузки новинок';
      setError(errorMessage);
      console.error('Error fetching new items:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFeatured = useCallback(async (): Promise<MenuItem[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await menuApi.getFeatured();
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Ошибка загрузки рекомендуемых');
      }
      
      return response.data || [];
    } catch (err: any) {
      const errorMessage = err?.message || 'Ошибка загрузки рекомендуемых';
      setError(errorMessage);
      console.error('Error fetching featured:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchItems = useCallback(async (params: ApiSearchParams): Promise<MenuItem[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await menuApi.searchItems(params);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Ошибка поиска');
      }
      
      return response.data || [];
    } catch (err: any) {
      const errorMessage = err?.message || 'Ошибка поиска';
      setError(errorMessage);
      console.error('Error searching items:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPriceRange = useCallback(async (): Promise<ApiPriceRange | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await menuApi.getPriceRange();
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Ошибка загрузки диапазона цен');
      }
      
      return response.data || null;
    } catch (err: any) {
      const errorMessage = err?.message || 'Ошибка загрузки диапазона цен';
      setError(errorMessage);
      console.error('Error fetching price range:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStatistics = useCallback(async (): Promise<ApiStatistics | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await menuApi.getStatistics();
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Ошибка загрузки статистики');
      }
      
      return response.data || null;
    } catch (err: any) {
      const errorMessage = err?.message || 'Ошибка загрузки статистики';
      setError(errorMessage);
      console.error('Error fetching statistics:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // Состояния
    isLoading,
    error,
    
    // Данные
    menuItems,
    categories,
    promotions,
    
    // Функции
    fetchMenu,
    fetchCategories,
    fetchPromotions,
    fetchMenuItem,
    fetchCategoryItems,
    fetchHits,
    fetchNewItems,
    fetchFeatured,
    searchItems,
    fetchPriceRange,
    fetchStatistics,
    
    // Утилиты
    clearError,
    resetState
  };
}; 