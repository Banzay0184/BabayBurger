const API_BASE_URL = '/api/cashier';

export interface CashierLoginData {
  username: string;
  password: string;
}

export interface CashierData {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  restaurant: {
    id: number;
    name: string;
    city: string;
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
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('cashier_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Token ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async login(loginData: CashierLoginData): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(loginData),
    });

    this.token = response.token;
    localStorage.setItem('cashier_token', response.token);
    localStorage.setItem('cashier_data', JSON.stringify(response.cashier));

    return response;
  }

  logout(): void {
    this.token = null;
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
    return !!this.token;
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
