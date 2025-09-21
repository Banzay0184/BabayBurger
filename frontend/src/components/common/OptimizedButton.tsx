import React from 'react';

interface OptimizedButtonProps {
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const OptimizedButton: React.FC<OptimizedButtonProps> = React.memo(({
  onClick,
  className = '',
  children,
  disabled = false,
  type = 'button'
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
});
