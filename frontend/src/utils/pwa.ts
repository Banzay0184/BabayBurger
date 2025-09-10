// PWA utilities for Service Worker registration and management

export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export class PWAManager {
  private static instance: PWAManager;
  private deferredPrompt: PWAInstallPrompt | null = null;
  private isInstalled = false;
  private onlineStatus = navigator.onLine;

  private constructor() {
    this.setupEventListeners();
  }

  public static getInstance(): PWAManager {
    if (!PWAManager.instance) {
      PWAManager.instance = new PWAManager();
    }
    return PWAManager.instance;
  }

  // Регистрация Service Worker
  public async registerServiceWorker(): Promise<boolean> {
    if ('serviceWorker' in navigator) {
      try {
        console.log('🔧 Registering Service Worker...');
        
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('✅ Service Worker registered successfully:', registration);
        
        // Проверяем обновления
        registration.addEventListener('updatefound', () => {
          console.log('🔄 Service Worker update found');
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🆕 New Service Worker installed, reloading...');
                window.location.reload();
              }
            });
          }
        });

        return true;
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
        return false;
      }
    } else {
      console.log('⚠️ Service Worker not supported');
      return false;
    }
  }

  // Установка PWA приложения
  public async installPWA(): Promise<boolean> {
    if (this.deferredPrompt) {
      try {
        await this.deferredPrompt.prompt();
        const choiceResult = await this.deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          console.log('✅ PWA installation accepted');
          this.isInstalled = true;
          this.deferredPrompt = null;
          return true;
        } else {
          console.log('❌ PWA installation dismissed');
          return false;
        }
      } catch (error) {
        console.error('❌ PWA installation failed:', error);
        return false;
      }
    }
    return false;
  }

  // Проверка, можно ли установить PWA
  public canInstall(): boolean {
    return this.deferredPrompt !== null && !this.isInstalled;
  }

  // Проверка, установлено ли приложение
  public isPWAInstalled(): boolean {
    return this.isInstalled || 
           window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  // Проверка онлайн статуса
  public isOnline(): boolean {
    return this.onlineStatus;
  }

  // Получение статуса подключения
  public getConnectionStatus(): 'online' | 'offline' | 'slow' {
    if (!this.onlineStatus) return 'offline';
    
    const connection = (navigator as any).connection;
    if (connection) {
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        return 'slow';
      }
    }
    
    return 'online';
  }

  // Настройка обработчиков событий
  private setupEventListeners(): void {
    // Обработка beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (event) => {
      console.log('📱 PWA install prompt available');
      event.preventDefault();
      this.deferredPrompt = event as any;
    });

    // Обработка appinstalled
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed successfully');
      this.isInstalled = true;
      this.deferredPrompt = null;
    });

    // Обработка онлайн/офлайн статуса
    window.addEventListener('online', () => {
      console.log('🌐 Connection restored');
      this.onlineStatus = true;
      this.notifyConnectionChange('online');
    });

    window.addEventListener('offline', () => {
      console.log('📴 Connection lost');
      this.onlineStatus = false;
      this.notifyConnectionChange('offline');
    });

    // Обработка изменений качества соединения
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', () => {
        const status = this.getConnectionStatus();
        this.notifyConnectionChange(status);
      });
    }
  }

  // Уведомление об изменении статуса соединения
  private notifyConnectionChange(status: 'online' | 'offline' | 'slow'): void {
    const event = new CustomEvent('connectionchange', { 
      detail: { status } 
    });
    window.dispatchEvent(event);
  }

  // Получение информации о кэше
  public async getCacheInfo(): Promise<{ name: string; size: number }[]> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const cacheInfo = await Promise.all(
        cacheNames.map(async (name) => {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          return {
            name,
            size: keys.length
          };
        })
      );
      return cacheInfo;
    }
    return [];
  }

  // Очистка кэша
  public async clearCache(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
      console.log('🗑️ Cache cleared');
    }
  }

  // Обновление кэша
  public async updateCache(): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ action: 'updateCache' });
    }
  }
}

// Экспорт экземпляра для использования в приложении
export const pwaManager = PWAManager.getInstance();
