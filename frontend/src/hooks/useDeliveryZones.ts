import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import type { DeliveryZone } from '../types/yandex-maps';

export const useDeliveryZones = () => {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchZones = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get('/delivery-zones/');
      setZones(response.data);
    } catch (error: any) {
      console.error('Error fetching delivery zones:', error);
      setError(error.response?.data?.error || 'Ошибка загрузки зон доставки');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  // Проверка, находится ли адрес в зонах доставки
  const isAddressInDeliveryZone = (latitude: number, longitude: number): { inZone: boolean; zone?: DeliveryZone } => {
    for (const zone of zones) {
      const distance = calculateDistance(
        latitude,
        longitude,
        zone.center_latitude,
        zone.center_longitude
      );
      
      if (distance <= zone.radius_km) {
        return { inZone: true, zone };
      }
    }
    
    return { inZone: false };
  };

  // Вычисление расстояния между двумя точками (формула гаверсинуса)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Радиус Земли в километрах
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return {
    zones,
    isLoading,
    error,
    refetch: fetchZones,
    isAddressInDeliveryZone
  };
};
