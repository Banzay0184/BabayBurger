import { cashierApi as unifiedCashierApi } from './unifiedClient';

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
  operator_order_number?: number;
  promo_code_info?: {
    code: string;
    discount_percent: number;
    max_discount: number;
  };
}

class CashierApiClient {
  private token: string | null = null; // Используется в конструкторе, login и logout

  constructor() {
    this.token = localStorage.getItem('cashier_token');
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
    localStorage.setItem('cashier_token', response.token);
    localStorage.setItem('cashier_data', JSON.stringify(response.cashier));

    return response;
  }

  logout(): void {
    this.token = null;
    unifiedCashierApi.removeToken();
    localStorage.removeItem('cashier_token');
    localStorage.removeItem('cashier_data');
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
    // Проверяем токен из localStorage, так как this.token может быть устаревшим
    const token = localStorage.getItem('cashier_token');
    // Также проверяем this.token для совместимости
    const hasToken = !!token || !!this.token;
    const unifiedAuth = unifiedCashierApi.isAuthenticated();
    
    console.log('🔍 Auth check:', {
      token: !!token,
      thisToken: !!this.token,
      hasToken,
      unifiedAuth,
      result: hasToken && unifiedAuth
    });
    
    return hasToken && unifiedAuth;
  }

  getCashierData(): CashierData | null {
    const cashierDataStr = localStorage.getItem('cashier_data');
    if (!cashierDataStr) return null;
    
    try {
      return JSON.parse(cashierDataStr);
    } catch {
      return null;
    }
  }
}

export const cashierApi = new CashierApiClient();
