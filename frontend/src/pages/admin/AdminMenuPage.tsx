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
  const [showSizeModal, setShowSizeModal] = React.useState(false);
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
          
          // Автоматически добавляем новый размер к товару
          const newSize = response.data as any;
          if (newSize && newSize.id) {
            setFormData(prev => ({
              ...prev,
              size_options: [...prev.size_options, newSize.id]
            }));
          }
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
    <div className="min-h-screen bg-gray-50">
      {/* Фиксированный заголовок */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Управление меню</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Создание и редактирование товаров</p>
            </div>
            
            {/* Навигация */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button 
                onClick={() => setActiveTab('categories')}
                className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'categories' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Категории
              </button>
              <button 
                onClick={() => setActiveTab('items')}
                className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'items' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Товары
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Контент с отступом сверху */}
      <div className="pt-24 px-4 sm:px-6 pb-6">

      {/* Категории */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Категории ({categories.length})</h3>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium">
                Добавить категорию
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {loading && <div className="text-center py-8 text-gray-500">Загрузка...</div>}
            {error && <div className="text-red-600 bg-red-50 p-4 rounded-md mb-4">{error}</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((c) => (
                <div key={c.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <h4 className="font-medium text-gray-900 mb-2">{c.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{c.description}</p>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                      Редактировать
                    </button>
                    <button className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Товары */}
      {activeTab === 'items' && (
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Заголовок и фильтры */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Товары ({paginationInfo.count})</h3>
              <button
                onClick={openAddForm}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Добавить товар
              </button>
            </div>
            
            {/* Фильтры */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Поиск по названию или описанию..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div className="sm:w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
          
          {/* Состояния загрузки и ошибок */}
          {loading && (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Загрузка товаров...</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mx-6 my-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}
          
          {/* Таблица товаров */}
          {!loading && menuItems.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Товар</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Цена</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Категория</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Статус</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {menuItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-4">
                        <div className="flex items-center">
                          {item.image && (
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded-md mr-2 sm:mr-3"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                            <div className="text-xs sm:text-sm text-gray-500 truncate">{item.description}</div>
                            <div className="sm:hidden text-xs text-gray-600 mt-1">
                              {item.price} сум • {categories.find(c => c.id === item.category)?.name || 'Неизвестно'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        <div className="text-sm font-medium text-gray-900">{item.price} сум</div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        <div className="text-sm text-gray-900">
                          {categories.find(c => c.id === item.category)?.name || 'Неизвестно'}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        <div className="flex space-x-1">
                          {item.is_hit && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                              Хит
                            </span>
                          )}
                          {item.is_new && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              Новинка
                            </span>
                          )}
                          {!item.is_active && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              Неактивен
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
                          <button 
                            onClick={() => openEditForm(item)}
                            className="text-blue-600 hover:text-blue-900 text-xs sm:text-sm"
                          >
                            Изменить
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-600 hover:text-red-900 text-xs sm:text-sm"
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Пустое состояние */}
          {!loading && menuItems.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Товары не найдены</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedCategory 
                  ? 'Попробуйте изменить фильтры поиска' 
                  : 'Добавьте первый товар в меню'
                }
              </p>
              {!searchTerm && !selectedCategory && (
                <button
                  onClick={openAddForm}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Добавить товар
                </button>
              )}
            </div>
          )}
          
          {/* Пагинация */}
          {!loading && paginationInfo.total_pages > 1 && (
            <div className="px-3 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs sm:text-sm text-gray-700">
                  Страница {currentPage} из {paginationInfo.total_pages} ({paginationInfo.count} товаров)
                </div>
                
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={!paginationInfo.has_previous}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Назад
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(3, paginationInfo.total_pages) }, (_, i) => {
                      let pageNum: number;
                      if (paginationInfo.total_pages <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage <= 2) {
                        pageNum = i + 1;
                      } else if (currentPage >= paginationInfo.total_pages - 1) {
                        pageNum = paginationInfo.total_pages - 2 + i;
                      } else {
                        pageNum = currentPage - 1 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
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
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Вперед
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Форма товара */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            {/* Заголовок */}
            <div className="px-6 py-4 border-b border-gray-200">
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
            <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-120px)]">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Основная информация */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Название товара <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Описание товара"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Цена (сум) <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="number" 
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Категория <span className="text-red-500">*</span>
                      </label>
                      <select 
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      + Создать размер
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {sizeOptions.map(size => (
                      <label key={size.id} className="flex items-center space-x-2 p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.size_options.includes(size.id)}
                          onChange={(e) => handleSizeChange(size.id, e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm">
                          <span className="font-medium">{size.name}</span> 
                          <span className="text-gray-500"> ({size.price_modifier > 0 ? '+' : ''}{size.price_modifier} сум)</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {sizeOptions.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Нет доступных размеров. Создайте новый размер.
                    </p>
                  )}
                </div>
                
                {/* Добавки */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Добавки к товару
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {addOns.map(addOn => (
                      <label key={addOn.id} className="flex items-center space-x-2 p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.add_on_options.includes(addOn.id)}
                          onChange={(e) => handleAddOnChange(addOn.id, e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm">
                          <span className="font-medium">{addOn.name}</span> 
                          <span className="text-gray-500"> ({addOn.price} сум)</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {addOns.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Нет доступных добавок.
                    </p>
                  )}
                </div>
                
                {/* Настройки */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Настройки товара
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="is_hit"
                        checked={formData.is_hit}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-sm">Хит продаж</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="is_new"
                        checked={formData.is_new}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-sm">Новинка</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-sm">Активен</span>
                    </label>
                  </div>
                </div>
                
                {/* Кнопки */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                  <button 
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm sm:text-base"
                  >
                    Отмена
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                  >
                    {loading ? 'Сохранение...' : (editingItem ? 'Сохранить изменения' : 'Добавить товар')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}


      {/* Модальное окно для добавления размера */}
      {showSizeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Создать новый размер</h3>
                <button
                  onClick={() => setShowSizeModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleCreateSize} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название размера <span className="text-red-500">*</span>
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
                  Модификатор цены (сум) <span className="text-red-500">*</span>
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
              
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowSizeModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm sm:text-base"
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                >
                  {loading ? 'Создание...' : 'Создать размер'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminMenuPage;


