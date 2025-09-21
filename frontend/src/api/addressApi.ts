import type { Address } from '../types/address';
import { publicApi } from './unifiedClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const addressApi = {
  // Получить все адреса пользователя
  async getUserAddresses(): Promise<Address[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/addresses/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching user addresses:', error);
      return [];
    }
  },

  // Создать новый адрес
  async createAddress(addressData: Partial<Address>): Promise<Address> {
    try {
      const response = await fetch(`${API_BASE_URL}/addresses/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(addressData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating address:', error);
      throw error;
    }
  },

  // Обновить адрес
  async updateAddress(addressId: number, addressData: Partial<Address>): Promise<Address> {
    try {
      const response = await fetch(`${API_BASE_URL}/addresses/${addressId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(addressData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating address:', error);
      throw error;
    }
  },

  // Удалить адрес
  async deleteAddress(addressId: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/addresses/${addressId}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      throw error;
    }
  },

  // Установить адрес как основной
  async setPrimaryAddress(addressId: number): Promise<Address> {
    try {
      const response = await fetch(`${API_BASE_URL}/addresses/${addressId}/set-primary/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error setting primary address:', error);
      throw error;
    }
  },

  // Геокодирование адреса (получение координат по адресу)
  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/geocode/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.coordinates;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  },

  // Обратное геокодирование (получение адреса по координатам)
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/reverse-geocode/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ latitude, longitude }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.address;
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
