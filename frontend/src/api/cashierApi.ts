import { cashierApi as unifiedCashierApi } from './unifiedClient';
import { universalStorage } from '../utils/storage';

export interface CashierLoginData {
  username: string;
  password: string;
}

export interface CashierData {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  processed_orders_count?: number;
  restaurant: {
    id: number;
    name: string;
    city: string;
    address?: string;
  };
}

export interface LoginResponse {
  message: string;
  token: string;
  cashier: CashierData;
}

export interface DashboardStats {
  total_orders: number;
  preparing_orders: number;
  ready_orders: number;
  delivering_orders: number;
  completed_orders: number;
  restaurant_name: string;
}

export interface OrderItem {
  id: number;
  menu_item_name: string;
  quantity: number;
  size_option_name?: string;
  add_ons_names: string[];
  total_price: number;
}

export interface ReceiptPhoto {
  id: number;
  photo_url: string;
  driver_name: string;
  delivered_at: string;
  status: string;
}

export interface Order {
  id: number;
  user_info: {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
  };
  restaurant_info: {
    id: number;
    name: string;
    address: string;
    city: string;
    phone: string;
  };
  items_details: OrderItem[];
  total_price: string;
  status: string;
  service_type: 'delivery' | 'pickup';
  payment_method: string;
  address_info?: {
    id: number;
    full_address: string;
    city: string;
    phone_number: string;
    latitude: number;
    longitude: number;
  };
  phone: string;
  created_at: string;
  updated_at: string;
  delivery_fee: number;
  discount_amount: number;
  final_price: string;
  notes: string;
  cashier_processing_status?: string;
  cashier_processing_details?: {
    status: string;
    status_display: string;
    received_at: string;
    started_preparing_at?: string;
    ready_at?: string;
    completed_at?: string;
    notes?: string;
    estimated_time?: number;
    cashier_name?: string;
  };
  operator_order_number?: number;
  promo_code_info?: {
    code: string;
    discount_percent: number;
    max_discount: number;
  };
  receipt_photos?: ReceiptPhoto[];
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image?: string;
  is_active: boolean;
  is_hit: boolean;
  is_new: boolean;
  priority: number;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  image?: string;
  items: MenuItem[];
  item_count: number;
}

export interface StopListMenuResponse {
  categories: Category[];
  restaurant_name: string;
}

export interface ToggleStatusResponse {
  message: string;
  item: {
    id: number;
    name: string;
    is_active: boolean;
  };
}

export interface InactiveItemsResponse {
  inactive_items: MenuItem[];
  count: number;
}

export interface AddOn {
  id: number;
  name: string;
  price: number;
  categories: Array<{
    id: number;
    name: string;
  }>;
  is_active: boolean;
  created_at: string;
}

export interface SizeOption {
  id: number;
  name: string;
  price_modifier: number;
  is_active: boolean;
  created_at: string;
}

export interface AddOnsResponse {
  addons: AddOn[];
  restaurant_name: string;
}

export interface SizesResponse {
  sizes: SizeOption[];
  restaurant_name: string;
}

export interface ToggleAddOnResponse {
  message: string;
  addon: {
    id: number;
    name: string;
    is_active: boolean;
  };
}

export interface ToggleSizeResponse {
  message: string;
  size: {
    id: number;
    name: string;
    is_active: boolean;
  };
}

class CashierApiClient {
  async login(loginData: CashierLoginData): Promise<LoginResponse> {
    // Для логина пропускаем заголовок Authorization, чтобы не отправлять старый токен
    const response = await unifiedCashierApi.post<LoginResponse>('cashier/auth/login/', loginData, {
      headers: { 'X-Skip-Auth': 'true' }
    });

    unifiedCashierApi.setToken(response.token);
    universalStorage.setItem('cashier_token', response.token);
    universalStorage.setItem('cashier_data', JSON.stringify(response.cashier));

    return response;
  }

  logout(): void {
    unifiedCashierApi.removeToken();
    universalStorage.removeItem('cashier_token');
    universalStorage.removeItem('cashier_data');
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return unifiedCashierApi.get<DashboardStats>('cashier/orders/dashboard/');
  }

  async getOrders(): Promise<Order[]> {
    return unifiedCashierApi.get<Order[]>('cashier/orders/');
  }

  async searchOrders(query: string): Promise<{ orders: Order[]; query: string; count: number }> {
    return unifiedCashierApi.get<{ orders: Order[]; query: string; count: number }>(`cashier/orders/search/?q=${encodeURIComponent(query)}`);
  }

  async getOrderDetails(orderId: number): Promise<Order> {
    return unifiedCashierApi.get<Order>(`cashier/orders/${orderId}/`);
  }

  async startProcessingOrder(orderId: number): Promise<{ message: string; order: Order }> {
    return unifiedCashierApi.post<{ message: string; order: Order }>(`cashier/orders/${orderId}/start_processing/`);
  }

  async markOrderReady(orderId: number): Promise<{ message: string }> {
    return unifiedCashierApi.post<{ message: string }>(`cashier/orders/${orderId}/mark_ready/`);
  }

  async markOrderDelivering(orderId: number): Promise<{ message: string }> {
    return unifiedCashierApi.post<{ message: string }>(`cashier/orders/${orderId}/mark_delivering/`);
  }

  async completeOrder(orderId: number): Promise<{ message: string }> {
    return unifiedCashierApi.post<{ message: string }>(`cashier/orders/${orderId}/complete/`);
  }

  isAuthenticated(): boolean {
    return unifiedCashierApi.isAuthenticated();
  }

  getCashierData(): CashierData | null {
    const cashierDataStr = universalStorage.getItem('cashier_data');
    if (!cashierDataStr) return null;
    try {
      return JSON.parse(cashierDataStr);
    } catch {
      return null;
    }
  }

  // Методы для работы со стоп-листом
  async getStopListMenu(): Promise<StopListMenuResponse> {
    return unifiedCashierApi.get<StopListMenuResponse>('cashier/stoplist/menu/');
  }

  async toggleMenuItemStatus(itemId: number): Promise<ToggleStatusResponse> {
    return unifiedCashierApi.post<ToggleStatusResponse>(`cashier/stoplist/${itemId}/toggle_status/`);
  }

  async getInactiveItems(): Promise<InactiveItemsResponse> {
    return unifiedCashierApi.get<InactiveItemsResponse>('cashier/stoplist/inactive_items/');
  }

  // Методы для работы с дополнениями
  async getAddons(): Promise<AddOnsResponse> {
    return unifiedCashierApi.get<AddOnsResponse>('cashier/stoplist/addons/');
  }

  async toggleAddonStatus(addonId: number): Promise<ToggleAddOnResponse> {
    return unifiedCashierApi.post<ToggleAddOnResponse>(`cashier/stoplist/${addonId}/toggle_addon_status/`);
  }

  async getInactiveAddons(): Promise<{ inactive_addons: AddOn[]; count: number }> {
    return unifiedCashierApi.get<{ inactive_addons: AddOn[]; count: number }>('cashier/stoplist/inactive_addons/');
  }

  // Методы для работы с размерами
  async getSizes(): Promise<SizesResponse> {
    return unifiedCashierApi.get<SizesResponse>('cashier/stoplist/sizes/');
  }

  async toggleSizeStatus(sizeId: number): Promise<ToggleSizeResponse> {
    return unifiedCashierApi.post<ToggleSizeResponse>(`cashier/stoplist/${sizeId}/toggle_size_status/`);
  }
}

export const cashierApi = new CashierApiClient();
