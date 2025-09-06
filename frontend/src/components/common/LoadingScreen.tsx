import React from 'react';

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  title = "Babay Food", 
  subtitle = "Загрузка приложения...",
  className = ""
}) => {
  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 ${className}`}>
      <div className="text-center text-white">
        <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
        <h1 className="text-2xl font-semibold mb-2">{title}</h1>
        <p className="text-white/80">{subtitle}</p>
      </div>
    </div>
  );
};
