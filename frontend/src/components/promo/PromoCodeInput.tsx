import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getApiUrl } from '../../config/api';

interface PromoCodeInputProps {
  orderAmount: number;
  onPromoCodeApplied: (discountAmount: number, finalPrice: number, promoCodeId: number) => void;
  onPromoCodeRemoved: () => void;
  appliedPromoCode?: {
    code: string;
    discountAmount: number;
    finalPrice: number;
    promoCodeId: number;
  };
}

export const PromoCodeInput: React.FC<PromoCodeInputProps> = ({
  orderAmount,
  onPromoCodeApplied,
  onPromoCodeRemoved,
  appliedPromoCode
}) => {
  const { state } = useAuth();
  const { t } = useLanguage();
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePromoCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!promoCode.trim()) {
      setError(t('enter_promo_code'));
      return;
    }

    if (!state.user?.telegram_id) {
      setError(t('user_not_authorized'));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const url = getApiUrl('promo-codes/validate/');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          code: promoCode.trim().toUpperCase(),
          order_amount: orderAmount,
          telegram_id: state.user.telegram_id
        })
      });

      const data = await response.json();

      if (data.is_valid) {
        setSuccess(data.message);
        setPromoCode('');
        onPromoCodeApplied(data.discount_amount, data.final_price, data.promo_code_id);
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error('Ошибка валидации промокода:', err);
      setError(t('promo_code_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePromoCode = () => {
    onPromoCodeRemoved();
    setSuccess(null);
    setError(null);
  };

  if (appliedPromoCode) {
    return (
      <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🎉</span>
            <div>
              <h4 className="text-green-400 font-semibold">{t('promo_code_applied')}</h4>
              <p className="text-green-300 text-sm">{t('promo_code_label')}: {appliedPromoCode.code}</p>
            </div>
          </div>
          <button
            onClick={handleRemovePromoCode}
            className="text-red-400 hover:text-red-300 transition-colors"
            aria-label={t('promo_code_remove')}
          >
            ✕
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-green-800/20 rounded-lg p-3">
            <div className="text-green-300">{t('discount_label_promo')}</div>
                            <div className="text-green-100 font-bold">-{appliedPromoCode.discountAmount} {t('economy_currency')}</div>
          </div>
          <div className="bg-green-800/20 rounded-lg p-3">
            <div className="text-green-300">{t('final_price_label_promo')}</div>
                            <div className="text-green-100 font-bold">{appliedPromoCode.finalPrice} {t('economy_currency')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
      <h4 className="text-gray-200 font-semibold mb-3 flex items-center">
        <span className="mr-2">🎫</span>
        {t('promo_code')}
      </h4>
      
      <form onSubmit={handlePromoCodeSubmit} className="space-y-3 ">
        <div className="flex space-x-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder={t('promo_code_placeholder')}
            className="flex-1 bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
            disabled={loading}
            maxLength={20}
          />
          <button
            type="submit"
            disabled={loading || !promoCode.trim()}
            className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>{t('loading')}</span>
              </>
            ) : (
              <>
                <span>{t('apply_promo_code')}</span>
              </>
            )}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-3">
            <p className="text-red-400 text-sm flex items-center">
              <span className="mr-2">❌</span>
              {error}
            </p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-3">
            <p className="text-green-400 text-sm flex items-center">
              <span className="mr-2">✅</span>
              {success}
            </p>
          </div>
        )}
      </form>
      
      <div className="mt-3 text-xs text-gray-500">
        <p>💡 Введите код промокода для получения скидки на заказ</p>
      </div>
    </div>
  );
};
