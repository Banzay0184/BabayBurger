import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { MenuItem, MenuCategory, MenuFilters, Promotion } from '../types/menu';
import { menuApi } from '../api/menu';
import { useClientWebSocket } from '../hooks/useClientWebSocket';

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
  | { type: 'RESET_FILTERS' }
  | { type: 'UPDATE_MENU_ITEM'; payload: { itemId: number; isActive: boolean; isAvailableNow?: boolean; availabilityStatus?: string; useTimeRestriction?: boolean } };

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
    case 'UPDATE_MENU_ITEM':
      return {
        ...state,
        items: state.items.map(item => 
          item.id === action.payload.itemId 
            ? { 
                ...item, 
                is_active: action.payload.isActive,
                is_available_now: action.payload.isAvailableNow,
                availability_status: action.payload.availabilityStatus,
                use_time_restriction: action.payload.useTimeRestriction
              }
            : item
        ),
        categories: state.categories.map(category => ({
          ...category,
          items: category.items.map(item =>
            item.id === action.payload.itemId
              ? { 
                  ...item, 
                  is_active: action.payload.isActive,
                  is_available_now: action.payload.isAvailableNow,
                  availability_status: action.payload.availabilityStatus,
                  use_time_restriction: action.payload.useTimeRestriction
                }
              : item
          )
        }))
      };
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
  getMenuItemById: (id: number) => MenuItem | undefined;
  refreshMenu: () => Promise<void>;
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

  // Функция принудительного обновления меню (с очисткой кэша)
  const refreshMenu = useCallback(async () => {
    console.log('🔄 Принудительное обновление меню...');
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      // Получаем свежие данные без использования кэша
      const [menuResponse, categoriesResponse, promotionsResponse] = await Promise.all([
        menuApi.getMenu(),
        menuApi.getCategories(),
        menuApi.getPromotions()
      ]);

      if (!menuResponse.success || !categoriesResponse.success || !promotionsResponse.success) {
        throw new Error('Ошибка загрузки данных меню');
      }

      const categories = categoriesResponse.data || [];
      const items = menuResponse.data?.all_items || menuResponse.data?.items || [];
      const promotions = promotionsResponse.data || [];

      console.log('📊 Menu refreshed:', {
        categories: categories.length,
        items: items.length,
        promotions: promotions.length
      });

      // Создаем категории с товарами
      let categoriesWithItems: MenuCategory[];
      
      if (items.length > 0) {
        // Группируем товары по категориям
        const itemsByCategory = items.reduce((acc: any, item: any) => {
          const categoryId = item.category;
          if (!acc[categoryId]) {
            acc[categoryId] = [];
          }
          acc[categoryId].push(item);
          return acc;
        }, {});

        // Создаем категории с товарами
        categoriesWithItems = categories.map(category => ({
          ...category,
          items: itemsByCategory[category.id] || []
        }));
      } else {
        categoriesWithItems = categories.map(category => ({
          ...category,
          items: []
        }));
      }

      dispatch({
        type: 'SET_MENU_DATA',
        payload: {
          categories: categoriesWithItems,
          items,
          promotions
        }
      });

      console.log('✅ Menu refreshed successfully');
    } catch (error: any) {
      console.error('❌ Error refreshing menu:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Ошибка обновления меню' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Обработчик WebSocket уведомлений о меню
  const handleMenuUpdate = useCallback((itemId: number, itemName: string, isActive: boolean, action: string, isAvailableNow?: boolean, availabilityStatus?: string, useTimeRestriction?: boolean) => {
    console.log('🍽️ Menu item updated via WebSocket:', { itemId, itemName, isActive, action });
    console.log('🕐 Time availability info:', { isAvailableNow, availabilityStatus, useTimeRestriction });
    
    // Если товар был создан или удален, принудительно обновляем все данные меню
    if (action === 'created' || action === 'deleted') {
      console.log('🔄 Принудительное обновление меню из-за создания/удаления товара');
      refreshMenu();
      return;
    }
    
    // Если изменилась доступность по времени, обновляем только локальное состояние
    if (useTimeRestriction && action === 'updated') {
      console.log('⏰ Обновление доступности по времени без перезагрузки меню');
      // Не вызываем refreshMenu() - обновляем только локальное состояние
    }
    
    // Для обновлений существующих товаров обновляем только локальное состояние
    dispatch({
      type: 'UPDATE_MENU_ITEM',
      payload: {
        itemId,
        isActive,
        isAvailableNow,
        availabilityStatus,
        useTimeRestriction
      }
    });
    
    // Показываем уведомления
    if (action === 'updated') {
      if (!isActive) {
        console.log(`🚫 Товар "${itemName}" деактивирован`);
      } else if (useTimeRestriction && isAvailableNow === false) {
        console.log(`⏰ Товар "${itemName}" скрыт по времени: ${availabilityStatus}`);
      } else if (useTimeRestriction && isAvailableNow === true) {
        console.log(`✅ Товар "${itemName}" доступен по времени: ${availabilityStatus}`);
      } else {
        console.log(`✅ Товар "${itemName}" активирован`);
      }
    }
  }, [refreshMenu]);

  // Обработчик WebSocket уведомлений о дополнениях
  const handleAddonUpdate = useCallback((addonId: number, addonName: string, isActive: boolean, action: string) => {
    console.log('➕ AddOn updated via WebSocket:', { addonId, addonName, isActive, action });
    
    // При любом изменении дополнений принудительно обновляем меню
    console.log('🔄 Принудительное обновление меню из-за изменения дополнения');
    refreshMenu();
  }, [refreshMenu]);

  // Обработчик WebSocket уведомлений о размерах
  const handleSizeUpdate = useCallback((sizeId: number, sizeName: string, isActive: boolean, action: string) => {
    console.log('📏 Size updated via WebSocket:', { sizeId, sizeName, isActive, action });
    
    // При любом изменении размеров принудительно обновляем меню
    console.log('🔄 Принудительное обновление меню из-за изменения размера');
    refreshMenu();
  }, [refreshMenu]);

  // Обработчик WebSocket уведомлений о необходимости обновления меню
  const handleMenuRefreshRequired = useCallback((reason: string) => {
    console.log('🔄 Menu refresh required via WebSocket:', reason);
    
    // Принудительно обновляем меню
    console.log('🔄 Принудительное обновление меню из-за:', reason);
    refreshMenu();
  }, [refreshMenu]);

  // WebSocket для получения обновлений меню в реальном времени
  useClientWebSocket({
    onMenuUpdate: handleMenuUpdate,
    onAddonUpdate: handleAddonUpdate,
    onSizeUpdate: handleSizeUpdate,
    onMenuRefreshRequired: handleMenuRefreshRequired,
    enabled: true
  });

  const fetchMenu = async () => {
    console.log('🚀 Loading menu data...');
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

      console.log('📊 Menu loaded:', {
        categories: categories.length,
        items: items.length,
        promotions: promotions.length
      });

      // Отладочная информация о статусе товаров
      const activeItems = items.filter((item: any) => item.is_active);
      const inactiveItems = items.filter((item: any) => !item.is_active);
      
      console.log('🔍 Items status:', {
        total: items.length,
        active: activeItems.length,
        inactive: inactiveItems.length,
        activeItems: activeItems.map((item: any) => ({ id: item.id, name: item.name, is_active: item.is_active })),
        inactiveItems: inactiveItems.map((item: any) => ({ id: item.id, name: item.name, is_active: item.is_active }))
      });

      // Создаем категории с товарами
      let categoriesWithItems: MenuCategory[];
      
      // Проверяем, есть ли уже товары в категориях
      if (categories.length > 0 && (categories[0] as any).items) {
        // Бэкенд уже вернул категории с товарами
        categoriesWithItems = categories as MenuCategory[];
      } else {
        // Нужно создать категории с товарами
        categoriesWithItems = categories.map(category => ({
          ...category,
          items: items.filter((item: any) => item.category === category.id)
        }));
      }

      dispatch({ 
        type: 'SET_MENU_DATA', 
        payload: { 
          categories: categoriesWithItems, 
          items: items,
          promotions: Array.isArray(promotions) ? promotions : []
        } 
      });
      
      console.log('✅ Menu data loaded successfully');
    } catch (err: any) {
      const errorMessage = err?.message || 'Ошибка загрузки меню';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Error fetching menu:', err);
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

      const promotions = Array.isArray(response.data) ? response.data : [];

      // Обновляем только промоции, не трогая остальное состояние
      dispatch({ 
        type: 'SET_PROMOTIONS', 
        payload: promotions
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
      items: (state.items || []).filter(item => item.category === category.id && item.is_active !== false)
    }));
  };

  const getAvailableCategories = (): MenuCategory[] => {
    const categories = (state.categories || []).filter(category => 
      (state.items || []).some(item => item.category === category.id && item.is_active !== false)
    );
    
    console.log('🔍 getAvailableCategories:', {
      totalCategories: state.categories?.length || 0,
      availableCategories: categories.length,
      categories: categories.map(cat => ({ id: cat.id, name: cat.name }))
    });
    
    return categories;
  };

  const getActivePromotions = (): Promotion[] => {
    const now = new Date();
    const promotions = Array.isArray(state.promotions) ? state.promotions : [];
    
    return promotions.filter(promotion => 
      promotion.is_active && 
      new Date(promotion.valid_from) <= now && 
      new Date(promotion.valid_to) >= now &&
      (!promotion.max_uses || promotion.usage_count < promotion.max_uses)
    );
  };

  const getHits = (): MenuItem[] => {
    const hits = (state.items || []).filter(item => item.is_hit && item.is_active !== false).sort((a, b) => a.priority - b.priority);
    
    console.log('🔍 getHits:', {
      totalItems: state.items?.length || 0,
      hitItems: hits.length,
      hits: hits.map(item => ({ id: item.id, name: item.name, is_hit: item.is_hit, is_active: item.is_active }))
    });
    
    return hits;
  };

  const getNewItems = (): MenuItem[] => {
    const newItems = (state.items || []).filter(item => item.is_new && item.is_active !== false).sort((a, b) => a.priority - b.priority);
    
    console.log('🔍 getNewItems:', {
      totalItems: state.items?.length || 0,
      newItemsCount: newItems.length,
      newItems: newItems.map(item => ({ id: item.id, name: item.name, is_new: item.is_new, is_active: item.is_active }))
    });
    
    return newItems;
  };

  const getMenuItemById = (id: number): MenuItem | undefined => {
    return (state.items || []).find(item => item.id === id);
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
    getNewItems,
    getMenuItemById,
    refreshMenu
  };

  return (
    <MenuContext.Provider value={value}>
      {children}
    </MenuContext.Provider>
  );
}; 