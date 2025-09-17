import { useState, useEffect } from 'react';
import type { Restaurant } from '../types/yandex-maps';
import { clientApi } from '../api/unifiedClient';

export const useRestaurants = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await clientApi.get<Restaurant[]>('/restaurants/');
        setRestaurants(response);
      } catch (err) {
        console.error('Ошибка загрузки ресторанов:', err);
        setError('Не удалось загрузить список ресторанов');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  return { restaurants, loading, error };
};
