/**
 * Универсальная система хранения данных для PWA
 * Поддерживает localStorage и sessionStorage как fallback
 */

interface StorageInterface {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class UniversalStorage implements StorageInterface {
  private storage: StorageInterface;
  private isLocalStorageAvailable: boolean;

  constructor() {
    this.isLocalStorageAvailable = this.checkLocalStorage();
    
    if (this.isLocalStorageAvailable) {
      this.storage = localStorage;
      console.log('✅ Using localStorage for data storage');
    } else {
      this.storage = sessionStorage;
      console.log('⚠️ localStorage not available, using sessionStorage');
    }
  }

  private checkLocalStorage(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('❌ localStorage not available:', error);
      return false;
    }
  }

  getItem(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch (error) {
      console.error('❌ Error getting item from storage:', error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      this.storage.setItem(key, value);
      console.log(`💾 Saved to ${this.isLocalStorageAvailable ? 'localStorage' : 'sessionStorage'}:`, key);
    } catch (error) {
      console.error('❌ Error setting item in storage:', error);
    }
  }

  removeItem(key: string): void {
    try {
      this.storage.removeItem(key);
      console.log(`🗑️ Removed from ${this.isLocalStorageAvailable ? 'localStorage' : 'sessionStorage'}:`, key);
    } catch (error) {
      console.error('❌ Error removing item from storage:', error);
    }
  }

  // Проверяем, используется ли localStorage
  isUsingLocalStorage(): boolean {
    return this.isLocalStorageAvailable;
  }

  // Получаем информацию о типе хранилища
  getStorageInfo(): { type: string; available: boolean } {
    return {
      type: this.isLocalStorageAvailable ? 'localStorage' : 'sessionStorage',
      available: true
    };
  }
}

// Создаем глобальный экземпляр
export const universalStorage = new UniversalStorage();

// Экспортируем для совместимости
export default universalStorage;
