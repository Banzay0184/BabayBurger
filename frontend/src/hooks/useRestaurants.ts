import { useState, useEffect } from 'react';
import type { Restaurant } from '../types/yandex-maps';
import client from '../api/client';

export const useRestaurants = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await client.get('/restaurants/');
        setRestaurants(response.data);
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
