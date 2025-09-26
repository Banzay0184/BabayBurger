import { useCallback } from 'react';
import { useSync } from '../components/operator/SyncManager';
import { operatorOrdersApi } from '../api/operatorApi';

// Хук для синхронизации операций с заказами
export const useOrderSync = () => {
  const { addAction, isActionPending } = useSync();

  // Подтверждение заказа с синхронизацией
  const confirmOrderWithSync = useCallback(async (
    orderId: number,
    customerName?: string,
    restaurantId?: number
  ) => {
    // const actionId = `confirm_${orderId}_${Date.now()}`;
    
    try {
      // Пытаемся выполнить сразу
      const result = await operatorOrdersApi.confirmOrder(orderId, customerName, restaurantId);
      console.log('✅ Order confirmed immediately:', orderId);
      return result;
    } catch (error) {
      console.warn('⚠️ Failed to confirm order immediately, adding to sync queue:', error);
      
      // Добавляем в очередь синхронизации
      addAction({
        type: 'order_confirm',
        data: { orderId, customerName, restaurantId },
        maxRetries: 3,
      });
      
      // Возвращаем оптимистичный результат
      return {
        success: true,
        order: {
          id: orderId,
          status: 'preparing',
          updated_at: new Date().toISOString(),
        },
        message: 'Заказ подтвержден (будет синхронизирован)',
      };
    }
  }, [addAction]);

  // Отклонение заказа с синхронизацией
  const rejectOrderWithSync = useCallback(async (
    orderId: number,
    reason: string,
    customerName?: string
  ) => {
    try {
      // Пытаемся выполнить сразу
      const result = await operatorOrdersApi.rejectOrder(orderId, reason, customerName);
      console.log('✅ Order rejected immediately:', orderId);
      return result;
    } catch (error) {
      console.warn('⚠️ Failed to reject order immediately, adding to sync queue:', error);
      
      // Добавляем в очередь синхронизации
      addAction({
        type: 'order_reject',
        data: { orderId, reason, customerName },
        maxRetries: 3,
      });
      
      // Возвращаем оптимистичный результат
      return {
        success: true,
        order: {
          id: orderId,
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        },
        message: 'Заказ отклонен (будет синхронизирован)',
      };
    }
  }, [addAction]);

  // Обновление заказа с синхронизацией
  const updateOrderWithSync = useCallback(async (
    orderId: number,
    updateData: any
  ) => {
    try {
      // Пытаемся выполнить сразу
      const result = await operatorOrdersApi.updateOrderCart(orderId, updateData);
      console.log('✅ Order updated immediately:', orderId);
      return result;
    } catch (error) {
      console.warn('⚠️ Failed to update order immediately, adding to sync queue:', error);
      
      // Добавляем в очередь синхронизации
      addAction({
        type: 'order_update',
        data: { orderId, updateData },
        maxRetries: 3,
      });
      
      // Возвращаем оптимистичный результат
      return {
        success: true,
        order: {
          id: orderId,
          ...updateData,
          updated_at: new Date().toISOString(),
        },
        message: 'Заказ обновлен (будет синхронизирован)',
      };
    }
  }, [addAction]);

  // Добавление заметки с синхронизацией
  const addNoteWithSync = useCallback(async (
    orderId: number,
    note: string
  ) => {
    try {
      // Пытаемся выполнить сразу
      const result = await operatorOrdersApi.addNotes(orderId, { notes: note });
      console.log('✅ Note added immediately:', orderId);
      return result;
    } catch (error) {
      console.warn('⚠️ Failed to add note immediately, adding to sync queue:', error);
      
      // Добавляем в очередь синхронизации
      addAction({
        type: 'note_add',
        data: { orderId, note },
        maxRetries: 3,
      });
      
      // Возвращаем оптимистичный результат
      return {
        success: true,
        message: 'Заметка добавлена (будет синхронизирована)',
      };
    }
  }, [addAction]);

  // Изменение статуса с синхронизацией
  const changeStatusWithSync = useCallback(async (
    orderId: number,
    status: string
  ) => {
    try {
      // Пытаемся выполнить сразу
      // Используем доступные методы для изменения статуса
      const result = status === 'confirmed' 
        ? await operatorOrdersApi.confirmOrder(orderId) 
        : await operatorOrdersApi.rejectOrder(orderId, 'Status changed');
      console.log('✅ Status changed immediately:', orderId);
      return result;
    } catch (error) {
      console.warn('⚠️ Failed to change status immediately, adding to sync queue:', error);
      
      // Добавляем в очередь синхронизации
      addAction({
        type: 'status_change',
        data: { orderId, status },
        maxRetries: 3,
      });
      
      // Возвращаем оптимистичный результат
      return {
        success: true,
        order: {
          id: orderId,
          status,
          updated_at: new Date().toISOString(),
        },
        message: 'Статус изменен (будет синхронизирован)',
      };
    }
  }, [addAction]);

  // Проверка, ожидает ли операция синхронизации
  const isOrderActionPending = useCallback((orderId: number, actionType: string) => {
    return isActionPending(`${actionType}_${orderId}_`);
  }, [isActionPending]);

  return {
    confirmOrderWithSync,
    rejectOrderWithSync,
    updateOrderWithSync,
    addNoteWithSync,
    changeStatusWithSync,
    isOrderActionPending,
  };
};
