// Типы для операторского интерфейса

export interface Operator {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_active_operator: boolean;
  assigned_zones: DeliveryZone[];
  completed_orders_count: number;
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
  min_order_amount: number;
  is_active: boolean;
}

export interface OrderItemDetail {
  id: number;
  menu_item_name: string;
  menu_item_price: number;
  quantity: number;
  size_option_name?: string;
  add_ons_names: string[];
  total_price: number;
}

export interface UserInfo {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  telegram_id: number;
}

export interface AddressInfo {
  id: number;
  full_address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone_number: string;
}

export interface OrderForOperator {
  id: number;
  status: OrderStatus;
  status_display: string;
  service_type: 'delivery' | 'pickup';
  service_type_display: string;
  payment_method: 'cash' | 'card' | 'online';
  payment_method_display: string;
  total_price: number;
  final_price: number;
  delivery_fee: number;
  discount_amount: number;
  created_at: string;
  delivery_time?: string;
  notes: string;
  operator_notes: string;
  operator_called: boolean;
  operator_call_time?: string;
  operator_call_result?: OperatorCallResult;
  operator_call_result_display?: string;
  assigned_operator?: number;
  assigned_at?: string;
  operator_order_number?: number;
  user_info: UserInfo;
  address_info: AddressInfo;
  restaurant_info?: RestaurantInfo;
  items_details: OrderItemDetail[];
  delivery_zone_info?: DeliveryZoneInfo;
}

export interface DeliveryZoneInfo {
  id: number;
  name: string;
  city: string;
  delivery_fee: number;
  min_order_amount?: number;
}

export interface RestaurantInfo {
  id: number;
  name: string;
  city: string;
  address: string;
  phone: string;
}

export type OrderStatus = 
  | 'pending'
  | 'new'
  | 'assigned'
  | 'operator_processing'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_delivery'
  | 'in_transit'
  | 'delivering'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export type OperatorCallResult = 
  | 'confirmed'
  | 'cancelled'
  | 'modified'
  | 'unreachable'
  | 'wrong_number';

export interface OperatorDashboard {
  total_orders: number;
  new_orders: number;
  processing_orders: number;
  confirmed_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  assigned_zones: string[];
  recent_orders: OrderForOperator[];
  notifications: OperatorNotification[];
}

export interface OperatorNotification {
  id: number;
  notification_type: string;
  notification_type_display: string;
  title: string;
  message: string;
  order?: number;
  is_read: boolean;
  created_at: string;
}

export interface OrderAssignment {
  id: number;
  order: number;
  order_details: OrderForOperator;
  operator: number;
  operator_info: OperatorInfo;
  assigned_at: string;
  accepted_at?: string;
  status: AssignmentStatus;
  status_display: string;
  notes: string;
  rejection_reason: string;
}

export interface OperatorInfo {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export type AssignmentStatus = 
  | 'assigned'
  | 'accepted'
  | 'rejected'
  | 'completed';

// Фильтры для заказов
export interface OrderFilters {
  status?: OrderStatus;
  zone?: string;
  date?: string;
  search?: string;
}

// Действия оператора
export interface CallResultUpdate {
  call_result: OperatorCallResult;
  operator_notes?: string;
}

export interface OperatorNotes {
  notes: string;
}
