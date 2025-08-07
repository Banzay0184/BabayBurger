import React from 'react';
import { Button } from '../ui/Button';
import type { Promotion } from '../../types/menu';

interface PromotionCardProps {
  promotion: Promotion;
  onApply?: (promotion: Promotion) => void;
}

export const PromotionCard: React.FC<PromotionCardProps> = ({ promotion, onApply }) => {
  const getDiscountText = () => {
    switch (promotion.discount_type) {
      case 'PERCENT':
        return `${promotion.discount_value}% скидка`;
      case 'FIXED_AMOUNT':
        return `Скидка ${promotion.discount_value} ₽`;
      case 'FREE_DELIVERY':
        return 'Бесплатная доставка';
      case 'FREE_ITEM':
        return 'Бесплатный товар';
      default:
        return 'Скидка';
    }
  };

  const getIcon = () => {
    switch (promotion.discount_type) {
      case 'PERCENT':
        return '💯';
      case 'FIXED_AMOUNT':
        return '💰';
      case 'FREE_DELIVERY':
        return '🚚';
      case 'FREE_ITEM':
        return '🎁';
      default:
        return '🎉';
    }
  };

  const getGradient = () => {
    switch (promotion.discount_type) {
      case 'PERCENT':
        return 'from-accent-500 to-accent-600';
      case 'FIXED_AMOUNT':
        return 'from-success-500 to-success-600';
      case 'FREE_DELIVERY':
        return 'from-primary-500 to-primary-600';
      case 'FREE_ITEM':
        return 'from-warning-500 to-warning-600';
      default:
        return 'from-primary-500 to-primary-600';
    }
  };

  const isExpired = () => {
    const now = new Date();
    const validTo = new Date(promotion.valid_to);
    return now > validTo;
  };

  const isUsageLimitReached = () => {
    return promotion.max_uses && promotion.usage_count >= promotion.max_uses;
  };

  const isActive = () => {
    return promotion.is_active && !isExpired() && !isUsageLimitReached();
  };

  return (
    <div className={`
      tg-card-modern p-6 relative overflow-hidden
      transition-all duration-300 hover:scale-105
      ${!isActive() ? 'opacity-60' : ''}
    `}>
      {/* Градиентный фон для темной темы */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getGradient()} opacity-10`}></div>
      
      {/* Декоративные элементы для темной темы */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-gray-600/20 to-transparent rounded-full -translate-y-10 translate-x-10"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-br from-gray-600/20 to-transparent rounded-full translate-y-8 -translate-x-8"></div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 bg-gradient-to-br ${getGradient()} rounded-xl flex items-center justify-center shadow-dark-glow`}>
              <span className="text-xl text-white">{getIcon()}</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-100 mb-1 neon-text">
                {promotion.name}
              </h3>
              <p className="text-sm text-gray-400 font-medium">
                {getDiscountText()}
              </p>
            </div>
          </div>
          
          {!isActive() && (
            <span className="px-3 py-1 bg-error-900/30 text-error-300 text-xs font-semibold rounded-full border border-error-700/50">
              {isExpired() ? 'Истекла' : isUsageLimitReached() ? 'Лимит' : 'Неактивна'}
            </span>
          )}
        </div>

        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          {promotion.description}
        </p>

        {promotion.min_order_amount && (
          <div className="mb-6 p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl border border-gray-600/50">
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">💰</span>
              <p className="text-sm text-gray-300">
                Минимальная сумма заказа: <span className="font-bold text-gray-100">{promotion.min_order_amount} ₽</span>
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {promotion.max_uses && (
              <span className="flex items-center">
                <span className="mr-1">📊</span>
                Использовано: {promotion.usage_count}/{promotion.max_uses}
              </span>
            )}
          </div>
          
          {isActive() && onApply && (
            <Button
              onClick={() => onApply(promotion)}
              size="sm"
              variant="accent"
              className="!px-6 !py-2"
            >
              <span className="flex items-center">
                <span className="mr-2">✨</span>
                Применить
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}; 