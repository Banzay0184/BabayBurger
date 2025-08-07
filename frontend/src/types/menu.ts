export interface SizeOption {
  id: number;
  name: string;
  price_modifier: number;
  description?: string;
  menu_item?: number;
  is_active: boolean;
}

export interface AddOn {
  id: number;
  name: string;
  price: number;
  category?: number;
  available_for_categories?: number[];
  is_active: boolean;
}

export interface Promotion {
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

export interface Category {
  id: number;
  name: string;
  description?: string;
  image?: string;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: number;
  image?: string;
  created_at: string;
  is_hit: boolean;
  is_new: boolean;
  priority: number;
  size_options: SizeOption[];
  add_on_options: AddOn[];
}

export interface MenuCategory {
  id: number;
  name: string;
  description?: string;
  image?: string;
  items: MenuItem[];
}

export interface MenuFilters {
  search: string;
  category: string | null;
  priceRange: [number, number];
  allergens: string[];
  showHits: boolean;
  showNew: boolean;
}

export interface MenuState {
  categories: MenuCategory[];
  items: MenuItem[];
  promotions: Promotion[];
  filters: MenuFilters;
  isLoading: boolean;
  error: string | null;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  sizeOption?: SizeOption;
  addOns: AddOn[];
  totalPrice: number;
}

export interface CartState {
  items: CartItem[];
  total: number;
  discount: number;
  deliveryFee: number;
  finalTotal: number;
  appliedPromotion?: Promotion;
}

export interface Address {
  id: number;
  user: number;
  street: string;
  house_number: string;
  apartment?: string;
  city: string;
  latitude?: number;
  longitude?: number;
  is_primary: boolean;
  phone_number: string;
  comment?: string;
  full_address: string;
  coordinates?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryZone {
  id: number;
  name: string;
  city: string;
  center_latitude: number;
  center_longitude: number;
  radius_km: number;
  delivery_fee: number;
  min_order_amount?: number;
  is_active: boolean;
}

export interface OrderItem {
  id: number;
  menu_item: MenuItem;
  quantity: number;
  size_option?: SizeOption;
  add_ons: AddOn[];
}

export interface Order {
  id: number;
  user: number;
  items: OrderItem[];
  total_price: number;
  status: 'pending' | 'preparing' | 'delivering' | 'completed' | 'cancelled';
  address: Address;
  created_at: string;
  updated_at: string;
  promotion?: Promotion;
  delivery_fee: number;
  discounted_total: number;
  delivery_time?: string;
  notes?: string;
} 