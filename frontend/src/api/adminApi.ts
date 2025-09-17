import { getAdminApiUrl } from '../config/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
}

interface DashboardResponse {
  stats: any;
  top_items: any[];
  daily_stats: any[];
}

interface AnalyticsResponse {
  period: string;
  start_date: string;
  end_date: string;
  orders_by_status: Array<{
    status: string;
    count: number;
  }>;
  daily_stats: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
  top_categories: Array<{
  id: number;
  name: string;
    orders_count: number;
    revenue: number;
  }>;
  top_items: Array<{
  id: number;
  name: string;
    orders_count: number;
    quantity_sold: number;
    revenue: number;
  }>;
}

class AdminApiClient {
  constructor() {
    // Не храним baseUrl, используем getAdminApiUrl() для каждого запроса
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = getAdminApiUrl(endpoint);
      
      // Получаем токен из localStorage
      const token = localStorage.getItem('admin_token');
      
      // Отладочная информация
      console.log('🔐 Admin API Request:', {
        url,
        token: token ? `${token.substring(0, 10)}...` : 'No token',
        endpoint
      });
      
      const headers: any = {
        // Добавляем токен аутентификации если он есть
        ...(token && { 'Authorization': `Bearer ${token}` }),
        // Передаем заголовки из options в конце, чтобы они могли перезаписать наши
        ...options.headers,
      };
      
      // Добавляем Content-Type только если он не передан в options и это не FormData
      if (!options.headers || !(options.headers as any)['Content-Type']) {
        if (!(options.body instanceof FormData)) {
          headers['Content-Type'] = 'application/json';
        }
        // Для FormData не устанавливаем Content-Type, браузер установит его автоматически с boundary
      }
      
      console.log('📤 Request headers:', headers);
      console.log('🔐 Authorization header:', headers.Authorization);
      console.log('📋 Content-Type header:', headers['Content-Type']);
      
      const response = await fetch(url, {
        headers,
        ...options,
      });

      console.log('📥 Response status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('📥 Response data:', data);

      if (!response.ok) {
        console.error('❌ API Error:', data);
        return { error: data.error || 'Ошибка сервера' };
      }

      console.log('✅ API Success:', data);
      return { data, success: true };
    } catch (error) {
      return { error: 'Ошибка сети' };
    }
  }

  // Специальный метод для FormData запросов
  private async requestFormData<T>(
    endpoint: string,
    formData: FormData,
    method: string = 'POST'
  ): Promise<ApiResponse<T>> {
    try {
      const url = getAdminApiUrl(endpoint);
      
      // Получаем токен из localStorage
      const token = localStorage.getItem('admin_token');
      
      // Отладочная информация
      console.log('🔐 FormData API Request:', {
        url,
        token: token ? `${token.substring(0, 10)}...` : 'No token',
        endpoint,
        method
      });
      
      const headers: any = {};
      
      // Добавляем токен аутентификации если он есть
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('📤 FormData Request headers:', headers);
      console.log('🔐 Authorization header:', headers.Authorization);
      
      const response = await fetch(url, {
        method,
        headers,
        body: formData, // Не устанавливаем Content-Type для FormData
      });

      console.log('📥 FormData Response status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('📥 FormData Response data:', data);

      if (!response.ok) {
        console.error('❌ FormData API Error:', data);
        return { error: data.error || 'Ошибка сервера' };
      }

      console.log('✅ FormData API Success:', data);
      return { data, success: true };
    } catch (error) {
      console.error('❌ FormData Network Error:', error);
      return { error: 'Ошибка сети' };
    }
  }

  // Прямой запрос без admin-panel префикса
  private async requestDirect<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'https://api.babayfood.uz';
      const url = `${baseUrl}/${endpoint}`;
      
      // Получаем токен из localStorage
      const token = localStorage.getItem('admin_token');
      
      // Отладочная информация
      console.log('🔐 Direct API Request:', {
        url,
        token: token ? `${token.substring(0, 10)}...` : 'No token',
        endpoint
      });
      
      const headers = {
        'Content-Type': 'application/json',
        // Добавляем токен аутентификации если он есть
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      };
      
      console.log('📤 Request headers:', headers);
      
      const response = await fetch(url, {
        headers,
        ...options,
      });

      console.log('📥 Response status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('📥 Response data:', data);

      if (!response.ok) {
        console.error('❌ API Error:', data);
        return { error: data.error || 'Ошибка сервера' };
      }

      console.log('✅ API Success:', data);
      return { data, success: true };
    } catch (error) {
      return { error: 'Ошибка сети' };
    }
  }

  // Аутентификация
  async login(username: string, password: string) {
    return this.request('auth/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  // Дашборд
  async getDashboard(): Promise<ApiResponse<DashboardResponse>> {
    return this.request('dashboard/');
  }

  // Аналитика
  async getAnalytics(period: string = 'week'): Promise<ApiResponse<AnalyticsResponse>> {
    return this.request(`analytics/?period=${period}`);
  }

  // Меню
  async getMenuItems(params?: {
    page?: number;
    page_size?: number;
    category?: string;
    search?: string;
    is_active?: boolean;
    is_hit?: boolean;
    is_new?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const queryString = searchParams.toString();
    return this.request(`menu/${queryString ? `?${queryString}` : ''}`);
  }

  async getMenuItem(id: number) {
    return this.request(`menu/${id}/`);
  }

  async createMenuItem(data: any) {
    // Если это FormData, отправляем как есть, иначе JSON
    const isFormData = data instanceof FormData;
    
    if (isFormData) {
      // Для FormData используем специальный метод, который корректно передает токен
      return this.requestFormData('menu/', data);
    } else {
      return this.request('menu/', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async updateMenuItem(id: number, data: any) {
    // Если это FormData, отправляем как есть, иначе JSON
    const isFormData = data instanceof FormData;
    
    if (isFormData) {
      // Для FormData используем специальный метод, который корректно передает токен
      return this.requestFormData(`menu/${id}/`, data, 'PUT');
    } else {
      return this.request(`menu/${id}/`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async deleteMenuItem(id: number) {
    return this.request(`menu/${id}/`, {
      method: 'DELETE',
    });
  }

  async toggleMenuItemHit(id: number) {
    return this.request(`menu/${id}/toggle_hit/`, {
      method: 'POST',
    });
  }

  async toggleMenuItemNew(id: number) {
    return this.request(`menu/${id}/toggle_new/`, {
      method: 'POST',
    });
  }

  async toggleMenuItemActive(id: number) {
    return this.request(`menu/${id}/toggle_active/`, {
      method: 'POST',
    });
  }

  // Категории
  async getCategories(params?: any) {
    const searchParams = new URLSearchParams();
    if (params?.search) {
      searchParams.append('search', params.search);
    }
    const queryString = searchParams.toString();
    return this.request(`categories/${queryString ? `?${queryString}` : ''}`);
  }

  async createCategory(data: any) {
    return this.request('categories/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: number, data: any) {
    return this.request(`categories/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: number) {
    return this.request(`categories/${id}/`, {
      method: 'DELETE',
    });
  }

  // Заказы
  async getOrders(params?: any) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const queryString = searchParams.toString();
    return this.request(`orders/${queryString ? `?${queryString}` : ''}`);
  }

  async changeOrderStatus(id: number, status: string) {
    return this.request(`orders/${id}/change_status/`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  // Промокоды
  async getPromoCodes(params?: any) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const queryString = searchParams.toString();
    return this.request(`promo-codes/${queryString ? `?${queryString}` : ''}`);
  }

  async createPromoCode(data: any) {
    return this.request('promo-codes/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePromoCode(id: number, data: any) {
    return this.request(`promo-codes/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePromoCode(id: number) {
    return this.request(`promo-codes/${id}/`, {
      method: 'DELETE',
    });
  }

  async togglePromoCodeActive(id: number) {
    return this.request(`promo-codes/${id}/toggle_active/`, {
      method: 'POST',
    });
  }

  // Пользователи
  async getUsers(params?: { search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.search) {
      searchParams.append('search', params.search);
    }
    const queryString = searchParams.toString();
    return this.request(`users/${queryString ? `?${queryString}` : ''}`);
  }

  // Зоны доставки
  async getDeliveryZones(params?: { city?: string; is_active?: boolean }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const queryString = searchParams.toString();
    return this.request(`delivery-zones/${queryString ? `?${queryString}` : ''}`);
  }

  // Добавки (AddOns)
  async getAddOns(params?: { category?: string; is_active?: boolean }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const queryString = searchParams.toString();
    // Используем прямой URL без admin-panel префикса
    return this.requestDirect(`api/add-ons/${queryString ? `?${queryString}` : ''}`);
  }

  async createAddOn(data: { name: string; price: number; available_for_categories?: number[]; is_active?: boolean }) {
    return this.requestDirect('api/add-ons/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  async updateAddOn(id: number, data: { name?: string; price?: number; available_for_categories?: number[]; is_active?: boolean }) {
    return this.request(`add-ons/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  async deleteAddOn(id: number) {
    return this.request(`add-ons/${id}/`, { method: 'DELETE' });
  }

  // Размеры (SizeOptions)
  async getSizeOptions(params?: { menu_item?: number; is_active?: boolean }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const queryString = searchParams.toString();
    // Используем прямой URL без admin-panel префикса
    return this.requestDirect(`api/size-options/${queryString ? `?${queryString}` : ''}`);
  }

  async createSizeOption(data: { name: string; price_modifier: number; description?: string; menu_item?: number; is_active?: boolean }) {
    return this.requestDirect('api/size-options/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  async updateSizeOption(id: number, data: { name?: string; price_modifier?: number; description?: string; menu_item?: number; is_active?: boolean }) {
    return this.request(`size-options/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  async deleteSizeOption(id: number) {
    return this.request(`size-options/${id}/`, { method: 'DELETE' });
  }

  // Курьеры доставки
  async getDeliveryDrivers(params?: {
    status?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<any>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const queryString = searchParams.toString();
    return this.request(`delivery-drivers/${queryString ? `?${queryString}` : ''}`);
  }

  async getDeliveryDriver(id: number) {
    return this.request(`delivery-drivers/${id}/`);
  }

  async updateDeliveryDriver(id: number, data: any) {
    return this.request(`delivery-drivers/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getDeliveryDriverAssignments(id: number, params?: {
    status?: string;
    date_from?: string;
    date_to?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const queryString = searchParams.toString();
    return this.request(`delivery-drivers/${id}/assignments/${queryString ? `?${queryString}` : ''}`);
  }

  async getDeliveryDriverStats(id: number, period: string = 'week') {
    return this.request(`delivery-drivers/${id}/stats/?period=${period}`);
  }

  // Назначения доставки
  async getDeliveryAssignments(params?: {
    status?: string;
    driver_id?: number;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<any>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const queryString = searchParams.toString();
    return this.request(`delivery-assignments/${queryString ? `?${queryString}` : ''}`);
  }
}

export const adminApi = new AdminApiClient();
export default adminApi;