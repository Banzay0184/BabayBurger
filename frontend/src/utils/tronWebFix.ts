/**
 * Утилита для предотвращения конфликтов с TronWeb/TronLink
 * Решает проблему "TronWeb is already initiated. TronLink will overwrite the current instance"
 */

export const fixTronWebConflicts = (): void => {
  // Проверяем, есть ли конфликт с TronWeb
  if (typeof window !== 'undefined') {
    // Сохраняем оригинальный TronWeb если он уже существует
    const originalTronWeb = (window as any).tronWeb;
    
    // Перехватываем попытки перезаписи TronWeb
    Object.defineProperty(window, 'tronWeb', {
      get() {
        return originalTronWeb;
      },
      set(newValue) {
        if (originalTronWeb && newValue !== originalTronWeb) {
          console.warn('⚠️ TronWeb conflict prevented: preserving original instance');
          return;
        }
        // Если оригинального TronWeb нет, разрешаем установку
        if (!originalTronWeb) {
          (window as any)._tronWeb = newValue;
        }
      },
      configurable: true
    });

    // Аналогично для TronLink
    const originalTronLink = (window as any).tronLink;
    
    Object.defineProperty(window, 'tronLink', {
      get() {
        return originalTronLink;
      },
      set(newValue) {
        if (originalTronLink && newValue !== originalTronLink) {
          console.warn('⚠️ TronLink conflict prevented: preserving original instance');
          return;
        }
        if (!originalTronLink) {
          (window as any)._tronLink = newValue;
        }
      },
      configurable: true
    });

    console.log('🔧 TronWeb/TronLink conflict prevention initialized');
  }
};

// Автоматически применяем исправление при загрузке модуля
if (typeof window !== 'undefined') {
  fixTronWebConflicts();
}
