import { useCallback } from 'react';

// Простой хук для мобильных звуков
export const useSimpleMobileSound = () => {
  // Воспроизведение звука через глобальную функцию
  const playSound = useCallback((type: 'new_order' | 'order_update' | 'notification') => {
    try {
      console.log(`📱 Simple Mobile: Attempting to play ${type} sound`);
      
      if ((window as any).playMobileSound) {
        (window as any).playMobileSound(type);
        console.log(`📱 Simple Mobile: ${type} sound request sent`);
      } else {
        console.warn('📱 Simple Mobile: playMobileSound function not available');
      }
    } catch (error) {
      console.error(`📱 Simple Mobile: Error playing ${type} sound:`, error);
    }
  }, []);

  return { playSound };
};
