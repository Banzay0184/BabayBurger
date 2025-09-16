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
    <div className="space-y-8">
      {/* Заголовок и табы */}
      <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-3xl">🍽️</span>
            </div>
            <div>
              <h2 className="text-3xl font-bold">Управление меню</h2>
              <p className="text-orange-100 text-lg">Создавайте и редактируйте блюда для вашего ресторана</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex gap-2 bg-white/20 backdrop-blur-sm rounded-xl p-1">
              <button 
                onClick={() => setActiveTab('categories')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === 'categories' 
                    ? 'bg-white text-orange-600 shadow-lg' 
                    : 'text-white hover:bg-white/20'
                }`}
              >
                📂 Категории
              </button>
              <button 
                onClick={() => setActiveTab('items')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === 'items' 
                    ? 'bg-white text-orange-600 shadow-lg' 
                    : 'text-white hover:bg-white/20'
                }`}
              >
                🍔 Товары
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Категории */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                  <span className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white text-sm mr-3">📂</span>
                  Категории ({categories.length})
                </h3>
                <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-semibold shadow-md hover:shadow-lg flex items-center space-x-2 group">
                  <span className="group-hover:scale-110 transition-transform">➕</span>
                  <span>Добавить категорию</span>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {loading && <div className="text-center py-8">Загрузка...</div>}
              {error && <div className="text-red-600 bg-red-50 p-4 rounded-lg mb-4">{error}</div>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((c) => (
                  <div key={c.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="font-bold text-lg text-gray-900 mb-2">{c.name}</div>
                    <div className="text-sm text-gray-600 mb-3 line-clamp-2">{c.description}</div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-semibold">
                        Редактировать
                      </button>
                      <button className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-semibold">
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Товары */}
      {activeTab === 'items' && (
        <div className="space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-lg font-semibold text-gray-600">Загрузка товаров...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">⚠️</span>
                <div className="text-red-800 font-semibold text-lg">{error}</div>
              </div>
            </div>
          )}
          
          <div className="bg-white rounded-2xl border border-gray-200/50 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                  <span className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white text-sm mr-3">🍔</span>
                  Список товаров ({menuItems.length})
                </h3>
                <button
                  onClick={openAddForm}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-semibold shadow-md hover:shadow-lg flex items-center space-x-2 group"
                >
                  <span className="group-hover:scale-110 transition-transform">➕</span>
                  <span>Добавить товар</span>
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Товар</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Цена</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Категория</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Статус</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {menuItems.map((item, index) => (
                    <tr key={item.id} className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          {item.image && (
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded-lg shadow-sm"
                            />
                          )}
                          <div>
                            <div className="text-sm font-bold text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-500 max-w-xs truncate">{item.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                          {item.price} ₽
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs font-semibold text-gray-700 bg-blue-50 px-2 py-1 rounded-lg">
                          {categories.find(c => c.id === item.category)?.name || 'Неизвестно'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex space-x-1">
                          {item.is_hit && (
                            <span className="inline-flex px-2 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200">
                              🔥
                            </span>
                          )}
                          {item.is_new && (
                            <span className="inline-flex px-2 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border border-blue-200">
                              🆕
                            </span>
                          )}
                          {!item.is_hit && !item.is_new && (
                            <span className="inline-flex px-2 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300">
                              📦
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => openEditForm(item)}
                            className="px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 font-semibold shadow-sm hover:shadow-md flex items-center space-x-1 group text-xs"
                          >
                            <span className="group-hover:scale-110 transition-transform">✏️</span>
                            <span>Изменить</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200 font-semibold shadow-sm hover:shadow-md flex items-center space-x-1 group text-xs"
                          >
                            <span className="group-hover:scale-110 transition-transform">🗑️</span>
                            <span>Удалить</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Форма товара */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 w-full max-w-3xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Заголовок с градиентом */}
            <div className="bg-gradient-to-br from-orange-500 to-red-500 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-lg">
                      {editingItem ? '✏️' : '➕'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {editingItem ? 'Редактировать товар' : 'Добавить товар'}
                    </h3>
                    <p className="text-blue-100 text-xs">
                      {editingItem ? 'Обновите информацию о товаре' : 'Создайте новый товар для меню'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all duration-200 group"
                >
                  <span className="text-lg group-hover:scale-110 transition-transform">×</span>
                </button>
              </div>
            </div>
            
            {/* Контент формы */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)]">
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Основная информация */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xs mr-2">📝</span>
                      Основная информация
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Название товара *
                        </label>
                        <input 
                          type="text" 
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm"
                          placeholder="Введите название товара"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Описание
                        </label>
                        <textarea 
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          rows={2}
                          className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm resize-none"
                          placeholder="Описание товара"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Цена (сум) *
                        </label>
                        <div className="relative">
                          <input 
                            type="number" 
                            name="price"
                            value={formData.price}
                            onChange={handleInputChange}
                            min="0"
                            step="0.01"
                            className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 pl-10 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm"
                            placeholder="0.00"
                            required
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium text-sm">₽</div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Категория *
                        </label>
                        <select 
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm"
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
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Загрузка изображения */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                    <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center text-white text-xs mr-2">📷</span>
                      Изображение товара
                    </h4>
                    
                    <div className="border-2 border-dashed border-purple-200 rounded-lg p-4 text-center bg-white/60 backdrop-blur-sm hover:border-purple-300 transition-all duration-200 group">
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
                        <div className="text-3xl text-purple-400 group-hover:text-purple-500 transition-colors">📷</div>
                        <div className="text-xs font-medium text-gray-700">
                          {formData.image ? formData.image.name : 'Нажмите для загрузки изображения'}
                        </div>
                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          JPG, PNG, GIF до 10MB
                        </div>
                      </label>
                    </div>
                    
                    {editingItem?.image && !formData.image && (
                      <div className="mt-3 p-3 bg-white/80 rounded-lg border border-gray-200">
                        <div className="text-xs font-medium text-gray-700 mb-1">Текущее изображение:</div>
                        <img 
                          src={editingItem.image} 
                          alt={editingItem.name}
                          className="w-16 h-16 object-cover rounded-lg shadow-sm"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Порядок отображения */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                    <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center text-white text-xs mr-2">🔢</span>
                      Порядок отображения
                    </h4>
                    
                    <div className="relative">
                      <input 
                        type="number" 
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 bg-white/80 backdrop-blur-sm"
                        placeholder="0"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        <span className="text-xs">#</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 bg-green-100 px-2 py-1 rounded-full inline-block">
                      Чем меньше число, тем выше в списке
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Настройки */}
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-100">
                <h4 className="text-base font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center text-white text-xs mr-2">⚙️</span>
                  Настройки товара
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="flex items-center space-x-3 p-3 bg-white/80 rounded-lg border border-orange-200 hover:bg-white hover:shadow-md transition-all duration-200 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="is_hit"
                      checked={formData.is_hit}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-orange-600 border-orange-300 rounded focus:ring-orange-500 focus:ring-1"
                    />
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🔥</span>
                      <span className="text-xs font-semibold text-gray-700 group-hover:text-orange-600 transition-colors">Хит продаж</span>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 bg-white/80 rounded-lg border border-orange-200 hover:bg-white hover:shadow-md transition-all duration-200 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="is_new"
                      checked={formData.is_new}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-orange-600 border-orange-300 rounded focus:ring-orange-500 focus:ring-1"
                    />
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🆕</span>
                      <span className="text-xs font-semibold text-gray-700 group-hover:text-orange-600 transition-colors">Новинка</span>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 bg-white/80 rounded-lg border border-orange-200 hover:bg-white hover:shadow-md transition-all duration-200 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-orange-600 border-orange-300 rounded focus:ring-orange-500 focus:ring-1"
                    />
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">✅</span>
                      <span className="text-xs font-semibold text-gray-700 group-hover:text-orange-600 transition-colors">Активен</span>
                    </div>
                  </label>
                </div>
              </div>
              
              {/* Кнопки */}
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold text-gray-700 group"
                >
                  <span className="group-hover:scale-105 transition-transform inline-block">❌</span>
                  <span className="ml-2">Отмена</span>
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl group"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Сохранение...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span className="group-hover:scale-110 transition-transform">{editingItem ? '💾' : '➕'}</span>
                      <span>{editingItem ? 'Сохранить изменения' : 'Добавить товар'}</span>
                    </div>
                  )}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenuPage;


