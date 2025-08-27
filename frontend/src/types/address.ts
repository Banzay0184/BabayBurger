export interface Address {
  id: number;
  user: number;
  street: string;
  house_number: string;
  apartment: string;
  city: string;
  comment: string;
  coordinates?: string;
  created_at: string;
  updated_at: string;
  formatted_phone: string;
  full_address: string;
  is_primary: boolean;
  latitude?: number | null;
  longitude?: number | null;
  phone_number: string;
  telegram_id: string;
}
