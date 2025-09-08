import React from 'react';
import { adminApi } from '../../api/adminApi';

type PromoCode = {
  id: number;
  code: string;
  discount_percent: number;
  max_discount: string;
  min_order_amount: string;
  is_active: boolean;
  expires_at: string | null;
  max_uses?: number;
  created_at?: string;
};

export const AdminPromoCodesPage: React.FC = () => {
  const [items, setItems] = React.useState<PromoCode[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<PromoCode | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listPromoCodes();
      if (res.success) {
        setItems(res.data || []);
      } else {
        setError(res.error?.message || 'Ошибка загрузки');
      }
    } catch (e: any) {
      setError(e?.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить промокод?')) return;
    
    const res = await adminApi.deletePromoCode(id);
    if (res.success) {
      load();
    } else {
      alert('Ошибка удаления: ' + (res.error?.message || 'Неизвестная ошибка'));
    }
  };

  const handleEdit = (item: PromoCode) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Без ограничений';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Управление промокодами</h2>
        <button 
          onClick={handleCreate}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Создать промокод
        </button>
      </div>

      {loading && <div className="text-center py-4">Загрузка...</div>}
      {error && <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Код
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Скидка
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Мин. заказ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Макс. скидка
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Срок действия
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((pc) => (
              <tr key={pc.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{pc.code}</div>
                  <div className="text-sm text-gray-500">
                    Создан: {pc.created_at ? new Date(pc.created_at).toLocaleDateString('ru-RU') : 'Неизвестно'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {pc.discount_percent}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {pc.min_order_amount} сум
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {pc.max_discount} сум
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(pc.expires_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    pc.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {pc.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button 
                    onClick={() => handleEdit(pc)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Редактировать
                  </button>
                  <button 
                    onClick={() => handleDelete(pc.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Форма промокода */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? 'Редактировать промокод' : 'Создать промокод'}
            </h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Код промокода</label>
                <input 
                  type="text" 
                  className="w-full border rounded px-3 py-2"
                  defaultValue={editingItem?.code || ''}
                  placeholder="SUMMER2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Процент скидки</label>
                <input 
                  type="number" 
                  min="1" 
                  max="100"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={editingItem?.discount_percent || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Максимальная скидка (сум)</label>
                <input 
                  type="number" 
                  className="w-full border rounded px-3 py-2"
                  defaultValue={editingItem?.max_discount || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Минимальная сумма заказа (сум)</label>
                <input 
                  type="number" 
                  className="w-full border rounded px-3 py-2"
                  defaultValue={editingItem?.min_order_amount || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Срок действия</label>
                <input 
                  type="datetime-local" 
                  className="w-full border rounded px-3 py-2"
                  defaultValue={editingItem?.expires_at ? new Date(editingItem.expires_at).toISOString().slice(0, 16) : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Максимум использований</label>
                <input 
                  type="number" 
                  min="0"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={editingItem?.max_uses || ''}
                  placeholder="0 = безлимит"
                />
              </div>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="is_active"
                  className="mr-2"
                  defaultChecked={editingItem?.is_active ?? true}
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Активен
                </label>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingItem ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromoCodesPage;


