import React, { useState, useEffect, useMemo, useCallback } from 'react';
import logo from '/logobabay.png';
import { useLanguage } from '../../context/LanguageContext';


// Типы для Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp?: any;
    };
  }
}

interface RestaurantLogoProps {
  onAnimationComplete?: () => void;
  showLogo?: boolean;
  className?: string;
}

export const RestaurantLogo: React.FC<RestaurantLogoProps> = React.memo(({ 
  onAnimationComplete,
  showLogo = true,
  className = ""
}) => {
  // Ранний возврат должен быть ДО всех хуков
  if (!showLogo) return null;

  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [logoScale, setLogoScale] = useState(0);
  const [logoPosition, setLogoPosition] = useState({ x: 0, y: 0 });
  const [textOpacity, setTextOpacity] = useState(0);
  const [textSlide, setTextSlide] = useState(50);
  const [particlesVisible, setParticlesVisible] = useState(false);

  // Мемоизируем проверку Telegram WebApp
  const isTelegramWebApp = useMemo(() => 
    typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp,
    []
  );

  // Мемоизируем callback для завершения анимации
  const handleAnimationComplete = useCallback(() => {
    if (onAnimationComplete) {
      onAnimationComplete();
    }
  }, [onAnimationComplete]);

  useEffect(() => {
    // Начинаем анимацию
    setIsVisible(true);
    
    // Оптимизированная анимация с меньшим количеством таймеров
    const timers = [
      setTimeout(() => setLogoScale(1), 300),
      setTimeout(() => setLogoPosition({ x: 0, y: 0 }), 600),
      setTimeout(() => setTextOpacity(1), 1200),
      setTimeout(() => setTextSlide(0), 1500),
      setTimeout(() => setParticlesVisible(true), 1800),
      setTimeout(handleAnimationComplete, 2500)
    ];

    // Очистка таймеров при размонтировании
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [handleAnimationComplete]);

  return (
    <div className={`
      fixed inset-0 z-80 bg-gradient-to-br from-white via-gray-100 to-gray-200
      flex flex-col items-center justify-center
      transition-opacity duration-1000 ease-out
      ${isVisible ? 'opacity-100' : 'opacity-0'}
      ${isTelegramWebApp ? 'pt-0' : ''}
    `}>
      {/* CSS анимации */}
      <style>{`
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-15px); }
          60% { transform: translateY(-8px); }
        }
        @keyframes slideIn {
          from { transform: translateX(-100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes fadeInUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      
      {/* Основной контейнер логотипа */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Анимированный фон - черно-белый стиль */}
        <div className="
          absolute inset-0 w-full h-full
            
          opacity-90
        " />
        
        {/* Логотип ресторана - черно-белый стиль */}
        <div 
          className="
            relative w-64 h-64
            flex items-center justify-center
            will-change-transform
            z-10
          "
          style={{
            transform: `scale(${logoScale}) translate(${logoPosition.x}px, ${logoPosition.y}px)`,
            transition: 'all 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}
        >
          {/* Иконка бургера */}
          <div className="
            w-full h-full
            flex items-center justify-center
            will-change-transform
          ">
            <img 
              src={logo} 
              alt="Babay Food" 
              className={`w-full h-full object-contain drop-shadow-2xl ${className}`}
            />
          </div>
        </div>
      </div>

      {/* Название ресторана - черно-белый стиль */}
      <div 
        className="
          mt-8 text-center z-20
          will-change-opacity will-change-transform
        "
        style={{ 
          opacity: textOpacity,
          transform: `translateY(${textSlide}px)`,
          transition: 'all 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      >
        
        <p className="
          text-xl text-gray-700 font-semibold
          tracking-wider
          drop-shadow-sm
        ">
          ВКУСНАЯ ЕДА
          <br />
                          {t('fast_delivery').toUpperCase()}
        </p>
      </div>

      {/* Анимированные частицы - черно-белый стиль */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {useMemo(() => 
          [...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`
                absolute w-3 h-3 
                bg-black rounded-full
                will-change-opacity will-change-transform
                ${particlesVisible ? 'opacity-100' : 'opacity-0'}
              `}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                transition: `opacity 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 0.1}s`,
                animation: particlesVisible ? `bounce ${3 + Math.random() * 2}s infinite` : 'none',
                animationDelay: `${Math.random() * 1}s`
              }}
            />
          )), [particlesVisible]
        )}
      </div>

      {/* Индикатор загрузки - черно-белый стиль */}
      <div className="
        absolute bottom-20 left-1/2 transform -translate-x-1/2
        flex space-x-3
        will-change-opacity
        z-20
      " style={{ 
        opacity: textOpacity,
        transition: 'opacity 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }}>
        <div className="w-4 h-4 bg-black rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
        <div className="w-4 h-4 bg-black rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        <div className="w-4 h-4 bg-black rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
});
