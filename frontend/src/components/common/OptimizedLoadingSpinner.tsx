import React from 'react';

interface OptimizedLoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const OptimizedLoadingSpinner: React.FC<OptimizedLoadingSpinnerProps> = React.memo(({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`${sizeClasses[size]} border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin ${className}`} />
  );
});
