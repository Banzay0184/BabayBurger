export interface User {
  id: number;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  phone_number?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
  message?: string;
  success?: boolean; // Добавляем для совместимости с Telegram Login Widget
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

export interface TelegramAuthRequest {
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface DeliveryZone {
  id: number;
  name: string;
  city: string;
  delivery_fee: number;
  min_order_amount: number;
  is_active: boolean;
}

export interface Address {
  id: number;
  user: number;
  street: string;
  house_number: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  intercom?: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
  delivery_zone?: DeliveryZone;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  category: string;
  is_available: boolean;
  is_vegetarian: boolean;
  is_spicy: boolean;
  preparation_time: number;
  size_options: SizeOption[];
  addons: AddOn[];
}

export interface SizeOption {
  id: number;
  name: string;
  price_modifier: number;
}

export interface AddOn {
  id: number;
  name: string;
  price: number;
  is_available: boolean;
}

export interface Promotion {
  id: number;
  title: string;
  description: string;
  discount_percent: number;
  min_order_amount: number;
  max_discount_amount: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  applicable_items: number[];
} 