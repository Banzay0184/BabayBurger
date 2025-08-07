import React from 'react';
import { Button } from '../ui/Button';
import type { Promotion } from '../types/menu';

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
      bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6
      transition-all duration-300 hover:shadow-glow hover:border-primary/40
      ${!isActive() ? 'opacity-60' : ''}
    `}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">{getIcon()}</span>
          <div>
            <h3 className="text-lg font-bold text-text-primary">
              {promotion.name}
            </h3>
            <p className="text-sm text-text-secondary">
              {getDiscountText()}
            </p>
          </div>
        </div>
        
        {!isActive() && (
          <span className="px-2 py-1 bg-error/20 text-error text-xs rounded-full">
            {isExpired() ? 'Истекла' : isUsageLimitReached() ? 'Лимит' : 'Неактивна'}
          </span>
        )}
      </div>

      <p className="text-text-secondary text-sm mb-4">
        {promotion.description}
      </p>

      {promotion.min_order_amount && (
        <div className="mb-4 p-3 bg-light-gray rounded-lg">
          <p className="text-xs text-text-secondary">
            Минимальная сумма заказа: <span className="font-semibold text-text-primary">{promotion.min_order_amount} ₽</span>
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-text-light">
          {promotion.max_uses && (
            <span>Использовано: {promotion.usage_count}/{promotion.max_uses}</span>
          )}
        </div>
        
        {isActive() && onApply && (
          <Button
            onClick={() => onApply(promotion)}
            size="sm"
            variant="primary"
          >
            Применить
          </Button>
        )}
      </div>
    </div>
  );
}; 