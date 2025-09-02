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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://3e3f35c1758a.ngrok-free.app';

// Получение токена из localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('operator_token');
};

// Базовые заголовки для API запросов
const getHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token && { 'Authorization': `Token ${token}` })
  };
};

// Обработка ошибок API
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
    const response = await fetch(`${API_BASE_URL}/api/operator/auth/login/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    const data = await response.json();
    localStorage.setItem('operator_token', data.token);
    return data;
  },

              // Выход оператора
            logout: async (): Promise<void> => {
              const response = await fetch(`${API_BASE_URL}/api/operator/auth/logout/`, {
                method: 'POST',
                headers: getHeaders()
              });

              if (response.ok) {
                localStorage.removeItem('operator_token');
              }
            },

            // Проверка токена
            verifyToken: async (): Promise<{ valid: boolean; operator?: Operator; error?: string }> => {
              const response = await fetch(`${API_BASE_URL}/api/operator/auth/verify_token/`, {
                method: 'GET',
                headers: getHeaders()
              });

              if (response.ok) {
                const data = await response.json();
                return data;
              } else {
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
    const response = await fetch(`${API_BASE_URL}/api/operator/auth/register/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(operatorData)
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    const data = await response.json();
    localStorage.setItem('operator_token', data.token);
    return data;
  }
};

// API для работы с заказами операторов
export const operatorOrdersApi = {
  // Получение дашборда оператора
  getDashboard: async (): Promise<OperatorDashboard> => {
    const response = await fetch(`${API_BASE_URL}/api/operator/operator-orders/dashboard/`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  },

  // Получение списка заказов с фильтрами
  getOrders: async (filters: OrderFilters = {}): Promise<OrderForOperator[]> => {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.zone) params.append('zone', filters.zone);
    if (filters.date) params.append('date', filters.date);

    const response = await fetch(`${API_BASE_URL}/api/operator/operator-orders/?${params}`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    const data = await response.json();
    // API возвращает объект с полем results, извлекаем массив заказов
    return data.results || [];
  },

  // Получение деталей заказа
  getOrder: async (orderId: number): Promise<OrderForOperator> => {
    const response = await fetch(`${API_BASE_URL}/api/operator/operator-orders/${orderId}/`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  },

  // Назначить заказ себе
  assignToMe: async (orderId: number): Promise<{ message: string; order: OrderForOperator }> => {
    const response = await fetch(`${API_BASE_URL}/api/operator/operator-orders/${orderId}/assign_to_me/`, {
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
    const response = await fetch(`${API_BASE_URL}/api/operator/operator-orders/${orderId}/start_processing/`, {
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
    const response = await fetch(`${API_BASE_URL}/api/operator/operator-orders/${orderId}/call_customer/`, {
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
    const response = await fetch(`${API_BASE_URL}/api/operator/operator-orders/${orderId}/update_call_result/`, {
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
    const response = await fetch(`${API_BASE_URL}/api/operator/operator-orders/${orderId}/add_notes/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(notes)
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  },

  // Подтвердить заказ
  confirmOrder: async (orderId: number, customerName?: string): Promise<{ message: string; order: OrderForOperator }> => {
    const response = await fetch(`${API_BASE_URL}/api/operator/operator-orders/${orderId}/confirm_order/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ customer_name: customerName })
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  },

  // Отклонить заказ
  rejectOrder: async (orderId: number, reason?: string, customerName?: string): Promise<{ message: string; order: OrderForOperator }> => {
    const response = await fetch(`${API_BASE_URL}/api/operator/operator-orders/${orderId}/reject_order/`, {
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
    const response = await fetch(`${API_BASE_URL}/api/operator/operator-orders/${orderId}/update_customer_name/`, {
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
    const response = await fetch(`${API_BASE_URL}/api/operator/profile/me/`, {
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
    const response = await fetch(`${API_BASE_URL}/api/operator/profile/update_profile/`, {
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
    const response = await fetch(`${API_BASE_URL}/api/operator/notifications/`, {
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
    const response = await fetch(`${API_BASE_URL}/api/operator/notifications/mark_read/`, {
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
    const response = await fetch(`${API_BASE_URL}/api/operator/notifications/unread_count/`, {
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
    const response = await fetch(`${API_BASE_URL}/api/operator/analytics/daily/?date=${date}`, {
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
    const response = await fetch(`${API_BASE_URL}/api/operator/analytics/summary/`, {
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
    const response = await fetch(`${API_BASE_URL}/api/operator/delivery-zones/`, {
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
    const response = await fetch(`${API_BASE_URL}/api/operator/map/`, {
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
    const response = await fetch(`${API_BASE_URL}/api/operator/map/${orderId}/route/`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  }
};
