import React, { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { MenuItem, MenuCategory, MenuFilters, Promotion } from '../types/menu';
import { menuApi } from '../api/menu';

interface MenuState {
  categories: MenuCategory[];
  items: MenuItem[];
  promotions: Promotion[];
  filters: MenuFilters;
  isLoading: boolean;
  error: string | null;
}

type MenuAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_MENU_DATA'; payload: { categories: MenuCategory[]; items: MenuItem[]; promotions: Promotion[] } }
  | { type: 'SET_PROMOTIONS'; payload: Promotion[] }
  | { type: 'SET_FILTERS'; payload: Partial<MenuFilters> }
  | { type: 'RESET_FILTERS' };

const initialState: MenuState = {
  categories: [],
  items: [],
  promotions: [],
  filters: {
    search: '',
    category: null,
    priceRange: [0, 10000],
    allergens: [],
    showHits: false,
    showNew: false
  },
  isLoading: false,
  error: null
};

function menuReducer(state: MenuState, action: MenuAction): MenuState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_MENU_DATA':
      return { 
        ...state, 
        categories: action.payload.categories, 
        items: action.payload.items,
        promotions: action.payload.promotions
      };
    case 'SET_PROMOTIONS':
      return { ...state, promotions: action.payload };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'RESET_FILTERS':
      return { ...state, filters: initialState.filters };
    default:
      return state;
  }
}

interface MenuContextType {
  state: MenuState;
  fetchMenu: () => Promise<void>;
  fetchPromotions: () => Promise<void>;
  setFilters: (filters: Partial<MenuFilters>) => void;
  resetFilters: () => void;
  getFilteredItems: () => MenuItem[];
  getCategoriesWithItems: () => MenuCategory[];
  getAvailableCategories: () => MenuCategory[];
  getActivePromotions: () => Promotion[];
  getHits: () => MenuItem[];
  getNewItems: () => MenuItem[];
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const useMenu = () => {
  const context = useContext(MenuContext);
  if (!context) {
    console.error('❌ useMenu: context not found');
    throw new Error('useMenu must be used within a MenuProvider');
  }
  console.log('✅ useMenu: context found');
  return context;
};

interface MenuProviderProps {
  children: ReactNode;
}

export const MenuProvider: React.FC<MenuProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(menuReducer, initialState);

  const fetchMenu = async () => {
    console.log('🚀 Loading menu data...');
    console.log('🔧 Environment:', {
      isDev: import.meta.env.DEV,
      isProd: import.meta.env.PROD,
      mode: import.meta.env.MODE
    });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      // Получаем все данные меню
      const [menuResponse, categoriesResponse, promotionsResponse] = await Promise.all([
        menuApi.getMenu(),
        menuApi.getCategories(),
        menuApi.getPromotions()
      ]);

      if (!menuResponse.success || !categoriesResponse.success || !promotionsResponse.success) {
        throw new Error('Ошибка загрузки данных меню');
      }

      // Преобразуем данные в нужный формат с проверками
      const categories = categoriesResponse.data || [];
      const items = menuResponse.data?.all_items || menuResponse.data?.items || []; // Бэкенд возвращает all_items
      const promotions = promotionsResponse.data || [];

      // Проверяем, что данные являются массивами или объектами, которые можно обработать
      if (!categories || !items || !promotions) {
        console.error('❌ Получены некорректные данные:', {
          categories: typeof categories,
          items: typeof items,
          promotions: typeof promotions,
          categoriesData: categories,
          itemsData: items,
          promotionsData: promotions
        });
        throw new Error('Сервер вернул некорректные данные');
      }

      // Убеждаемся, что данные являются массивами
      const categoriesArray = Array.isArray(categories) ? categories : [];
      const itemsArray = Array.isArray(items) ? items : [];
      const promotionsArray = Array.isArray(promotions) ? promotions : [];

      console.log('📊 Menu loaded:', {
        categories: categoriesArray.length,
        items: itemsArray.length,
        promotions: promotionsArray.length
      });

      // Создаем категории с товарами
      let categoriesWithItems: MenuCategory[];
      
      // Проверяем, есть ли уже товары в категориях
      if (categoriesArray.length > 0 && (categoriesArray[0] as any).items) {
        // Бэкенд уже вернул категории с товарами
        categoriesWithItems = categoriesArray as MenuCategory[];
      } else {
        // Нужно создать категории с товарами
        categoriesWithItems = categoriesArray.map(category => ({
          ...category,
          items: itemsArray.filter((item: any) => item.category === category.id)
        }));
      }

      dispatch({ 
        type: 'SET_MENU_DATA', 
        payload: { 
          categories: categoriesWithItems, 
          items: itemsArray,
          promotions: promotionsArray
        } 
      });
      
      console.log('✅ Menu data loaded successfully');
    } catch (err: any) {
      console.error('❌ Error fetching menu:', err);
      const errorMessage = err?.message || err?.details?.message || 'Ошибка загрузки меню';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchPromotions = async () => {
    try {
      const response = await menuApi.getPromotions();
      
      if (!response.success) {
        throw new Error('Ошибка загрузки акций');
      }

      const promotions = response.data || [];

      // Убеждаемся, что промоции являются массивом
      const promotionsArray = Array.isArray(promotions) ? promotions : [];

      // Обновляем только промоции, не трогая остальное состояние
      dispatch({ 
        type: 'SET_PROMOTIONS', 
        payload: promotionsArray
      });
      
      console.log('✅ Promotions loaded:', promotions.length);
    } catch (err: any) {
      console.error('Error fetching promotions:', err);
      // Не устанавливаем ошибку для акций, так как это не критично
    }
  };

  const setFilters = (newFilters: Partial<MenuFilters>) => {
    dispatch({ type: 'SET_FILTERS', payload: newFilters });
  };

  const resetFilters = () => {
    dispatch({ type: 'RESET_FILTERS' });
  };

  const getFilteredItems = (): MenuItem[] => {
    let filtered = state.items || [];

    if (state.filters.search) {
      const searchLower = state.filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }

    if (state.filters.category) {
      filtered = filtered.filter(item => {
        const category = state.categories.find(cat => cat.name === state.filters.category);
        return category && item.category === category.id;
      });
    }

    filtered = filtered.filter(item => 
      item.price >= state.filters.priceRange[0] && 
      item.price <= state.filters.priceRange[1]
    );

    if (state.filters.showHits) {
      filtered = filtered.filter(item => item.is_hit);
    }

    if (state.filters.showNew) {
      filtered = filtered.filter(item => item.is_new);
    }

    return filtered;
  };

  const getCategoriesWithItems = (): MenuCategory[] => {
    return (state.categories || []).map(category => ({
      ...category,
      items: (state.items || []).filter(item => item.category === category.id)
    }));
  };

  const getAvailableCategories = (): MenuCategory[] => {
    return (state.categories || []).filter(category => 
      (state.items || []).some(item => item.category === category.id)
    );
  };

  const getActivePromotions = (): Promotion[] => {
    const now = new Date();
    const promotions = state.promotions || [];
    
    return promotions.filter(promotion => 
      promotion.is_active && 
      new Date(promotion.valid_from) <= now && 
      new Date(promotion.valid_to) >= now &&
      (!promotion.max_uses || promotion.usage_count < promotion.max_uses)
    );
  };

  const getHits = (): MenuItem[] => {
    return (state.items || []).filter(item => item.is_hit).sort((a, b) => a.priority - b.priority);
  };

  const getNewItems = (): MenuItem[] => {
    return (state.items || []).filter(item => item.is_new).sort((a, b) => a.priority - b.priority);
  };

  const value: MenuContextType = {
    state,
    fetchMenu,
    fetchPromotions,
    setFilters,
    resetFilters,
    getFilteredItems,
    getCategoriesWithItems,
    getAvailableCategories,
    getActivePromotions,
    getHits,
    getNewItems
  };

  return (
    <MenuContext.Provider value={value}>
      {children}
    </MenuContext.Provider>
  );
}; 