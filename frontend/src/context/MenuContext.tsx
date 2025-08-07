import React, { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { MenuItem, MenuCategory, MenuFilters, Promotion } from '../types/menu';

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
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
};

interface MenuProviderProps {
  children: ReactNode;
}

export const MenuProvider: React.FC<MenuProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(menuReducer, initialState);

  const fetchMenu = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const mockData = await getMockMenuData();
      dispatch({ 
        type: 'SET_MENU_DATA', 
        payload: { 
          categories: mockData.categories, 
          items: mockData.items,
          promotions: mockData.promotions
        } 
      });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Ошибка загрузки меню' });
      console.error('Error fetching menu:', err);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchPromotions = async () => {
    try {
      const mockPromotions = await getMockPromotions();
      dispatch({ 
        type: 'SET_MENU_DATA', 
        payload: { 
          categories: state.categories, 
          items: state.items,
          promotions: mockPromotions
        } 
      });
    } catch (err) {
      console.error('Error fetching promotions:', err);
    }
  };

  const setFilters = (newFilters: Partial<MenuFilters>) => {
    dispatch({ type: 'SET_FILTERS', payload: newFilters });
  };

  const resetFilters = () => {
    dispatch({ type: 'RESET_FILTERS' });
  };

  const getFilteredItems = (): MenuItem[] => {
    let filtered = state.items;

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
    return state.categories.map(category => ({
      ...category,
      items: state.items.filter(item => item.category === category.id)
    }));
  };

  const getAvailableCategories = (): MenuCategory[] => {
    return state.categories.filter(category => 
      state.items.some(item => item.category === category.id)
    );
  };

  const getActivePromotions = (): Promotion[] => {
    const now = new Date();
    return state.promotions.filter(promotion => 
      promotion.is_active && 
      new Date(promotion.valid_from) <= now && 
      new Date(promotion.valid_to) >= now &&
      (!promotion.max_uses || promotion.usage_count < promotion.max_uses)
    );
  };

  const getHits = (): MenuItem[] => {
    return state.items.filter(item => item.is_hit).sort((a, b) => a.priority - b.priority);
  };

  const getNewItems = (): MenuItem[] => {
    return state.items.filter(item => item.is_new).sort((a, b) => a.priority - b.priority);
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

// Mock данные для разработки
async function getMockMenuData() {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    categories: [
      {
        id: 1,
        name: 'Бургеры',
        description: 'Классические и авторские бургеры',
        items: []
      },
      {
        id: 2,
        name: 'Напитки',
        description: 'Холодные и горячие напитки',
        items: []
      },
      {
        id: 3,
        name: 'Гарниры',
        description: 'Картошка фри, начос и другие гарниры',
        items: []
      },
      {
        id: 4,
        name: 'Десерты',
        description: 'Сладкие угощения',
        items: []
      }
    ],
    items: [
      {
        id: 1,
        name: 'Классический бургер',
        description: 'Сочная котлета с овощами и соусом',
        price: 450,
        category: 1,
        created_at: '2024-01-01T00:00:00Z',
        is_hit: true,
        is_new: false,
        priority: 1,
        size_options: [
          { id: 1, name: 'Маленький', price_modifier: 0, description: '25 см', menu_item: 1, is_active: true },
          { id: 2, name: 'Большой', price_modifier: 200, description: '30 см', menu_item: 1, is_active: true }
        ],
        add_on_options: [
          { id: 1, name: 'Сыр', price: 50, category: 1, is_active: true },
          { id: 2, name: 'Бекон', price: 100, category: 1, is_active: true }
        ]
      },
      {
        id: 2,
        name: 'Чизбургер',
        description: 'Бургер с плавленым сыром',
        price: 500,
        category: 1,
        created_at: '2024-01-01T00:00:00Z',
        is_hit: true,
        is_new: false,
        priority: 2,
        size_options: [],
        add_on_options: []
      },
      {
        id: 3,
        name: 'Биг Бургер',
        description: 'Двойная котлета с беконом',
        price: 650,
        category: 1,
        created_at: '2024-01-01T00:00:00Z',
        is_hit: false,
        is_new: true,
        priority: 1,
        size_options: [],
        add_on_options: []
      },
      {
        id: 4,
        name: 'Кола',
        description: 'Газированный напиток',
        price: 150,
        category: 2,
        created_at: '2024-01-01T00:00:00Z',
        is_hit: false,
        is_new: false,
        priority: 0,
        size_options: [],
        add_on_options: []
      },
      {
        id: 5,
        name: 'Картошка фри',
        description: 'Хрустящая картошка с солью',
        price: 200,
        category: 3,
        created_at: '2024-01-01T00:00:00Z',
        is_hit: true,
        is_new: false,
        priority: 1,
        size_options: [],
        add_on_options: []
      },
      {
        id: 6,
        name: 'Чизкейк',
        description: 'Классический чизкейк',
        price: 300,
        category: 4,
        created_at: '2024-01-01T00:00:00Z',
        is_hit: false,
        is_new: true,
        priority: 1,
        size_options: [],
        add_on_options: []
      }
    ],
    promotions: []
  };
}

async function getMockPromotions() {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return [
    {
      id: 1,
      name: 'Скидка 20% на все',
      description: 'Скидка 20% на все блюда при заказе от 1000 ₽',
      discount_type: 'PERCENT' as const,
      discount_value: 20,
      min_order_amount: 1000,
      max_discount: 500,
      usage_count: 0,
      max_uses: 100,
      valid_from: '2024-01-01T00:00:00Z',
      valid_to: '2024-12-31T23:59:59Z',
      is_active: true,
      applicable_items: [],
      free_item: undefined,
      free_addon: undefined
    },
    {
      id: 2,
      name: 'Бесплатная доставка',
      description: 'Бесплатная доставка при заказе от 1500 ₽',
      discount_type: 'FREE_DELIVERY' as const,
      discount_value: 0,
      min_order_amount: 1500,
      max_discount: undefined,
      usage_count: 0,
      max_uses: 50,
      valid_from: '2024-01-01T00:00:00Z',
      valid_to: '2024-12-31T23:59:59Z',
      is_active: true,
      applicable_items: [],
      free_item: undefined,
      free_addon: undefined
    }
  ];
} 