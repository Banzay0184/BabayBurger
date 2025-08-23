import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import type { ReactNode } from 'react';
import type { MenuItem, SizeOption, AddOn, CartItem, CartState } from '../types/menu';

type CartAction =
  | { type: 'INIT'; payload: CartState }
  | { type: 'ADD_ITEM'; payload: { menuItem: MenuItem; sizeOption?: SizeOption; addOns?: AddOn[] } }
  | { type: 'INCREMENT_BY_KEY'; payload: { key: string } }
  | { type: 'DECREMENT_BY_KEY'; payload: { key: string } }
  | { type: 'REMOVE_BY_KEY'; payload: { key: string } }
  | { type: 'CLEAR' };

interface InternalCartItem extends CartItem {
  key: string;
}

interface InternalCartState extends CartState {
  items: InternalCartItem[];
}

interface CartContextType {
  state: InternalCartState;
  addItem: (menuItem: MenuItem, sizeOption?: SizeOption, addOns?: AddOn[]) => void;
  incrementByKey: (key: string) => void;
  decrementByKey: (key: string) => void;
  removeByKey: (key: string) => void;
  clear: () => void;
  getItemCountForMenuItem: (menuItemId: number) => number;
  getItemByKey: (key: string) => InternalCartItem | undefined;
}

const STORAGE_KEY = 'cart_state_v1';

const initialState: InternalCartState = {
  items: [],
  total: 0,
  discount: 0,
  deliveryFee: 0,
  finalTotal: 0,
};

function generateItemKey(menuItem: MenuItem, sizeOption?: SizeOption, addOns?: AddOn[]): string {
  const sizeId = sizeOption?.id ?? 0;
  const addOnIds = (addOns ?? []).map(a => a.id).sort((a, b) => a - b).join(',');
  return `${menuItem.id}|${sizeId}|${addOnIds}`;
}

function calculateUnitPrice(menuItem: MenuItem, sizeOption?: SizeOption, addOns?: AddOn[]): number {
  const basePrice = Number(menuItem.price) || 0;
  const sizeMod = sizeOption ? Number(sizeOption.price_modifier) || 0 : 0;
  const addOnsSum = (addOns ?? []).reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  const total = basePrice + sizeMod + addOnsSum;
  console.log('💰 CartContext - calculateUnitPrice:', {
    basePrice,
    sizeMod,
    addOnsSum,
    total,
    rounded: Math.round(total)
  });
  return Math.round(total);
}

function recalcTotals(items: InternalCartItem[]): Pick<CartState, 'total' | 'finalTotal'> {
  const total = Math.round(items.reduce((sum, it) => sum + it.totalPrice, 0));
  // Пока без скидок/доставки
  console.log('🔄 CartContext - recalcTotals:', {
    itemsCount: items.length,
    itemsTotalPrices: items.map(it => ({ key: it.key, totalPrice: it.totalPrice })),
    total,
    finalTotal: total
  });
  return { total, finalTotal: total };
}

function cartReducer(state: InternalCartState, action: CartAction): InternalCartState {
  switch (action.type) {
    case 'INIT': {
      return action.payload as InternalCartState;
    }
    case 'ADD_ITEM': {
      const { menuItem, sizeOption, addOns } = action.payload;
      const key = generateItemKey(menuItem, sizeOption, addOns);
      const unitPrice = calculateUnitPrice(menuItem, sizeOption, addOns);

      const existingIndex = state.items.findIndex(i => i.key === key);
      let newItems: InternalCartItem[];

      if (existingIndex >= 0) {
        // Если уже есть такой элемент - увеличиваем количество
        const updated = { ...state.items[existingIndex] };
        updated.quantity += 1;
        updated.totalPrice = Math.round(updated.quantity * unitPrice);
        newItems = [...state.items];
        newItems[existingIndex] = updated;
      } else {
        // Если нет - создаем новый элемент
        const newItem: InternalCartItem = {
          key,
          menuItem,
          quantity: 1,
          sizeOption,
          addOns: addOns ?? [],
          totalPrice: Math.round(unitPrice),
        };
        newItems = [newItem, ...state.items];
      }

      const totals = recalcTotals(newItems);
      return { ...state, items: newItems, ...totals };
    }
    case 'INCREMENT_BY_KEY': {
      const idx = state.items.findIndex(i => i.key === action.payload.key);
      if (idx < 0) return state;
      const item = state.items[idx];
      const unit = calculateUnitPrice(item.menuItem, item.sizeOption, item.addOns);
      const updated = { ...item, quantity: item.quantity + 1, totalPrice: Math.round((item.quantity + 1) * unit) };
      const items = [...state.items];
      items[idx] = updated;
      const totals = recalcTotals(items);
      return { ...state, items, ...totals };
    }
    case 'DECREMENT_BY_KEY': {
      const idx = state.items.findIndex(i => i.key === action.payload.key);
      if (idx < 0) return state;
      const item = state.items[idx];
      const unit = calculateUnitPrice(item.menuItem, item.sizeOption, item.addOns);
      const newQty = item.quantity - 1;
      let items: InternalCartItem[];
      if (newQty <= 0) {
        items = state.items.filter(i => i.key !== action.payload.key);
      } else {
        const updated = { ...item, quantity: newQty, totalPrice: Math.round(newQty * unit) };
        items = [...state.items];
        items[idx] = updated;
      }
      const totals = recalcTotals(items);
      return { ...state, items, ...totals };
    }
    case 'REMOVE_BY_KEY': {
      const items = state.items.filter(i => i.key !== action.payload.key);
      const totals = recalcTotals(items);
      return { ...state, items, ...totals };
    }
    case 'CLEAR': {
      return { ...initialState };
    }
    default:
      return state;
  }
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const [isInitialized, setIsInitialized] = useState(false);

  // Инициализация из localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      console.log('🛒 CartContext - Loading from localStorage:', raw);
      if (raw) {
        const parsed = JSON.parse(raw) as InternalCartState;
        console.log('🛒 CartContext - Parsed cart data:', parsed);
        dispatch({ type: 'INIT', payload: parsed });
      }
    } catch (e) {
      console.warn('Failed to restore cart from storage', e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Сохранение в localStorage (только после инициализации)
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      console.log('🛒 CartContext - Saving to localStorage:', state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to persist cart', e);
    }
  }, [state, isInitialized]);

  const addItem = (menuItem: MenuItem, sizeOption?: SizeOption, addOns?: AddOn[]) => {
    dispatch({ type: 'ADD_ITEM', payload: { menuItem, sizeOption, addOns } });
  };

  const incrementByKey = (key: string) => {
    dispatch({ type: 'INCREMENT_BY_KEY', payload: { key } });
  };

  const decrementByKey = (key: string) => {
    dispatch({ type: 'DECREMENT_BY_KEY', payload: { key } });
  };

  const removeByKey = (key: string) => {
    dispatch({ type: 'REMOVE_BY_KEY', payload: { key } });
  };

  const clear = () => dispatch({ type: 'CLEAR' });

  const getItemCountForMenuItem = (menuItemId: number) => {
    return state.items.filter(i => i.menuItem.id === menuItemId).reduce((sum, i) => sum + i.quantity, 0);
  };

  const getItemByKey = (key: string) => {
    return state.items.find(i => i.key === key);
  };

  const value = useMemo<CartContextType>(() => ({
    state,
    addItem,
    incrementByKey,
    decrementByKey,
    removeByKey,
    clear,
    getItemCountForMenuItem,
    getItemByKey,
  }), [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
