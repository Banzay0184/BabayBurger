import type { 
  Operator, 
  OrderForOperator, 
  OperatorDashboard, 
  OrderFilters,
  CallResultUpdate,
  OperatorNotes,
  OperatorNotification,
  DeliveryZone
} from '../types/operator';
import { operatorApi as unifiedOperatorApi } from './unifiedClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.babayfood.uz/api';

// Упрощенные функции для совместимости
// const getAuthToken = (): string | null => {
//   return unifiedOperatorApi.getToken();
// };

const getHeaders = (): HeadersInit => {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
};

const handleApiError = async (response: Response): Promise<never> => {
  try {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  } catch {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
};

// API для аутентификации операторов
export const operatorAuthApi = {
  // Вход оператора
  login: async (username: string, password: string): Promise<{ token: string; operator: Operator }> => {
    try {
      const data = await unifiedOperatorApi.post<{ token: string; operator: Operator }>('operator/auth/login/', {
        username,
        password
      });
      
      unifiedOperatorApi.setToken(data.token);
      localStorage.setItem('operator_token', data.token);
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Ошибка входа оператора');
    }
  },

  // Выход оператора
  logout: async (): Promise<void> => {
    try {
      await unifiedOperatorApi.post('operator/auth/logout/');
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    } finally {
      unifiedOperatorApi.removeToken();
      localStorage.removeItem('operator_token');
    }
  },

  // Проверка токена
  verifyToken: async (): Promise<{ valid: boolean; operator?: Operator; error?: string }> => {
    try {
      const data = await unifiedOperatorApi.get<{ valid: boolean; operator?: Operator; error?: string }>('operator/auth/verify_token/');
      return data;
    } catch (error: any) {
      return { valid: false, error: 'Токен недействителен' };
    }
  },

  // Регистрация оператора
  register: async (operatorData: {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
    password_confirm: string;
  }): Promise<{ token: string; operator: Operator }> => {
    try {
      const data = await unifiedOperatorApi.post<{ token: string; operator: Operator }>('operator/auth/register/', operatorData);
      
      unifiedOperatorApi.setToken(data.token);
      localStorage.setItem('operator_token', data.token);
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Ошибка регистрации оператора');
    }
  }
};

// API для работы с заказами операторов
export const operatorOrdersApi = {
  // Получение дашборда оператора
  getDashboard: async (): Promise<OperatorDashboard> => {
    try {
      return await unifiedOperatorApi.get<OperatorDashboard>('operator/operator-orders/dashboard/');
    } catch (error: any) {
      throw new Error(error.message || 'Ошибка получения дашборда');
    }
  },

  // Получение списка заказов с фильтрами
  getOrders: async (filters: OrderFilters = {}): Promise<OrderForOperator[]> => {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.zone) params.append('zone', filters.zone);
    if (filters.date) params.append('date', filters.date);
    if (filters.search) params.append('search', filters.search);

    const response = await fetch(`${API_BASE_URL}/operator/operator-orders/?${params}`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    const data = await response.json();
    console.log('🔍 API ответ для заказов:', data);
    
    // После отключения пагинации backend возвращает массив напрямую
    if (Array.isArray(data)) {
      return data;
    }
    
    // Если вдруг вернулся объект с results (fallback), извлекаем массив
    return data.results || [];
  },

  // Получение деталей заказа
  getOrder: async (orderId: number): Promise<OrderForOperator> => {
    const response = await fetch(`${API_BASE_URL}/operator/operator-orders/${orderId}/`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  },

  // Получение предложений для поиска
  getSearchSuggestions: async (query: string): Promise<any[]> => {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/operator/search-suggestions/?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      console.warn('Ошибка получения предложений поиска:', response.status);
      return [];
    }

    return response.json();
  },

  // Назначить заказ себе
  assignToMe: async (orderId: number): Promise<{ message: string; order: OrderForOperator }> => {
    const response = await fetch(`${API_BASE_URL}/operator/operator-orders/${orderId}/assign_to_me/`, {
      method: 'POST',
      headers: getHeaders()
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  },

  // Начать обработку заказа
  startProcessing: async (orderId: number): Promise<{ message: string; order: OrderForOperator }> => {
    const response = await fetch(`${API_BASE_URL}/operator/operator-orders/${orderId}/start_processing/`, {
      method: 'POST',
      headers: getHeaders()
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  },

  // Отметить звонок клиенту
  callCustomer: async (orderId: number): Promise<{ message: string; order: OrderForOperator }> => {
    const response = await fetch(`${API_BASE_URL}/operator/operator-orders/${orderId}/call_customer/`, {
      method: 'POST',
      headers: getHeaders()
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  },

  // Обновить результат звонка
  updateCallResult: async (orderId: number, callResult: CallResultUpdate): Promise<{ message: string; order: OrderForOperator }> => {
    const response = await fetch(`${API_BASE_URL}/operator/operator-orders/${orderId}/update_call_result/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(callResult)
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  },

  // Добавить заметки к заказу
  addNotes: async (orderId: number, notes: OperatorNotes): Promise<{ message: string; order: OrderForOperator }> => {
    const response = await fetch(`${API_BASE_URL}/operator/operator-orders/${orderId}/add_notes/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(notes)
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  },

  // Получить список ресторанов
  getRestaurants: async (orderId?: number): Promise<{ restaurants: Array<{ id: number; name: string; city: string; address: string }> }> => {
    const url = orderId 
      ? `${API_BASE_URL}/operator/operator-orders/restaurants/?order_id=${orderId}`
      : `${API_BASE_URL}/operator/operator-orders/restaurants/`;
      
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  },

  // Подтвердить заказ
  confirmOrder: async (orderId: number, customerName?: string, restaurantId?: number): Promise<{ message: string; order: OrderForOperator }> => {
    const response = await fetch(`${API_BASE_URL}/operator/operator-orders/${orderId}/confirm_order/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ 
        customer_name: customerName,
        restaurant_id: restaurantId
      })
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  },

  // Отклонить заказ
  rejectOrder: async (orderId: number, reason?: string, customerName?: string): Promise<{ message: string; order: OrderForOperator }> => {
    const response = await fetch(`${API_BASE_URL}/operator/operator-orders/${orderId}/reject_order/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason, customer_name: customerName })
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  },

  // Обновить имя клиента
  updateCustomerName: async (orderId: number, customerName: string): Promise<{ message: string; order: OrderForOperator }> => {
    const response = await fetch(`${API_BASE_URL}/operator/operator-orders/${orderId}/update_customer_name/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ customer_name: customerName })
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  }
};

// API для профиля оператора
export const operatorProfileApi = {
  // Получение профиля текущего оператора
  getProfile: async (): Promise<Operator> => {
    const response = await fetch(`${API_BASE_URL}/operator/profile/me/`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  },

  // Обновление профиля
  updateProfile: async (profileData: Partial<Operator>): Promise<Operator> => {
    const response = await fetch(`${API_BASE_URL}/operator/profile/update_profile/`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  }
};

// API для уведомлений
export const operatorNotificationsApi = {
  // Получение уведомлений
  getNotifications: async (): Promise<OperatorNotification[]> => {
    const response = await fetch(`${API_BASE_URL}/operator/notifications/`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  },

  // Отметить уведомление как прочитанное
  markAsRead: async (notificationId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/operator/notifications/mark_read/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ notification_id: notificationId })
    });

    if (!response.ok) {
      await handleApiError(response);
    }
  },

  // Получить количество непрочитанных уведомлений
  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await fetch(`${API_BASE_URL}/operator/notifications/unread_count/`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  }
};

// API для аналитики
export const operatorAnalyticsApi = {
  // Получение дневной аналитики
  getDailyAnalytics: async (date: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/operator/analytics/daily/?date=${date}`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  },

  // Получение сводной аналитики
  getSummary: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/operator/analytics/summary/`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  }
};

// API для зон доставки
export const operatorDeliveryZonesApi = {
  // Получение зон доставки оператора
  getZones: async (): Promise<DeliveryZone[]> => {
    const response = await fetch(`${API_BASE_URL}/operator/delivery-zones/`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  }
};

// API для карт
export const operatorMapApi = {
  // Получение заказов для карты
  getOrdersForMap: async (): Promise<OrderForOperator[]> => {
    const response = await fetch(`${API_BASE_URL}/operator/map/`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  },

  // Получение маршрута до заказа
  getRoute: async (orderId: number): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/operator/map/${orderId}/route/`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  }
};
