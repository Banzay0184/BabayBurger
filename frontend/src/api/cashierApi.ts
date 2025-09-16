import { cashierApi as unifiedCashierApi } from './unifiedClient';
import { universalStorage } from '../utils/storage';

const API_BASE_URL = 'cashier';

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
  total_price: number;
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
  final_price: number;
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
  private token: string | null = null; // Используется в конструкторе, login и logout

  constructor() {
    this.token = universalStorage.getItem('cashier_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Используем унифицированный клиент для запросов
    const method = options.method || 'GET';
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      let response: T;
      
      switch (method.toUpperCase()) {
        case 'GET':
          response = await unifiedCashierApi.get<T>(url);
          break;
        case 'POST':
          response = await unifiedCashierApi.post<T>(url, options.body ? JSON.parse(options.body as string) : undefined);
          break;
        case 'PUT':
          response = await unifiedCashierApi.put<T>(url, options.body ? JSON.parse(options.body as string) : undefined);
          break;
        case 'PATCH':
          response = await unifiedCashierApi.patch<T>(url, options.body ? JSON.parse(options.body as string) : undefined);
          break;
        case 'DELETE':
          response = await unifiedCashierApi.delete<T>(url);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
      
      return response;
    } catch (error: any) {
      throw new Error(error.message || `HTTP error! status: ${error.code}`);
    }
  }

  async login(loginData: CashierLoginData): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(loginData),
    });

    // Обновляем токен в экземпляре класса
    this.token = response.token;
    unifiedCashierApi.setToken(response.token);
    universalStorage.setItem('cashier_token', response.token);
    universalStorage.setItem('cashier_data', JSON.stringify(response.cashier));

    return response;
  }

  logout(): void {
    this.token = null;
    unifiedCashierApi.removeToken();
    universalStorage.removeItem('cashier_token');
    universalStorage.removeItem('cashier_data');
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/orders/dashboard/');
  }

  async getOrders(): Promise<Order[]> {
    return this.request<Order[]>('/orders/');
  }

  async searchOrders(query: string): Promise<{ orders: Order[]; query: string; count: number }> {
    return this.request<{ orders: Order[]; query: string; count: number }>(`/orders/search/?q=${encodeURIComponent(query)}`);
  }

  async getOrderDetails(orderId: number): Promise<Order> {
    return this.request<Order>(`/orders/${orderId}/`);
  }

  async startProcessingOrder(orderId: number): Promise<{ message: string; order: Order }> {
    return this.request<{ message: string; order: Order }>(`/orders/${orderId}/start_processing/`, {
      method: 'POST',
    });
  }

  async markOrderReady(orderId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/orders/${orderId}/mark_ready/`, {
      method: 'POST',
    });
  }

  async markOrderDelivering(orderId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/orders/${orderId}/mark_delivering/`, {
      method: 'POST',
    });
  }

  async completeOrder(orderId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/orders/${orderId}/complete/`, {
      method: 'POST',
    });
  }

  isAuthenticated(): boolean {
    // Проверяем токен из универсального хранилища
    const token = universalStorage.getItem('cashier_token');
    // Также проверяем this.token для совместимости
    const hasToken = !!token || !!this.token;
    const unifiedAuth = unifiedCashierApi.isAuthenticated();
    
    console.log('🔍 Auth check:', {
      token: !!token,
      thisToken: !!this.token,
      hasToken,
      unifiedAuth,
      result: hasToken && unifiedAuth,
      storageType: universalStorage.getStorageInfo().type
    });
    
    return hasToken && unifiedAuth;
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
    return this.request<StopListMenuResponse>('/stoplist/menu/');
  }

  async toggleMenuItemStatus(itemId: number): Promise<ToggleStatusResponse> {
    return this.request<ToggleStatusResponse>(`/stoplist/${itemId}/toggle_status/`, {
      method: 'POST',
    });
  }

  async getInactiveItems(): Promise<InactiveItemsResponse> {
    return this.request<InactiveItemsResponse>('/stoplist/inactive_items/');
  }

  // Методы для работы с дополнениями
  async getAddons(): Promise<AddOnsResponse> {
    return this.request<AddOnsResponse>('/stoplist/addons/');
  }

  async toggleAddonStatus(addonId: number): Promise<ToggleAddOnResponse> {
    return this.request<ToggleAddOnResponse>(`/stoplist/${addonId}/toggle_addon_status/`, {
      method: 'POST',
    });
  }

  async getInactiveAddons(): Promise<{ inactive_addons: AddOn[]; count: number }> {
    return this.request<{ inactive_addons: AddOn[]; count: number }>('/stoplist/inactive_addons/');
  }

  // Методы для работы с размерами
  async getSizes(): Promise<SizesResponse> {
    return this.request<SizesResponse>('/stoplist/sizes/');
  }

  async toggleSizeStatus(sizeId: number): Promise<ToggleSizeResponse> {
    return this.request<ToggleSizeResponse>(`/stoplist/${sizeId}/toggle_size_status/`, {
      method: 'POST',
    });
  }
}

export const cashierApi = new CashierApiClient();
