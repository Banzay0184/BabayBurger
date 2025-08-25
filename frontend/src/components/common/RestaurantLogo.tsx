import React, { useState, useEffect } from 'react';

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
}

export const RestaurantLogo: React.FC<RestaurantLogoProps> = ({ 
  onAnimationComplete,
  showLogo = true 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [logoScale, setLogoScale] = useState(0);
  const [textOpacity, setTextOpacity] = useState(0);
  const [burgerOpacity, setBurgerOpacity] = useState(0);
  const [burgerRotate, setBurgerRotate] = useState(0);
  const [particlesVisible, setParticlesVisible] = useState(false);

  // Проверяем, запущено ли приложение в Telegram WebApp
  const isTelegramWebApp = typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp;

  useEffect(() => {
    if (showLogo) {
      // Начинаем анимацию
      setIsVisible(true);
      
      // Более плавная анимация с CSS transforms
      const timer1 = setTimeout(() => setLogoScale(1), 100);
      const timer2 = setTimeout(() => setTextOpacity(1), 1200);
      const timer3 = setTimeout(() => setBurgerOpacity(1), 1800);
      const timer4 = setTimeout(() => setParticlesVisible(true), 2200);
      const timer5 = setTimeout(() => setBurgerRotate(360), 2500);
      const timer6 = setTimeout(() => {
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      }, 4000);

      // Очистка таймеров при размонтировании
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
        clearTimeout(timer5);
        clearTimeout(timer6);
      };
    }
  }, [showLogo, onAnimationComplete]);

  if (!showLogo) return null;

  return (
    <div className={`
      fixed inset-0 z-[99999] bg-gradient-to-br from-dark-900 via-dark-800 to-dark-700
      flex flex-col items-center justify-center
      transition-opacity duration-1000 ease-out
      ${isVisible ? 'opacity-100' : 'opacity-0'}
      ${isTelegramWebApp ? 'pt-0' : ''}
    `}>
      {/* Основной контейнер логотипа */}
      <div className="relative">
        {/* Анимированный круг фона */}
        <div className="
          absolute inset-0 w-48 h-48 
          bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700
          rounded-full blur-3xl opacity-30
          animate-pulse
        " />
        
        {/* Логотип ресторана */}
        <div 
          className="
            relative w-48 h-48 
            bg-gradient-to-br from-primary-500 to-primary-600
            rounded-full flex items-center justify-center
            shadow-2xl shadow-primary-500/50
            border-4 border-white/20
            will-change-transform
          "
          style={{
            transform: `scale(${logoScale})`,
            transition: 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: `0 0 50px ${logoScale > 0 ? 'rgba(59, 130, 246, 0.5)' : 'transparent'}`
          }}
        >
          {/* Иконка бургера */}
          <div 
            className="
              text-6xl text-white
              will-change-transform
            "
            style={{
              opacity: burgerOpacity,
              transform: `rotate(${burgerRotate}deg)`,
              transition: 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            🍔
          </div>
        </div>
      </div>

      {/* Название ресторана */}
      <div 
        className="
          mt-8 text-center
          will-change-opacity
        "
        style={{ 
          opacity: textOpacity,
          transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <h1 className="
          text-4xl font-bold text-white mb-2
          bg-gradient-to-r from-white via-primary-200 to-white
          bg-clip-text text-transparent
          animate-pulse
        ">
          Babay Burger
        </h1>
        
        <p className="
          text-lg text-gray-300 font-medium
          tracking-wider
        ">
          Вкусная еда • Быстрая доставка
        </p>
      </div>

      {/* Анимированные частицы */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className={`
              absolute w-2 h-2 
              bg-primary-400 rounded-full
              will-change-opacity
              ${particlesVisible ? 'opacity-100' : 'opacity-0'}
            `}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              transition: `opacity 1s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.1}s`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          >
            <div className="w-full h-full bg-primary-400 rounded-full animate-pulse" />
          </div>
        ))}
      </div>

      {/* Индикатор загрузки */}
      <div className="
        absolute bottom-20 left-1/2 transform -translate-x-1/2
        flex space-x-2
        will-change-opacity
      " style={{ 
        opacity: textOpacity,
        transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
        <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
};
