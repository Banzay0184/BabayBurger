import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Типы для синхронизации
export interface SyncAction {
  id: string;
  type: 'order_confirm' | 'order_reject' | 'order_update' | 'note_add' | 'status_change';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingActions: number;
  lastSyncTime: number | null;
  syncErrors: string[];
}

export interface SyncContextType {
  status: SyncStatus;
  addAction: (action: Omit<SyncAction, 'id' | 'timestamp' | 'retryCount'>) => void;
  clearActions: () => void;
  retryFailedActions: () => Promise<void>;
  forceSync: () => Promise<void>;
  isActionPending: (actionId: string) => boolean;
}

// Контекст для синхронизации
const SyncContext = createContext<SyncContextType | undefined>(undefined);

// Провайдер контекста
interface SyncProviderProps {
  children: React.ReactNode;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingActions: 0,
    lastSyncTime: null,
    syncErrors: [],
  });

  const [pendingActions, setPendingActions] = useState<SyncAction[]>([]);

  // Загружаем отложенные действия из localStorage
  useEffect(() => {
    const savedActions = localStorage.getItem('operator_pending_actions');
    if (savedActions) {
      try {
        const actions = JSON.parse(savedActions);
        setPendingActions(actions);
        setStatus(prev => ({ ...prev, pendingActions: actions.length }));
      } catch (error) {
        console.error('Error loading pending actions:', error);
      }
    }
  }, []);

  // Сохраняем отложенные действия в localStorage
  useEffect(() => {
    localStorage.setItem('operator_pending_actions', JSON.stringify(pendingActions));
    setStatus(prev => ({ ...prev, pendingActions: pendingActions.length }));
  }, [pendingActions]);

  // Мониторинг состояния сети
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network: Connection restored');
      setStatus(prev => ({ ...prev, isOnline: true, syncErrors: [] }));
      
      // Автоматически синхронизируем при восстановлении связи
      if (pendingActions.length > 0) {
        setTimeout(() => {
          retryFailedActions();
        }, 1000);
      }
    };

    const handleOffline = () => {
      console.log('🌐 Network: Connection lost');
      setStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingActions.length]);

  // Выполнение действия
  const executeAction = useCallback(async (action: SyncAction): Promise<boolean> => {
    try {
      console.log(`🔄 Executing action: ${action.type}`, action.data);

      switch (action.type) {
        case 'order_confirm':
          // Имитация API вызова для подтверждения заказа
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('✅ Order confirmed:', action.data.orderId);
          break;

        case 'order_reject':
          // Имитация API вызова для отклонения заказа
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('✅ Order rejected:', action.data.orderId);
          break;

        case 'order_update':
          // Имитация API вызова для обновления заказа
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('✅ Order updated:', action.data.orderId);
          break;

        case 'note_add':
          // Имитация API вызова для добавления заметки
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('✅ Note added:', action.data.orderId);
          break;

        case 'status_change':
          // Имитация API вызова для изменения статуса
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('✅ Status changed:', action.data.orderId);
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      return true;
    } catch (error) {
      console.error(`❌ Failed to execute action ${action.type}:`, error);
      return false;
    }
  }, []);

  // Добавление действия в очередь
  const addAction = useCallback((actionData: Omit<SyncAction, 'id' | 'timestamp' | 'retryCount'>) => {
    const action: SyncAction = {
      ...actionData,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    setPendingActions(prev => [...prev, action]);
    console.log('📝 Action added to queue:', action);

    // Если онлайн, пытаемся выполнить сразу
    if (status.isOnline) {
      setTimeout(() => {
        retryFailedActions();
      }, 100);
    }
  }, [status.isOnline]);

  // Повторная попытка выполнения неудачных действий
  const retryFailedActions = useCallback(async () => {
    if (status.isSyncing || pendingActions.length === 0) {
      return;
    }

    setStatus(prev => ({ ...prev, isSyncing: true }));

    const actionsToRetry = [...pendingActions];
    const successfulActions: string[] = [];
    const failedActions: SyncAction[] = [];

    console.log(`🔄 Retrying ${actionsToRetry.length} pending actions...`);

    for (const action of actionsToRetry) {
      try {
        const success = await executeAction(action);
        
        if (success) {
          successfulActions.push(action.id);
          console.log(`✅ Action ${action.id} completed successfully`);
        } else {
          const updatedAction = { ...action, retryCount: action.retryCount + 1 };
          
          if (updatedAction.retryCount < updatedAction.maxRetries) {
            failedActions.push(updatedAction);
            console.log(`⚠️ Action ${action.id} failed, will retry (${updatedAction.retryCount}/${updatedAction.maxRetries})`);
          } else {
            console.log(`❌ Action ${action.id} failed permanently after ${updatedAction.maxRetries} retries`);
            setStatus(prev => ({
              ...prev,
              syncErrors: [...prev.syncErrors, `Action ${action.type} failed after ${updatedAction.maxRetries} retries`]
            }));
          }
        }
      } catch (error) {
        console.error(`❌ Error executing action ${action.id}:`, error);
        const updatedAction = { ...action, retryCount: action.retryCount + 1 };
        
        if (updatedAction.retryCount < updatedAction.maxRetries) {
          failedActions.push(updatedAction);
        } else {
          setStatus(prev => ({
            ...prev,
            syncErrors: [...prev.syncErrors, `Action ${action.type} failed: ${error instanceof Error ? error.message : String(error)}`]
          }));
        }
      }
    }

    // Обновляем очередь действий
    setPendingActions(failedActions);
    
    // Обновляем статус
    setStatus(prev => ({
      ...prev,
      isSyncing: false,
      lastSyncTime: Date.now(),
      pendingActions: failedActions.length,
    }));

    console.log(`🔄 Sync completed: ${successfulActions.length} successful, ${failedActions.length} failed`);
  }, [status.isSyncing, pendingActions, executeAction]);

  // Принудительная синхронизация
  const forceSync = useCallback(async () => {
    console.log('🔄 Force sync requested');
    await retryFailedActions();
  }, [retryFailedActions]);

  // Очистка всех действий
  const clearActions = useCallback(() => {
    setPendingActions([]);
    setStatus(prev => ({ ...prev, syncErrors: [] }));
    console.log('🗑️ All pending actions cleared');
  }, []);

  // Проверка, ожидает ли действие выполнения
  const isActionPending = useCallback((actionId: string) => {
    return pendingActions.some(action => action.id === actionId);
  }, [pendingActions]);

  const value: SyncContextType = {
    status,
    addAction,
    clearActions,
    retryFailedActions,
    forceSync,
    isActionPending,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
};

// Хук для использования синхронизации
export const useSync = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};

// Компонент для отображения статуса синхронизации
export const SyncStatusIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { status, forceSync } = useSync();

  const getStatusColor = () => {
    if (!status.isOnline) return 'text-red-400';
    if (status.isSyncing) return 'text-yellow-400';
    if (status.pendingActions > 0) return 'text-orange-400';
    return 'text-green-400';
  };

  const getStatusIcon = () => {
    if (!status.isOnline) return '🔴';
    if (status.isSyncing) return '🔄';
    if (status.pendingActions > 0) return '⏳';
    return '✅';
  };

  const getStatusText = () => {
    if (!status.isOnline) return 'Офлайн';
    if (status.isSyncing) return 'Синхронизация...';
    if (status.pendingActions > 0) return `${status.pendingActions} в очереди`;
    return 'Синхронизировано';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        onClick={forceSync}
        disabled={!status.isOnline || status.isSyncing}
        className={`flex items-center space-x-1 ${getStatusColor()} hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
        title={status.isOnline ? 'Принудительная синхронизация' : 'Нет соединения'}
      >
        <span className="text-sm">{getStatusIcon()}</span>
        <span className="text-xs">{getStatusText()}</span>
      </button>
    </div>
  );
};

// Компонент для отображения детального статуса синхронизации
export const SyncStatusPanel: React.FC = () => {
  const { status, clearActions, retryFailedActions } = useSync();

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <span className="mr-2">🔄</span>
        Статус синхронизации
      </h3>
      
      <div className="space-y-4">
        {/* Основной статус */}
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 font-medium">Соединение</span>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${status.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm ${status.isOnline ? 'text-green-400' : 'text-red-400'}`}>
                {status.isOnline ? 'Онлайн' : 'Офлайн'}
              </span>
            </div>
          </div>
        </div>

        {/* Статус синхронизации */}
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 font-medium">Синхронизация</span>
            <div className="flex items-center space-x-2">
              {status.isSyncing ? (
                <div className="animate-spin w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
              ) : (
                <div className={`w-2 h-2 rounded-full ${status.pendingActions === 0 ? 'bg-green-500' : 'bg-orange-500'}`}></div>
              )}
              <span className={`text-sm ${status.isSyncing ? 'text-yellow-400' : status.pendingActions === 0 ? 'text-green-400' : 'text-orange-400'}`}>
                {status.isSyncing ? 'Синхронизация...' : status.pendingActions === 0 ? 'Синхронизировано' : `${status.pendingActions} в очереди`}
              </span>
            </div>
          </div>
        </div>

        {/* Последняя синхронизация */}
        {status.lastSyncTime && (
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 font-medium">Последняя синхронизация</span>
              <span className="text-gray-400 text-sm">
                {new Date(status.lastSyncTime).toLocaleTimeString('ru-RU')}
              </span>
            </div>
          </div>
        )}

        {/* Ошибки синхронизации */}
        {status.syncErrors.length > 0 && (
          <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-300 font-medium">Ошибки синхронизации</span>
              <span className="text-red-400 text-sm">{status.syncErrors.length}</span>
            </div>
            <div className="space-y-1">
              {status.syncErrors.slice(0, 3).map((error, index) => (
                <div key={index} className="text-red-400 text-xs">
                  {error}
                </div>
              ))}
              {status.syncErrors.length > 3 && (
                <div className="text-red-400 text-xs">
                  ... и еще {status.syncErrors.length - 3} ошибок
                </div>
              )}
            </div>
          </div>
        )}

        {/* Действия */}
        <div className="flex space-x-2">
          <button
            onClick={retryFailedActions}
            disabled={!status.isOnline || status.isSyncing || status.pendingActions === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🔄 Повторить
          </button>
          <button
            onClick={clearActions}
            disabled={status.pendingActions === 0}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🗑️ Очистить
          </button>
        </div>
      </div>
    </div>
  );
};
