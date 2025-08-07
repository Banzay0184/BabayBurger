import React from 'react';
import { redirectToTelegramBot } from '../../utils/telegram';

interface TelegramBotButtonProps {
  command?: string;
  children?: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary';
}

export const TelegramBotButton: React.FC<TelegramBotButtonProps> = ({
  command = '/start',
  children,
  className = '',
  variant = 'primary'
}) => {
  const handleClick = () => {
    redirectToTelegramBot(command);
  };

  const baseClasses = 'inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500',
    secondary: 'bg-purple-500 text-white hover:bg-purple-600 focus:ring-purple-500'
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

  return (
    <button onClick={handleClick} className={classes}>
      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
      {children || 'Открыть в Telegram'}
    </button>
  );
}; 