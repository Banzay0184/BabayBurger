import React from 'react';
import { clientApi } from '../../api/unifiedClient';

type PromoCode = {
  id: number;
  code: string;
  discount_percent: number;
  max_discount: string;
  min_order_amount: string;
  is_active: boolean;
  expires_at: string | null;
};

export const AdminPromoCodesPage: React.FC = () => {
  const [items, setItems] = React.useState<PromoCode[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await clientApi.get<PromoCode[]>('promo-codes/');
      setItems(data);
    } catch (e: any) {
      setError(e?.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Промокоды</h2>
        <button className="px-3 py-2 bg-blue-600 text-white rounded">Создать промокод</button>
      </div>
      {loading && <div>Загрузка...</div>}
      {error && <div className="text-red-600">{error}</div>}
      <div className="grid grid-cols-1 gap-3">
        {items.map((pc) => (
          <div key={pc.id} className="bg-white border rounded p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{pc.code}</div>
              <div className="text-sm text-gray-600">{pc.is_active ? 'Активен' : 'Неактивен'}</div>
            </div>
            <div className="text-sm text-gray-700">
              Скидка: {pc.discount_percent}% • Мин. заказ: {pc.min_order_amount} • Макс. скидка: {pc.max_discount}
            </div>
            <div className="mt-2 flex gap-2">
              <button className="px-2 py-1 text-sm border rounded">Редактировать</button>
              <button className="px-2 py-1 text-sm border rounded">Удалить</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPromoCodesPage;


