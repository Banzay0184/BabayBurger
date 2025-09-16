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
  
  // Серверная пагинация и фильтрация
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage] = React.useState(20);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('');
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [paginationInfo, setPaginationInfo] = React.useState({
    count: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false
  });
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: null as File | null,
    is_hit: false,
    is_new: false,
    is_active: true,
    priority: 0,
    size_options: [] as number[],
    add_on_options: [] as number[]
  });

  // Состояния для добавок и размеров
  const [addOns, setAddOns] = React.useState<any[]>([]);
  const [sizeOptions, setSizeOptions] = React.useState<any[]>([]);
  const [showAddOnModal, setShowAddOnModal] = React.useState(false);
  const [showSizeModal, setShowSizeModal] = React.useState(false);
  const [addOnFormData, setAddOnFormData] = React.useState({
    name: '',
    price: '',
    available_for_categories: [] as number[],
    is_active: true
  });
  const [sizeFormData, setSizeFormData] = React.useState({
    name: '',
    price_modifier: '',
    description: '',
    is_active: true
  });

  const loadData = async (page: number = currentPage) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Загружаем данные меню...');
      
      // Загружаем категории только один раз
      if (categories.length === 0) {
        const categoriesRes = await menuApi.getCategories();
        if (categoriesRes.success) {
          setCategories(categoriesRes.data || []);
          console.log('✅ Категории загружены:', categoriesRes.data);
        } else {
          setError(categoriesRes.error?.message || 'Ошибка загрузки категорий');
        }
      }
      
      // Загружаем добавки только один раз
      if (addOns.length === 0) {
        const addOnsRes = await adminApi.getAddOns();
        if (addOnsRes.success) {
          setAddOns(addOnsRes.data as any[] || []);
          console.log('✅ Добавки загружены:', addOnsRes.data);
        }
      }
      
      // Загружаем размеры только один раз
      if (sizeOptions.length === 0) {
        const sizesRes = await adminApi.getSizeOptions();
        if (sizesRes.success) {
          setSizeOptions(sizesRes.data as any[] || []);
          console.log('✅ Размеры загружены:', sizesRes.data);
        }
      }
      
      // Загружаем товары с пагинацией и фильтрацией
      const itemsRes = await adminApi.getMenuItems({
        page,
        page_size: itemsPerPage,
        category: selectedCategory || undefined,
        search: searchTerm || undefined
      });
      
      console.log('📊 Ответ товаров:', itemsRes);
      
      if (itemsRes.success) {
        const data = itemsRes.data as any;
        setMenuItems(data.results || []);
        setPaginationInfo({
          count: data.count || 0,
          total_pages: data.total_pages || 0,
          has_next: data.has_next || false,
          has_previous: data.has_previous || false
        });
        console.log('✅ Товары загружены:', data.results);
        console.log('📊 Пагинация:', data);
      } else {
        setError(itemsRes.error || 'Ошибка загрузки товаров');
      }
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

  // Перезагрузка данных при изменении фильтров или страницы
  React.useEffect(() => {
    if (activeTab === 'items') {
      loadData(currentPage);
    }
  }, [currentPage, selectedCategory, searchTerm, activeTab]);

  const handleDeleteItem = async (id: number) => {
    if (!confirm('Удалить товар?')) return;
    
    const res = await adminApi.deleteMenuItem(id);
    if (res.success) {
      loadData(currentPage); // Перезагружаем текущую страницу
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
      priority: 0,
      size_options: [],
      add_on_options: []
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
      priority: item.priority || 0,
      size_options: item.size_options?.map((s: any) => s.id) || [],
      add_on_options: item.add_on_options?.map((a: any) => a.id) || []
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

  // Функции для работы с добавками
  const handleAddOnChange = (addOnId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      add_on_options: checked 
        ? [...prev.add_on_options, addOnId]
        : prev.add_on_options.filter(id => id !== addOnId)
    }));
  };

  const handleCreateAddOn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await adminApi.createAddOn({
        name: addOnFormData.name,
        price: parseFloat(addOnFormData.price),
        available_for_categories: addOnFormData.available_for_categories,
        is_active: addOnFormData.is_active
      });

      if (response.success) {
        setShowAddOnModal(false);
        setAddOnFormData({ name: '', price: '', available_for_categories: [], is_active: true });
        // Перезагружаем добавки
        const addOnsRes = await adminApi.getAddOns();
        if (addOnsRes.success) {
          setAddOns(addOnsRes.data as any[] || []);
        }
      } else {
        setError(response.error || 'Ошибка создания добавки');
      }
    } catch (err) {
      setError('Ошибка создания добавки');
    } finally {
      setLoading(false);
    }
  };

  // Функции для работы с размерами
  const handleSizeChange = (sizeId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      size_options: checked 
        ? [...prev.size_options, sizeId]
        : prev.size_options.filter(id => id !== sizeId)
    }));
  };

  const handleCreateSize = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await adminApi.createSizeOption({
        name: sizeFormData.name,
        price_modifier: parseFloat(sizeFormData.price_modifier),
        description: sizeFormData.description,
        is_active: sizeFormData.is_active
      });

      if (response.success) {
        setShowSizeModal(false);
        setSizeFormData({ name: '', price_modifier: '', description: '', is_active: true });
        // Перезагружаем размеры
        const sizesRes = await adminApi.getSizeOptions();
        if (sizesRes.success) {
          setSizeOptions(sizesRes.data as any[] || []);
        }
      } else {
        setError(response.error || 'Ошибка создания размера');
      }
    } catch (err) {
      setError('Ошибка создания размера');
    } finally {
      setLoading(false);
    }
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
      
      // Добавляем размеры
      formData.size_options.forEach(sizeId => {
        submitData.append('size_options', sizeId.toString());
      });
      
      // Добавляем добавки
      formData.add_on_options.forEach(addOnId => {
        submitData.append('add_on_options', addOnId.toString());
      });
      
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
        loadData(currentPage); // Перезагружаем текущую страницу
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
    <div className="space-y-4">
      {/* Заголовок и табы */}
      <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-4 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <span className="text-lg">🍽️</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">Управление меню</h2>
              <p className="text-orange-100 text-sm">Создавайте и редактируйте блюда для вашего ресторана</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-white/20 backdrop-blur-sm rounded-lg p-1">
              <button 
                onClick={() => setActiveTab('categories')}
                className={`px-3 py-2 rounded-md font-semibold transition-all duration-200 text-sm ${
                  activeTab === 'categories' 
                    ? 'bg-white text-orange-600 shadow-md' 
                    : 'text-white hover:bg-white/20'
                }`}
              >
                📂 Категории
              </button>
              <button 
                onClick={() => setActiveTab('items')}
                className={`px-3 py-2 rounded-md font-semibold transition-all duration-200 text-sm ${
                  activeTab === 'items' 
                    ? 'bg-white text-orange-600 shadow-md' 
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
        <div className="space-y-4">
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
        <div className="space-y-4">
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
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                  <span className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-md flex items-center justify-center text-white text-xs mr-2">🍔</span>
                  Список товаров ({paginationInfo.count} всего)
                </h3>
                <button
                  onClick={openAddForm}
                  className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-md hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-semibold shadow-sm hover:shadow-md flex items-center space-x-1 group text-sm"
                >
                  <span className="group-hover:scale-110 transition-transform">➕</span>
                  <span>Добавить товар</span>
                </button>
              </div>
              
              {/* Фильтры */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">🔍 Поиск товаров</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1); // Сброс на первую страницу при поиске
                    }}
                    placeholder="Поиск по названию или описанию..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 bg-white/80 backdrop-blur-sm text-sm"
                  />
                </div>
                <div className="sm:w-48">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">📂 Категория</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setCurrentPage(1); // Сброс на первую страницу при смене категории
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 bg-white/80 backdrop-blur-sm text-sm"
                  >
                    <option value="">Все категории</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {menuItems.length > 0 ? (
              <div className="overflow-x-auto max-h-[calc(100vh-200px)] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Товар</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Цена</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Категория</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Статус</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {menuItems.map((item, index) => (
                    <tr key={item.id} className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {item.image && (
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="w-8 h-8 object-cover rounded-md shadow-sm"
                            />
                          )}
                          <div>
                            <div className="text-xs font-bold text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-500 max-w-xs truncate">{item.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                          {item.price} ₽
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-xs font-semibold text-gray-700 bg-blue-50 px-2 py-1 rounded-md">
                          {categories.find(c => c.id === item.category)?.name || 'Неизвестно'}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex space-x-1">
                          {item.is_hit && (
                            <span className="inline-flex px-1 py-0.5 text-xs font-bold rounded-full bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200">
                              🔥
                            </span>
                          )}
                          {item.is_new && (
                            <span className="inline-flex px-1 py-0.5 text-xs font-bold rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border border-blue-200">
                              🆕
                            </span>
                          )}
                          {!item.is_hit && !item.is_new && (
                            <span className="inline-flex px-1 py-0.5 text-xs font-bold rounded-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300">
                              📦
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">
                        <div className="flex space-x-1">
                          <button 
                            onClick={() => openEditForm(item)}
                            className="px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-md hover:from-orange-600 hover:to-red-600 transition-all duration-200 font-semibold shadow-sm hover:shadow-md flex items-center space-x-1 group text-xs"
                          >
                            <span className="group-hover:scale-110 transition-transform">✏️</span>
                            <span>Изменить</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="px-2 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-md hover:from-red-600 hover:to-pink-600 transition-all duration-200 font-semibold shadow-sm hover:shadow-md flex items-center space-x-1 group text-xs"
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
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Товары не найдены</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedCategory 
                    ? 'Попробуйте изменить фильтры поиска' 
                    : 'Добавьте первый товар в меню'
                  }
                </p>
                {!searchTerm && !selectedCategory && (
                  <button
                    onClick={openAddForm}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center space-x-2 group mx-auto"
                  >
                    <span className="group-hover:scale-110 transition-transform">➕</span>
                    <span>Добавить товар</span>
                  </button>
                )}
              </div>
            )}
            
            {/* Пагинация */}
            {paginationInfo.total_pages > 1 && (
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-700">
                    Страница {currentPage} из {paginationInfo.total_pages} ({paginationInfo.count} товаров)
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={!paginationInfo.has_previous}
                      className="px-2 py-1 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Назад
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, paginationInfo.total_pages) }, (_, i) => {
                        let pageNum: number;
                        if (paginationInfo.total_pages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= paginationInfo.total_pages - 2) {
                          pageNum = paginationInfo.total_pages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-2 py-1 text-xs rounded-md transition-colors ${
                              currentPage === pageNum
                                ? 'bg-orange-500 text-white'
                                : 'bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, paginationInfo.total_pages))}
                      disabled={!paginationInfo.has_next}
                      className="px-2 py-1 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Вперед →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Форма товара */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Заголовок */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingItem ? 'Редактировать товар' : 'Добавить товар'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
            </div>
            
            {/* Контент формы */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Основная информация */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Название товара *
                      </label>
                      <input 
                        type="text" 
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Введите название товара"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Описание
                      </label>
                      <textarea 
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                        placeholder="Описание товара"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Цена (₽) *
                      </label>
                      <input 
                        type="number" 
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Категория *
                      </label>
                      <select 
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                    {/* Изображение */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Изображение товара
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
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
                          <span className="text-2xl">📷</span>
                          <span className="text-sm text-gray-600">
                            {formData.image ? formData.image.name : 'Нажмите для загрузки изображения'}
                          </span>
                        </label>
                      </div>
                      
                      {editingItem?.image && !formData.image && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-md">
                          <div className="text-xs text-gray-600 mb-1">Текущее изображение:</div>
                          <img 
                            src={editingItem.image} 
                            alt={editingItem.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Порядок отображения */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Порядок отображения
                      </label>
                      <input 
                        type="number" 
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">Чем меньше число, тем выше в списке</p>
                    </div>
                  </div>
                </div>
                
                {/* Размеры */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Размеры товара
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSizeModal(true)}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      + Добавить размер
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {sizeOptions.map(size => (
                      <label key={size.id} className="flex items-center space-x-2 p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.size_options.includes(size.id)}
                          onChange={(e) => handleSizeChange(size.id, e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm">
                          {size.name} ({size.price_modifier > 0 ? '+' : ''}{size.price_modifier} ₽)
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Добавки */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Добавки к товару
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddOnModal(true)}
                      className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                      + Добавить добавку
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {addOns.map(addOn => (
                      <label key={addOn.id} className="flex items-center space-x-2 p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.add_on_options.includes(addOn.id)}
                          onChange={(e) => handleAddOnChange(addOn.id, e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm">
                          {addOn.name} ({addOn.price} ₽)
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Настройки */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Настройки товара
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="is_hit"
                        checked={formData.is_hit}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-sm">🔥 Хит продаж</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="is_new"
                        checked={formData.is_new}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-sm">🆕 Новинка</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-sm">✅ Активен</span>
                    </label>
                  </div>
                </div>
                
                {/* Кнопки */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button 
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Отмена
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Сохранение...' : (editingItem ? 'Сохранить изменения' : 'Добавить товар')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для добавления добавки */}
      {showAddOnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Добавить добавку</h3>
                <button
                  onClick={() => setShowAddOnModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleCreateAddOn} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название добавки *
                </label>
                <input 
                  type="text" 
                  value={addOnFormData.name}
                  onChange={(e) => setAddOnFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Например: Сыр"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Цена (₽) *
                </label>
                <input 
                  type="number" 
                  value={addOnFormData.price}
                  onChange={(e) => setAddOnFormData(prev => ({ ...prev, price: e.target.value }))}
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Доступно для категорий
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {categories.map(category => (
                    <label key={category.id} className="flex items-center space-x-2 mb-1">
                      <input
                        type="checkbox"
                        checked={addOnFormData.available_for_categories.includes(category.id)}
                        onChange={(e) => {
                          const categoryId = category.id;
                          setAddOnFormData(prev => ({
                            ...prev,
                            available_for_categories: e.target.checked
                              ? [...prev.available_for_categories, categoryId]
                              : prev.available_for_categories.filter(id => id !== categoryId)
                          }));
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddOnModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно для добавления размера */}
      {showSizeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Добавить размер</h3>
                <button
                  onClick={() => setShowSizeModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleCreateSize} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название размера *
                </label>
                <input 
                  type="text" 
                  value={sizeFormData.name}
                  onChange={(e) => setSizeFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Например: Большая"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Модификатор цены (₽) *
                </label>
                <input 
                  type="number" 
                  value={sizeFormData.price_modifier}
                  onChange={(e) => setSizeFormData(prev => ({ ...prev, price_modifier: e.target.value }))}
                  step="0.01"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Положительное число увеличивает цену, отрицательное - уменьшает</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание размера
                </label>
                <textarea 
                  value={sizeFormData.description}
                  onChange={(e) => setSizeFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Например: 30 см, 8 кусочков"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowSizeModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Создание...' : 'Создать'}
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


