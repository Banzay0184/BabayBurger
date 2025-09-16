import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { MenuItem } from '../types/menu';
import apiClient from '../api/client';
import { useAuth } from './AuthContext';

interface FavoriteItem {
  id: number;
  menu_item: MenuItem;
  created_at: string;
}

interface FavoriteContextType {
  favorites: FavoriteItem[];
  isLoading: boolean;
  toggleFavorite: (menuItem: MenuItem) => Promise<void>;
  isFavorite: (menuItemId: number) => boolean;
  refreshFavorites: () => Promise<void>;
}

const FavoriteContext = createContext<FavoriteContextType | undefined>(undefined);

export const useFavorites = () => {
  const context = useContext(FavoriteContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoriteProvider');
  }
  return context;
};

export const FavoriteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { state: authState } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshFavorites = async () => {
    try {
      setIsLoading(true);
      console.log('🤍 FavoriteContext - Refreshing favorites');
      
      // Получаем telegram_id из состояния авторизации
      const telegramId = authState.user?.telegram_id;
      if (!telegramId) {
        console.log('🤍 FavoriteContext - No telegram_id, skipping favorites fetch');
        setFavorites([]);
        return;
      }
      
      const response = await apiClient.get(`favorites/?telegram_id=${telegramId}`);
      console.log('🤍 FavoriteContext - Favorites response:', response.data);
      
      setFavorites(response.data.favorites || []);
    } catch (error) {
      console.error('🤍 FavoriteContext - Error fetching favorites:', error);
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  };

  const [isProcessing, setIsProcessing] = useState<Set<number>>(new Set());

  const toggleFavorite = async (menuItem: MenuItem) => {
    // Защита от двойного клика
    if (isProcessing.has(menuItem.id)) {
      console.log('🤍 FavoriteContext - Already processing favorite for item:', menuItem.name);
      return;
    }

    try {
      setIsProcessing(prev => new Set(prev).add(menuItem.id));
      
      const telegramId = authState.user?.telegram_id;
      if (!telegramId) {
        throw new Error('User not authenticated');
      }
      
      const isCurrentlyFavorite = isFavorite(menuItem.id);
      
      console.log('🤍 FavoriteContext - Toggling favorite:', {
        menuItem: menuItem.name,
        isCurrentlyFavorite,
        action: isCurrentlyFavorite ? 'remove' : 'add',
        telegramId
      });

      if (isCurrentlyFavorite) {
        // Удаляем из избранного
        await apiClient.delete('favorites/', {
          data: {
            telegram_id: telegramId,
            menu_item_id: menuItem.id
          }
        });
        
        // Обновляем локальное состояние
        setFavorites(prev => prev.filter(fav => fav.menu_item.id !== menuItem.id));
        console.log('🤍 FavoriteContext - Removed from favorites:', menuItem.name);
      } else {
        try {
          console.log('🤍 FavoriteContext - Sending POST request to add favorite...');
          
          // Добавляем в избранное
          const response = await apiClient.post('favorites/', {
            telegram_id: telegramId,
            menu_item_id: menuItem.id
          });
          
          console.log('🤍 FavoriteContext - POST response received:', response.status, response.data);
          
          // Обновляем локальное состояние
          setFavorites(prev => [response.data, ...prev]);
          console.log('🤍 FavoriteContext - Added to favorites:', menuItem.name);
        } catch (postError: any) {
          console.log('🤍 FavoriteContext - POST error:', postError.response?.status, postError.response?.data);
          
          // Если товар уже в избранном, обновляем состояние
          if (postError.response?.status === 400 && postError.response?.data?.error === 'Item already in favorites') {
            console.log('🤍 FavoriteContext - Item already in favorites, refreshing...');
            await refreshFavorites();
          } else {
            // Если другая ошибка, пробрасываем её
            throw postError;
          }
        }
      }
    } catch (error: any) {
      console.error('🤍 FavoriteContext - Error toggling favorite:', error);
      
      // Обработка специфических ошибок для удаления
      if (error.response?.status === 400 && error.response?.data?.error === 'Item not in favorites') {
        console.log('🤍 FavoriteContext - Item not in favorites, refreshing...');
        await refreshFavorites();
      } else {
        // Для всех остальных ошибок просто логируем
        console.error('🤍 FavoriteContext - Unhandled error:', error);
      }
    } finally {
      // Очищаем состояние обработки
      setIsProcessing(prev => {
        const newSet = new Set(prev);
        newSet.delete(menuItem.id);
        return newSet;
      });
    }
  };

  const isFavorite = (menuItemId: number): boolean => {
    return favorites.some(fav => fav.menu_item.id === menuItemId);
  };

  // Загружаем избранные при инициализации и при изменении пользователя
  useEffect(() => {
    if (authState.user?.telegram_id) {
      refreshFavorites();
    }
  }, [authState.user?.telegram_id]);

  const value: FavoriteContextType = {
    favorites,
    isLoading,
    toggleFavorite,
    isFavorite,
    refreshFavorites
  };

  return (
    <FavoriteContext.Provider value={value}>
      {children}
    </FavoriteContext.Provider>
  );
};
