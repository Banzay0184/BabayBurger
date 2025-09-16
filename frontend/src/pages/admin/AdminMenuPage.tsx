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
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: null as File | null,
    is_hit: false,
    is_new: false,
    is_active: true,
    priority: 0
  });

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

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      image: null,
      is_hit: false,
      is_new: false,
      is_active: true,
      priority: 0
    });
    setEditingItem(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (item: any) => {
    setFormData({
      name: item.name || '',
      description: item.description || '',
      price: item.price || '',
      category: item.category || '',
      image: null,
      is_hit: item.is_hit || false,
      is_new: item.is_new || false,
      is_active: item.is_active !== false,
      priority: item.priority || 0
    });
    setEditingItem(item);
    setShowForm(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, image: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('description', formData.description);
      submitData.append('price', formData.price);
      submitData.append('category', formData.category);
      submitData.append('is_hit', formData.is_hit.toString());
      submitData.append('is_new', formData.is_new.toString());
      submitData.append('is_active', formData.is_active.toString());
      submitData.append('priority', formData.priority.toString());
      
      if (formData.image) {
        submitData.append('image', formData.image);
      }

      let response;
      if (editingItem) {
        response = await adminApi.updateMenuItem(editingItem.id, submitData);
      } else {
        response = await adminApi.createMenuItem(submitData);
      }

      if (response.success) {
        setShowForm(false);
        resetForm();
        loadData();
      } else {
        setError(response.error || 'Ошибка сохранения');
      }
    } catch (err) {
      setError('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок и табы */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Управление меню</h2>
        <div className="flex items-center gap-4">
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
          
          {activeTab === 'items' && (
            <button
              onClick={openAddForm}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <span>➕</span>
              <span>Добавить товар</span>
            </button>
          )}
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
                        onClick={() => openEditForm(item)}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingItem ? 'Редактировать товар' : 'Добавить товар'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Основная информация */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Название товара *
                    </label>
                    <input 
                      type="text" 
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Введите название товара"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Описание
                    </label>
                    <textarea 
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Описание товара"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Цена (сум) *
                    </label>
                    <input 
                      type="number" 
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Категория *
                    </label>
                    <select 
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Выберите категорию</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Изображение
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="cursor-pointer flex flex-col items-center space-y-2"
                      >
                        <div className="text-4xl text-gray-400">📷</div>
                        <div className="text-sm text-gray-600">
                          {formData.image ? formData.image.name : 'Нажмите для загрузки изображения'}
                        </div>
                        <div className="text-xs text-gray-500">
                          JPG, PNG, GIF до 10MB
                        </div>
                      </label>
                    </div>
                    {editingItem?.image && !formData.image && (
                      <div className="mt-2">
                        <div className="text-sm text-gray-600">Текущее изображение:</div>
                        <img 
                          src={editingItem.image} 
                          alt={editingItem.name}
                          className="w-20 h-20 object-cover rounded-lg mt-1"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Порядок отображения
                    </label>
                    <input 
                      type="number" 
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Чем меньше число, тем выше в списке
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Настройки */}
              <div className="border-t pt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Настройки товара</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="is_hit"
                      checked={formData.is_hit}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">🔥 Хит продаж</span>
                  </label>
                  
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="is_new"
                      checked={formData.is_new}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">🆕 Новинка</span>
                  </label>
                  
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">✅ Активен</span>
                  </label>
                </div>
              </div>
              
              {/* Кнопки */}
              <div className="flex gap-4 pt-6 border-t">
                <button 
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Сохранение...' : (editingItem ? 'Сохранить изменения' : 'Добавить товар')}
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


