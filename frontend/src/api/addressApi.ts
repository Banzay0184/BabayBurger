import type { Address } from '../types/address';
import { publicApi } from './unifiedClient';

export const addressApi = {
  // Получить все адреса пользователя
  async getUserAddresses(telegramId?: number): Promise<Address[]> {
    try {
      const params = telegramId ? { telegram_id: telegramId } : {};
      const response = await publicApi.get<Address[]>('/addresses/', { params });
      return response;
    } catch (error) {
      console.error('Error fetching user addresses:', error);
      return [];
    }
  },

  // Создать новый адрес
  async createAddress(addressData: Partial<Address>): Promise<Address> {
    try {
      const response = await publicApi.post<Address>('/addresses/', addressData);
      return response;
    } catch (error) {
      console.error('Error creating address:', error);
      throw error;
    }
  },

  // Обновить адрес
  async updateAddress(addressId: number, addressData: Partial<Address>): Promise<Address> {
    try {
      const response = await publicApi.patch<Address>(`/addresses/${addressId}/`, addressData);
      return response;
    } catch (error) {
      console.error('Error updating address:', error);
      throw error;
    }
  },

  // Удалить адрес
  async deleteAddress(addressId: number): Promise<void> {
    try {
      await publicApi.delete(`/addresses/${addressId}/`);
    } catch (error) {
      console.error('Error deleting address:', error);
      throw error;
    }
  },

  // Установить адрес как основной
  async setPrimaryAddress(addressId: number): Promise<Address> {
    try {
      const response = await publicApi.post<Address>(`/addresses/${addressId}/set-primary/`);
      return response;
    } catch (error) {
      console.error('Error setting primary address:', error);
      throw error;
    }
  },

  // Геокодирование адреса (получение координат по адресу)
  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const response = await publicApi.post<{ coordinates: { latitude: number; longitude: number } }>('/geocode/', { address });
      return response.coordinates;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  },

  // Обратное геокодирование (получение адреса по координатам)
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const response = await publicApi.post<{ address: string }>('/reverse-geocode/', { latitude, longitude });
      return response.address;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  },

  // Проверка адреса в зоне доставки
  async checkDeliveryZone(addressData: {
    street?: string;
    house_number?: string;
    apartment?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<{
    is_in_delivery_zone: boolean;
    message: string;
    delivery_zones_info?: any;
  }> {
    try {
      const response = await publicApi.post<{
        is_in_delivery_zone: boolean;
        message: string;
        delivery_zones_info?: any;
      }>('/addresses/delivery-zone-check/', {
        address: addressData
      });
      return response;
    } catch (error) {
      console.error('Error checking delivery zone:', error);
      return {
        is_in_delivery_zone: false,
        message: 'Ошибка проверки зоны доставки'
      };
    }
  }
};
