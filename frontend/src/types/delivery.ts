export interface DeliveryDriver {
  id: number;
  user: number;
  user_name: string;
  user_phone: string;
  telegram_id: number;
  phone: string;
  status: 'active' | 'busy' | 'offline' | 'blocked';
  is_active: boolean;
  max_orders: number;
  current_orders_count: number;
  rating: number;
  total_deliveries: number;
  restaurants: number[];
  restaurants_names: string[];
  current_assignments: DeliveryAssignment[];
  created_at: string;
  updated_at: string;
}

export interface DeliveryAssignment {
  id: number;
  order: number;
  order_id: number;
  driver: number;
  driver_name: string;
  assigned_at: string;
  accepted_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  status: 'assigned' | 'accepted' | 'picked_up' | 'delivering' | 'delivered' | 'cancelled';
  status_display: string;
  notes: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  total_price: number;
  payment_method: string;
  receipt_photo?: string;
  receipt_photo_url?: string;
  delivery_time?: string;
}

export interface DeliveryDriverStats {
  total_assignments: number;
  completed: number;
  cancelled: number;
  in_progress: number;
  avg_delivery_time?: {
    minutes: number;
    seconds: number;
  };
  total_revenue: number;
  rating: number;
  period: string;
  start_date: string;
  end_date: string;
}

export interface DeliveryAssignmentsResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  results: DeliveryAssignment[];
}

export interface DeliveryDriversResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  results: DeliveryDriver[];
}
