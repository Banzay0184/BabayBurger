import React from 'react';
import { menuApi } from '../../api/menu';
import { adminApi } from '../../api/adminApi';

export const AdminMenuPage: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [menuItems, setMenuItems] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'categories' | 'items'>('categories');
  const [showForm, setShowForm] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Загружаем данные меню...');
      const [categoriesRes, itemsRes] = await Promise.all([
        menuApi.getCategories(),
        adminApi.getMenuItems()
      ]);
      
      console.log('📊 Ответ категорий:', categoriesRes);
      console.log('📊 Ответ товаров:', itemsRes);
      
      if (categoriesRes.success) {
        setCategories(categoriesRes.data || []);
        console.log('✅ Категории загружены:', categoriesRes.data);
      }
      if (itemsRes.success) {
        // API возвращает {count: X, results: [...]}, нужно извлечь results
        const items = Array.isArray((itemsRes.data as any)?.results) ? (itemsRes.data as any).results : [];
        setMenuItems(items);
        console.log('✅ Товары загружены:', items);
      }
      
      if (!categoriesRes.success) setError(categoriesRes.error?.message || 'Ошибка загрузки категорий');
      if (!itemsRes.success) setError(itemsRes.error || 'Ошибка загрузки товаров');
    } catch (e: any) {
      console.error('💥 Ошибка загрузки меню:', e);
      setError(e.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleDeleteItem = async (id: number) => {
    if (!confirm('Удалить товар?')) return;
    
    const res = await adminApi.deleteMenuItem(id);
    if (res.success) {
      loadData();
    } else {
      alert('Ошибка удаления: ' + (res.error || 'Неизвестная ошибка'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок и табы */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Управление меню</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded ${activeTab === 'categories' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Категории
          </button>
          <button 
            onClick={() => setActiveTab('items')}
            className={`px-4 py-2 rounded ${activeTab === 'items' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Товары
          </button>
        </div>
      </div>

      {/* Категории */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Категории</h3>
            <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              Добавить категорию
            </button>
          </div>
          
          {loading && <div className="text-center py-4">Загрузка...</div>}
          {error && <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((c) => (
              <div key={c.id} className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="font-medium text-lg text-gray-900">{c.name}</div>
                <div className="text-sm text-gray-600 mt-1 line-clamp-2">{c.description}</div>
                <div className="mt-3 flex gap-2">
                  <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                    Редактировать
                  </button>
                  <button className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200">
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Товары */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Товары меню</h3>
            <button 
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Добавить товар
            </button>
          </div>
          
          {loading && <div className="text-center py-4">Загрузка...</div>}
          {error && <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>}
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Название
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Цена
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Категория
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
                {menuItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">{item.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.price} сум
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {categories.find(c => c.id === item.category)?.name || 'Неизвестно'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.is_hit ? 'bg-green-100 text-green-800' : 
                        item.is_new ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.is_hit ? 'Хит' : item.is_new ? 'Новинка' : 'Обычный'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => setEditingItem(item)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Редактировать
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(item.id)}
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
        </div>
      )}

      {/* Форма товара */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? 'Редактировать товар' : 'Добавить товар'}
            </h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                <input 
                  type="text" 
                  className="w-full border rounded px-3 py-2"
                  defaultValue={editingItem?.name || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                <textarea 
                  className="w-full border rounded px-3 py-2"
                  defaultValue={editingItem?.description || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Цена (сум)</label>
                <input 
                  type="number" 
                  className="w-full border rounded px-3 py-2"
                  defaultValue={editingItem?.price || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
                <select className="w-full border rounded px-3 py-2">
                  <option value="">Выберите категорию</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id} selected={editingItem?.category === c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
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
                  {editingItem ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenuPage;


