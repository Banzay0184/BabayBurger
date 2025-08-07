import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  type = 'button',
  fullWidth = false
}) => {
  const baseClasses = 'font-semibold rounded-modern-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 focus:ring-primary-500/50 shadow-button hover:shadow-button-hover',
    secondary: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 focus:ring-primary-500/50 shadow-button hover:shadow-button-hover',
    accent: 'bg-gradient-to-r from-accent-500 to-accent-600 text-white hover:from-accent-600 hover:to-accent-700 focus:ring-accent-500/50 shadow-button hover:shadow-button-hover',
    success: 'bg-gradient-to-r from-success-500 to-success-600 text-white hover:from-success-600 hover:to-success-700 focus:ring-success-500/50 shadow-button hover:shadow-button-hover',
    warning: 'bg-gradient-to-r from-warning-500 to-warning-600 text-white hover:from-warning-600 hover:to-warning-700 focus:ring-warning-500/50 shadow-button hover:shadow-button-hover',
    danger: 'bg-gradient-to-r from-error-500 to-error-600 text-white hover:from-error-600 hover:to-error-700 focus:ring-error-500/50 shadow-button hover:shadow-button-hover'
  };
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };
  
  const widthClasses = fullWidth ? 'w-full' : '';
  
  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    widthClasses,
    className
  ].join(' ');

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          <span>Загрузка...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}; 