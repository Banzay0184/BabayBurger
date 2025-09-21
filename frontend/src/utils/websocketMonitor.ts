/**
 * Утилита для мониторинга состояния WebSocket соединений
 * Помогает диагностировать проблемы с подключением
 */

interface WebSocketStatus {
  url: string;
  readyState: number;
  timestamp: number;
  error?: string;
}

class WebSocketMonitor {
  private connections: Map<string, WebSocketStatus> = new Map();
  private listeners: Set<(statuses: WebSocketStatus[]) => void> = new Set();

  /**
   * Регистрирует WebSocket соединение для мониторинга
   */
  registerConnection(url: string, ws: WebSocket): void {
    const status: WebSocketStatus = {
      url,
      readyState: ws.readyState,
      timestamp: Date.now()
    };
    
    this.connections.set(url, status);
    this.notifyListeners();
    
    // Добавляем обработчики событий
    ws.addEventListener('open', () => this.updateStatus(url, ws));
    ws.addEventListener('close', () => this.updateStatus(url, ws));
    ws.addEventListener('error', () => this.updateStatus(url, ws, 'Connection error'));
  }

  /**
   * Обновляет статус соединения
   */
  private updateStatus(url: string, ws: WebSocket, error?: string): void {
    const status: WebSocketStatus = {
      url,
      readyState: ws.readyState,
      timestamp: Date.now(),
      error
    };
    
    this.connections.set(url, status);
    this.notifyListeners();
  }

  /**
   * Получает текущий статус всех соединений
   */
  getStatuses(): WebSocketStatus[] {
    return Array.from(this.connections.values());
  }

  /**
   * Получает статус конкретного соединения
   */
  getStatus(url: string): WebSocketStatus | undefined {
    return this.connections.get(url);
  }

  /**
   * Проверяет, есть ли активные соединения
   */
  hasActiveConnections(): boolean {
    return Array.from(this.connections.values()).some(
      status => status.readyState === WebSocket.OPEN
    );
  }

  /**
   * Получает количество активных соединений
   */
  getActiveConnectionsCount(): number {
    return Array.from(this.connections.values()).filter(
      status => status.readyState === WebSocket.OPEN
    ).length;
  }

  /**
   * Подписывается на изменения статуса
   */
  subscribe(listener: (statuses: WebSocketStatus[]) => void): () => void {
    this.listeners.add(listener);
    
    // Возвращаем функцию отписки
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Уведомляет всех подписчиков об изменениях
   */
  private notifyListeners(): void {
    const statuses = this.getStatuses();
    this.listeners.forEach(listener => {
      try {
        listener(statuses);
      } catch (error) {
        console.error('WebSocket monitor listener error:', error);
      }
    });
  }

  /**
   * Очищает старые записи (старше 5 минут)
   */
  cleanup(): void {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    
    for (const [url, status] of this.connections.entries()) {
      if (status.timestamp < fiveMinutesAgo && status.readyState !== WebSocket.OPEN) {
        this.connections.delete(url);
      }
    }
    
    this.notifyListeners();
  }

  /**
   * Получает диагностическую информацию
   */
  getDiagnostics(): {
    totalConnections: number;
    activeConnections: number;
    failedConnections: number;
    connections: WebSocketStatus[];
  } {
    const statuses = this.getStatuses();
    const activeConnections = statuses.filter(s => s.readyState === WebSocket.OPEN).length;
    const failedConnections = statuses.filter(s => s.error).length;
    
    return {
      totalConnections: statuses.length,
      activeConnections,
      failedConnections,
      connections: statuses
    };
  }
}

// Создаем глобальный экземпляр монитора
export const websocketMonitor = new WebSocketMonitor();

// Автоматическая очистка каждые 5 минут
setInterval(() => {
  websocketMonitor.cleanup();
}, 5 * 60 * 1000);

// Экспортируем типы
export type { WebSocketStatus };
