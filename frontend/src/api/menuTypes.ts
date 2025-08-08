import type { ApiResponse } from './types';

// Типы для API меню
export interface ApiMenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: number;
  image?: string;
  created_at: string;
  is_hit: boolean;
  is_new: boolean;
  is_active: boolean;
  priority: number;
  size_options: ApiSizeOption[];
  add_on_options: ApiAddOn[];
}

export interface ApiSizeOption {
  id: number;
  name: string;
  price_modifier: number;
  description?: string;
  menu_item?: number;
  is_active: boolean;
}

export interface ApiAddOn {
  id: number;
  name: string;
  price: number;
  category?: number;
  available_for_categories?: number[];
  is_active: boolean;
}

export interface ApiCategory {
  id: number;
  name: string;
  description?: string;
  image?: string;
}

export interface ApiPromotion {
  id: number;
  name: string;
  description: string;
  discount_type: 'PERCENT' | 'FIXED_AMOUNT' | 'FREE_ITEM' | 'FREE_DELIVERY';
  discount_value: number;
  min_order_amount?: number;
  max_discount?: number;
  usage_count: number;
  max_uses?: number;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
  applicable_items?: number[];
  free_item?: number;
  free_addon?: number;
}

export interface ApiMenuResponse {
  categories: ApiCategory[];
  all_items: ApiMenuItem[]; // Бэкенд возвращает all_items
  items?: ApiMenuItem[]; // Для обратной совместимости
  total_items: number;
  total_categories: number;
}

export interface ApiSearchParams {
  query?: string;
  category?: number;
  min_price?: number;
  max_price?: number;
  is_hit?: boolean;
  is_new?: boolean;
  is_featured?: boolean;
}

export interface ApiPriceRange {
  min_price: number;
  max_price: number;
}

export interface ApiStatistics {
  total_items: number;
  total_categories: number;
  total_promotions: number;
  hits_count: number;
  new_items_count: number;
} 