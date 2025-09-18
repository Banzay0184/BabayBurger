import React from 'react';
import { menuApi } from '../../api/menu';
import { adminApi } from '../../api/adminApi';
import Modal from '../../components/admin/Modal';

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
  const [itemsPerPage] = React.useState(10);
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
    size_options: [] as any[],
    add_on_options: [] as number[],
    use_time_restriction: false,
    available_from_time: '',
    available_to_time: ''
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
  
  // Состояния для модальных окон подтверждения
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [showEditConfirm, setShowEditConfirm] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<any>(null);
  const [itemToEdit, setItemToEdit] = React.useState<any>(null);

  const loadData = async (page: number = currentPage) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Загружаем данные меню...');
      
      // Проверяем токен перед загрузкой данных
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setError('Токен аутентификации не найден. Пожалуйста, войдите в систему заново.');
        return;
      }
      
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
      if (!Array.isArray(addOns) || addOns.length === 0) {
        const addOnsRes = await adminApi.getAddOns();
        if (addOnsRes.success) {
          // API может возвращать объект с results или массив напрямую
          const addOnsData = Array.isArray(addOnsRes.data) 
            ? addOnsRes.data 
            : ((addOnsRes.data as any)?.results || []);
          setAddOns(addOnsData);
          console.log('✅ Добавки загружены:', addOnsData);
        }
      }
      
      // Загружаем размеры только один раз
      if (!Array.isArray(sizeOptions) || sizeOptions.length === 0) {
        const sizesRes = await adminApi.getSizeOptions();
        if (sizesRes.success) {
          // API может возвращать объект с results или массив напрямую
          const sizesData = Array.isArray(sizesRes.data) 
            ? sizesRes.data 
            : ((sizesRes.data as any)?.results || []);
          setSizeOptions(sizesData);
          console.log('✅ Размеры загружены:', sizesData);
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

  const handleDeleteItem = async (item: any) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      setLoading(true);
      const res = await adminApi.deleteMenuItem(itemToDelete.id);
      if (res.success) {
        setShowDeleteConfirm(false);
        setItemToDelete(null);
        loadData(currentPage); // Перезагружаем текущую страницу
      } else {
        alert('Ошибка удаления: ' + (res.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      alert('Ошибка удаления: ' + error);
    } finally {
      setLoading(false);
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
      add_on_options: [],
      use_time_restriction: false,
      available_from_time: '',
      available_to_time: ''
    });
    setSizeFormData({ name: '', price_modifier: '', description: '', is_active: true });
    setEditingItem(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (item: any) => {
    console.log('🔍 Открываем форму редактирования для товара:', item);
    console.log('📏 Размеры товара:', item.size_options);
    console.log('➕ Добавки товара:', item.add_on_options);
    
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
      size_options: item.size_options || [],
      add_on_options: item.add_on_options?.map((a: any) => a.id) || [],
      use_time_restriction: item.use_time_restriction || false,
      available_from_time: item.available_from_time || '',
      available_to_time: item.available_to_time || ''
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

  const handleCreateSize = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const response = await adminApi.createSizeOption({
        name: sizeFormData.name,
        price_modifier: parseFloat(sizeFormData.price_modifier),
        description: sizeFormData.description,
        menu_item: null, // Создаем размер без привязки
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
    
    // Если редактируем товар, показываем подтверждение
    if (editingItem) {
      setItemToEdit(editingItem);
      setShowEditConfirm(true);
      return;
    }
    
    // Если создаем новый товар, сразу отправляем
    await submitForm();
  };

  const submitForm = async () => {
    console.log('📤 Отправляем форму с данными:', formData);
    console.log('📏 Размеры в форме:', formData.size_options);
    console.log('➕ Добавки в форме:', formData.add_on_options);
    
    try {
      setLoading(true);
      
      // Валидация обязательных полей
      if (!formData.name.trim()) {
        setError('Название товара обязательно');
        setLoading(false);
        return;
      }
      if (!formData.price || parseFloat(formData.price) <= 0) {
        setError('Цена должна быть больше 0');
        setLoading(false);
        return;
      }
      if (!formData.category) {
        setError('Выберите категорию');
        setLoading(false);
        return;
      }
      
      // Проверяем токен перед отправкой
      const token = localStorage.getItem('admin_token');
      console.log('🔐 Токен в localStorage:', token ? `${token.substring(0, 10)}...` : 'No token');
      console.log('🔐 Полный токен:', token);
      console.log('🔐 Длина токена:', token ? token.length : 0);
      
      if (!token) {
        setError('Токен аутентификации не найден. Пожалуйста, войдите в систему заново.');
        setLoading(false);
        return;
      }
      
      let response;
      
      // Если есть изображение, используем FormData
      if (formData.image) {
        const formDataToSend = new FormData();
        formDataToSend.append('name', formData.name.trim());
        formDataToSend.append('description', formData.description.trim());
        formDataToSend.append('price', formData.price);
        formDataToSend.append('category', formData.category);
        formDataToSend.append('is_hit', formData.is_hit.toString());
        formDataToSend.append('is_new', formData.is_new.toString());
        formDataToSend.append('is_active', formData.is_active.toString());
        formDataToSend.append('priority', formData.priority.toString());
        formDataToSend.append('use_time_restriction', formData.use_time_restriction.toString());
        if (formData.use_time_restriction) {
          formDataToSend.append('available_from_time', formData.available_from_time);
          formDataToSend.append('available_to_time', formData.available_to_time);
        }
        formDataToSend.append('image', formData.image);
        
        // Добавляем размеры как строку, разделенную запятыми
        console.log('📏 Размеры для отправки:', formData.size_options);
        if (formData.size_options.length > 0) {
          const sizeIds = formData.size_options.map((size: any) => typeof size === 'object' ? size.id : size);
          formDataToSend.append('size_options_write', sizeIds.join(','));
          console.log('📏 Добавляем размеры как строку:', sizeIds.join(','));
        }
        
        // Добавляем добавки как строку, разделенную запятыми
        console.log('➕ Добавки для отправки:', formData.add_on_options);
        if (formData.add_on_options.length > 0) {
          formDataToSend.append('add_on_options_write', formData.add_on_options.join(','));
          console.log('➕ Добавляем добавки как строку:', formData.add_on_options.join(','));
        }

        console.log('📤 Отправляем FormData с изображением');
        
        if (editingItem) {
          response = await adminApi.updateMenuItem(editingItem.id, formDataToSend);
        } else {
          response = await adminApi.createMenuItem(formDataToSend);
        }
      } else {
        // Если нет изображения, используем JSON
        const submitData: any = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: parseFloat(formData.price),
          category: parseInt(formData.category),
          is_hit: formData.is_hit,
          is_new: formData.is_new,
          is_active: formData.is_active,
          priority: parseInt(formData.priority.toString()) || 0,
          size_options_write: formData.size_options.map((size: any) => typeof size === 'object' ? size.id : size),
          add_on_options_write: formData.add_on_options,
          use_time_restriction: formData.use_time_restriction,
          available_from_time: formData.use_time_restriction ? formData.available_from_time : null,
          available_to_time: formData.use_time_restriction ? formData.available_to_time : null
        };

        console.log('📤 Отправляем JSON данные:', submitData);

        if (editingItem) {
          response = await adminApi.updateMenuItem(editingItem.id, submitData);
        } else {
          response = await adminApi.createMenuItem(submitData);
        }
      }

      console.log('📥 Ответ сервера:', response);

      if (response.success) {
        const createdItem = response.data as any;
        
        // Размеры уже обработаны сервером при использовании FormData
        // или переданы в JSON при использовании JSON
        console.log('✅ Товар создан успешно:', createdItem);
        
        // Закрываем форму товара
        setShowForm(false);
        resetForm();
        
        // Перезагружаем данные
        loadData(currentPage);
        
        // Показываем успешное сообщение
        alert(`Товар "${createdItem.name}" успешно создан!`);
      } else {
        setError(response.error || 'Ошибка сохранения');
      }
    } catch (err) {
      console.error('💥 Ошибка сохранения:', err);
      setError('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 lg:space-y-4">

      {/* Навигация */}
      <div className="flex justify-center">
        <div className="flex bg-gray-100 rounded-md p-0.5">
          <button 
            onClick={() => setActiveTab('categories')}
            className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-md text-xs lg:text-sm font-medium transition-colors ${
              activeTab === 'categories' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Категории
          </button>
          <button 
            onClick={() => setActiveTab('items')}
            className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-md text-xs lg:text-sm font-medium transition-colors ${
              activeTab === 'items' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Товары
          </button>
        </div>
      </div>

      {/* Категории */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-lg lg:rounded-xl shadow-md border border-gray-200/50 overflow-hidden">
          <div className="px-3 lg:px-4 py-3 lg:py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base lg:text-lg font-bold text-gray-900 flex items-center">
                <span className="w-5 h-5 lg:w-6 lg:h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center text-white text-xs mr-2">📂</span>
                Категории ({categories.length})
              </h3>
              <button className="px-3 lg:px-4 py-1.5 lg:py-2 bg-blue-600 text-white rounded-md lg:rounded-lg hover:bg-blue-700 transition-colors text-xs lg:text-sm font-medium">
                Добавить категорию
              </button>
            </div>
          </div>
          
          <div className="p-3 lg:p-4">
            {loading && <div className="text-center py-6 text-black text-sm">Загрузка...</div>}
            {error && <div className="text-red-600 bg-red-50 p-3 rounded-md mb-3 text-sm">{error}</div>}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              {categories.map((c) => (
                <div key={c.id} className="border border-gray-200 rounded-md lg:rounded-lg p-3 lg:p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
                  <h4 className="font-semibold text-gray-900 mb-1.5 text-sm">{c.name}</h4>
                  <p className="text-xs text-black mb-3">{c.description}</p>
                  <div className="flex flex-col sm:flex-row gap-1.5">
                    <button className="px-2 lg:px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
                      Редактировать
                    </button>
                    <button className="px-2 lg:px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors">
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
        <div className="bg-white rounded-lg lg:rounded-xl shadow-md border border-gray-200/50 overflow-hidden">
          {/* Заголовок и фильтры */}
          <div className="px-3 lg:px-4 py-3 lg:py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 lg:mb-4">
              <h3 className="text-base lg:text-lg font-bold text-gray-900 flex items-center">
                <span className="w-5 h-5 lg:w-6 lg:h-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-md flex items-center justify-center text-white text-xs mr-2">🍽️</span>
                Товары ({paginationInfo.count})
              </h3>
              <button
                onClick={openAddForm}
                className="px-3 lg:px-4 py-1.5 lg:py-2 bg-green-600 text-white rounded-md lg:rounded-lg hover:bg-green-700 transition-colors text-xs lg:text-sm font-medium"
              >
                Добавить товар
              </button>
            </div>
            
            {/* Фильтры */}
            <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Поиск по названию или описанию..."
                  className="w-full text-black px-3 lg:px-4 py-2 lg:py-2.5 border-2 border-gray-200 rounded-md lg:rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm text-xs lg:text-sm"
                />
              </div>
              <div className="sm:w-40 lg:w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-black px-3 lg:px-4 py-2 lg:py-2.5 border-2 border-gray-200 rounded-md lg:rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm text-xs lg:text-sm"
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
            <div className="text-center py-8">
              <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-black text-sm">Загрузка товаров...</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mx-3 my-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          
          {/* Таблица товаров */}
          {!loading && menuItems.length > 0 && (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Товар</th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Цена</th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Категория</th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Размеры</th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Время</th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Статус</th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {menuItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-3 py-3">
                        <div className="flex items-center">
                          {item.image && (
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="w-6 h-6 sm:w-8 sm:h-8 object-cover rounded-md mr-2"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">{item.name}</div>
                            <div className="text-xs text-black truncate">{item.description}</div>
                            <div className="sm:hidden text-xs text-black mt-0.5">
                              {item.price} сум • {categories.find(c => c.id === item.category)?.name || 'Неизвестно'}
                              {item.size_options && item.size_options.length > 0 && (
                                <div className="mt-1">
                                  <div className="text-gray-600 text-xs">Размеры:</div>
                                  <div className="space-y-1">
                                    {item.size_options.slice(0, 2).map((size: any, index: number) => (
                                      <div key={index} className="text-green-600 font-medium text-xs">
                                        {size.name} {size.price_modifier > 0 ? `+${size.price_modifier}` : size.price_modifier} сум
                                      </div>
                                    ))}
                                    {item.size_options.length > 2 && (
                                      <div className="text-blue-600 text-xs">+{item.size_options.length - 2} еще</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-3 py-3 whitespace-nowrap hidden sm:table-cell">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">{item.price} сум</div>
                      </td>
                      <td className="px-2 sm:px-3 py-3 whitespace-nowrap hidden md:table-cell">
                        <div className="text-xs sm:text-sm text-gray-900">
                          {categories.find(c => c.id === item.category)?.name || 'Неизвестно'}
                        </div>
                      </td>
                      <td className="px-2 sm:px-3 py-3 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-xs text-gray-900">
                          {item.size_options && item.size_options.length > 0 ? (
                            <div className="space-y-1">
                              {item.size_options.slice(0, 2).map((size: any, index: number) => (
                                <div key={index} className="text-xs">
                                  <div className="font-medium text-gray-900">{size.name}</div>
                                  <div className="text-green-600 font-bold">
                                    {size.price_modifier > 0 ? `+${size.price_modifier}` : size.price_modifier} сум
                                  </div>
                                </div>
                              ))}
                              {item.size_options.length > 2 && (
                                <div className="text-blue-600 text-xs font-medium">
                                  +{item.size_options.length - 2} еще...
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">Нет размеров</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-3 py-3 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-xs text-gray-900">
                          {item.use_time_restriction ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <span className="text-orange-600">⏰</span>
                                <span className="font-medium">
                                  {item.available_from_time || '00:00'} - {item.available_to_time || '23:59'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.is_available_now ? 'Доступен' : 'Недоступен'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500">Всегда доступен</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-3 py-3 whitespace-nowrap hidden xl:table-cell">
                        <div className="flex space-x-1">
                          {item.is_hit && (
                            <span className="inline-flex px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                              Хит
                            </span>
                          )}
                          {item.is_new && (
                            <span className="inline-flex px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              Новинка
                            </span>
                          )}
                          {item.is_active && (
                            <span className="inline-flex px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Активен
                            </span>
                          )}
                          {!item.is_active && (
                            <span className="inline-flex px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              Неактивен
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-3 py-3 whitespace-nowrap text-xs font-medium">
                        <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
                          <button 
                            onClick={() => openEditForm(item)}
                            className="text-blue-600 hover:text-blue-900 text-xs"
                          >
                            Изменить
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item)}
                            className="text-red-600 hover:text-red-900 text-xs"
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
            <div className="text-center py-8">
              <h3 className="text-base font-medium text-gray-900 mb-2">Товары не найдены</h3>
              <p className="text-black mb-3 text-sm">
                {searchTerm || selectedCategory 
                  ? 'Попробуйте изменить фильтры поиска' 
                  : 'Добавьте первый товар в меню'
                }
              </p>
              {!searchTerm && !selectedCategory && (
                <button
                  onClick={openAddForm}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  Добавить товар
                </button>
              )}
            </div>
          )}
          
          {/* Пагинация */}
          {!loading && paginationInfo.total_pages > 1 && (
            <div className="px-3 lg:px-4 py-3 lg:py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs lg:text-sm text-black font-medium">
                  Страница {currentPage} из {paginationInfo.total_pages} ({paginationInfo.count} товаров)
                </div>
                
                <div className="flex items-center space-x-1 lg:space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={!paginationInfo.has_previous}
                    className="px-2 lg:px-3 py-1.5 text-black lg:py-2 text-xs lg:text-sm bg-white border-2 border-gray-200 rounded-md lg:rounded-lg hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
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
                          className={`px-2 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm rounded-md lg:rounded-lg font-medium transition-all duration-200 ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-white border-2 text-black border-gray-200 hover:bg-gray-50 hover:border-gray-300'
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
                    className="px-2 lg:px-3 py-1.5 text-black lg:py-2 text-xs lg:text-sm bg-white border-2 border-gray-200 rounded-md lg:rounded-lg hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
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
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingItem ? 'Редактировать товар' : 'Добавить товар'}
        size="full"
      >
        <div className="p-3 sm:p-4">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                {/* Основная информация */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        Название товара <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full border text-black border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Введите название товара"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        Описание
                      </label>
                      <textarea 
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full text-black border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Описание товара"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        Цена (сум) <span className="text-red-500">*</span>
                      </label>
                      
                      {/* Отображение текущей цены при редактировании */}
                      {editingItem && (
                        <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-xs text-blue-700">
                            <span className="font-medium">Текущая цена:</span> {editingItem.price} сум
                          </p>
                        </div>
                      )}
                      
                      <input 
                        type="number" 
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className="w-full border text-black border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        Категория <span className="text-red-500">*</span>
                      </label>
                      <select 
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full border text-black border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  
                  <div className="space-y-3">
                    {/* Изображение */}
                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        Изображение товара
                      </label>
                      <div className="border-2 border-dashed text-black border-gray-300 rounded-md p-3 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="cursor-pointer flex flex-col items-center space-y-1"
                        >
                          <span className="text-lg">📷</span>
                          <span className="text-xs text-black">
                            {formData.image ? formData.image.name : 'Нажмите для загрузки изображения'}
                          </span>
                        </label>
                      </div>
                      
                      {editingItem?.image && !formData.image && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-md">
                          <div className="text-xs text-black mb-1">Текущее изображение:</div>
                          <img 
                            src={editingItem.image} 
                            alt={editingItem.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Порядок отображения */}
                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        Порядок отображения
                      </label>
                      <input 
                        type="number" 
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full border text-black border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                      <p className="text-xs text-black mt-1">Чем меньше число, тем выше в списке</p>
                    </div>
                  </div>
                </div>
                
                {/* Размеры */}
                <div>
                  <label className="block text-xs font-medium text-black mb-2">
                    Размеры товара
                  </label>
                  
                  {/* Форма создания размера */}
                  <div className="space-y-3 p-3 bg-gray-50 rounded-md border">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-black mb-1">
                          Название размера <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          value={sizeFormData.name}
                          onChange={(e) => setSizeFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full text-black border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Например: Большая"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-black mb-1">
                          Модификатор цены (сум) <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="number" 
                          value={sizeFormData.price_modifier}
                          onChange={(e) => setSizeFormData(prev => ({ ...prev, price_modifier: e.target.value }))}
                          step="0.01"
                          className="w-full text-black border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        Описание размера
                      </label>
                      <textarea 
                        value={sizeFormData.description}
                        onChange={(e) => setSizeFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full text-black border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Описание размера (необязательно)"
                        rows={2}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_active_size_inline"
                        checked={sizeFormData.is_active}
                        onChange={(e) => setSizeFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="rounded"
                      />
                      <label htmlFor="is_active_size_inline" className="text-xs font-medium text-black">
                        Активный размер
                      </label>
                    </div>
                    
                    <button
                      type="button"
                      onClick={async () => {
                        if (!sizeFormData.name.trim()) {
                          alert('Введите название размера');
                          return;
                        }
                        if (!sizeFormData.price_modifier) {
                          alert('Введите модификатор цены');
                          return;
                        }
                        
                        // Создаем размер в базе данных
                        try {
                          const response = await adminApi.createSizeOption({
                            name: sizeFormData.name,
                            price_modifier: parseFloat(sizeFormData.price_modifier),
                            description: sizeFormData.description,
                            menu_item: null, // Создаем размер без привязки
                            is_active: sizeFormData.is_active
                          });

                          if (response.success) {
                            const newSize = response.data as any;
                            console.log('📏 Размер создан в БД:', newSize);
                            
                            setFormData(prev => {
                              const newSizeOptions = [...prev.size_options, newSize];
                              console.log('📏 Добавляем размер к товару:', newSize);
                              console.log('📏 Новый список размеров:', newSizeOptions);
                              return {
                                ...prev,
                                size_options: newSizeOptions
                              };
                            });
                          } else {
                            alert('Ошибка создания размера: ' + (response.error || 'Неизвестная ошибка'));
                          }
                        } catch (err) {
                          console.error('Ошибка создания размера:', err);
                          alert('Ошибка создания размера');
                        }
                        
                        // Очищаем форму
                        setSizeFormData({ name: '', price_modifier: '', description: '', is_active: true });
                      }}
                      className="px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      + Добавить размер
                    </button>
                  </div>
                  
                  {/* Список добавленных размеров */}
                  {formData.size_options && formData.size_options.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-700 mb-2">Добавленные размеры:</p>
                      <div className="space-y-2">
                        {formData.size_options.map((size: any, index: number) => (
                          <div key={size.id || index} className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-medium text-gray-900">{size.name}</span>
                              <span className="text-xs text-gray-600">({size.description || 'Без описания'})</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-green-600">
                                {size.price_modifier > 0 ? `+${size.price_modifier}` : size.price_modifier} сум
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    size_options: prev.size_options.filter((_, i) => i !== index)
                                  }));
                                }}
                                className="text-red-500 hover:text-red-700 text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Добавки */}
                <div>
                  <label className="block text-xs font-medium text-black mb-2">
                    Добавки к товару
                  </label>
                  
                  {/* Отображение выбранных добавок */}
                  {editingItem && editingItem.add_on_options && editingItem.add_on_options.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-700 mb-2">Текущие добавки:</p>
                      <div className="space-y-2">
                        {editingItem.add_on_options.map((addon: any) => (
                          <div key={addon.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-medium text-gray-900">{addon.name}</span>
                              <span className="text-xs text-gray-600">({addon.description || 'Без описания'})</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-green-600">
                                {addon.price} сум
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Показываем добавки для редактирования или все доступные для нового товара */}
                  {(() => {
                    console.log('🔍 Проверяем добавки для отображения:', {
                      editingItem: editingItem,
                      add_on_options: editingItem?.add_on_options,
                      length: editingItem?.add_on_options?.length,
                      addOns: addOns,
                      addOnsLength: addOns.length
                    });
                    
                    // Всегда показываем все доступные добавки
                    const addonsToShow = addOns;
                    
                    const title = "Доступные добавки:";
                    
                    if (addonsToShow && addonsToShow.length > 0) {
                      return (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-700 mb-2">{title}</p>
                          {addonsToShow.map((addon: any) => (
                            <div key={addon.id} className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={formData.add_on_options.includes(addon.id)}
                                  onChange={(e) => handleAddOnChange(addon.id, e.target.checked)}
                                  className="rounded"
                                />
                                <span className="text-xs font-medium text-gray-900">{addon.name}</span>
                                <span className="text-xs text-gray-600">({addon.description || 'Без описания'})</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-bold text-green-600">
                                  {addon.price} сум
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-center py-4">
                          <p className="text-xs text-gray-500 mb-2">Нет добавок для этого блюда</p>
                          <p className="text-xs text-gray-400">Добавки настраиваются на уровне конкретного блюда</p>
                        </div>
                      );
                    }
                  })()}
                </div>
                
                {/* Настройки */}
                <div>
                  <label className="block text-xs font-medium text-black mb-2">
                    Настройки товара
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                    <label className="flex  items-center space-x-2">
                      <input
                        type="checkbox"
                        name="is_hit"
                        checked={formData.is_hit}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-xs text-black">Хит продаж</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="is_new"
                        checked={formData.is_new}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-xs text-black">Новинка</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-xs text-black">Активен</span>
                    </label>
                  </div>
                  
                  {/* Время доступности */}
                  <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
                    <label className="flex items-center space-x-2 mb-3">
                      <input
                        type="checkbox"
                        name="use_time_restriction"
                        checked={formData.use_time_restriction}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-xs font-medium text-black">Ограничить время доступности</span>
                    </label>
                    
                    {formData.use_time_restriction && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-black mb-1">
                            Доступен с
                          </label>
                          <input
                            type="time"
                            name="available_from_time"
                            value={formData.available_from_time}
                            onChange={handleInputChange}
                            className="w-full border text-black border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-black mb-1">
                            Доступен до
                          </label>
                          <input
                            type="time"
                            name="available_to_time"
                            value={formData.available_to_time}
                            onChange={handleInputChange}
                            className="w-full border text-black border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}
                    
                    {formData.use_time_restriction && (
                      <div className="mt-2 text-xs text-gray-600">
                        <p>💡 Товар будет автоматически скрыт вне указанного времени</p>
                        <p>💡 Поддерживается переход через полночь (например, 22:00 - 08:00)</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Кнопки */}
                <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
                  <button 
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 text-black px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-xs sm:text-sm"
                  >
                    Отмена
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm"
                  >
                    {loading ? 'Сохранение...' : (editingItem ? 'Сохранить изменения' : 'Добавить товар')}
                  </button>
                </div>
              </form>
        </div>
      </Modal>


      {/* Модальное окно для добавления размера */}
      <Modal
        isOpen={showSizeModal}
        onClose={() => setShowSizeModal(false)}
        title={editingItem ? `Создать размер для "${editingItem.name}"` : "Создать размер (будет привязан при сохранении)"}
        size="sm"
      >
        <div className="p-3 sm:p-4">
          {editingItem ? (
            <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
              <p className="text-xs font-medium text-blue-800">
                Создаете размер для блюда: <span className="font-bold">{editingItem.name}</span>
              </p>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">
              <p className="text-xs font-medium text-yellow-800">
                Размер будет создан и автоматически привязан к товару при сохранении
              </p>
            </div>
          )}
          <form onSubmit={handleCreateSize} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-black mb-1">
                  Название размера <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={sizeFormData.name}
                  onChange={(e) => setSizeFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full text-black border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Например: Большая"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-black mb-1">
                  Модификатор цены (сум) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  value={sizeFormData.price_modifier}
                  onChange={(e) => setSizeFormData(prev => ({ ...prev, price_modifier: e.target.value }))}
                  step="0.01"
                  className="w-full text-black border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-black mt-1">Положительное число увеличивает цену, отрицательное - уменьшает</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-black mb-1">
                  Описание размера
                </label>
                <textarea 
                  value={sizeFormData.description}
                  onChange={(e) => setSizeFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full text-black border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Например: 30 см, 8 кусочков"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 pt-3">
                <button 
                  type="button"
                  onClick={() => setShowSizeModal(false)}
                  className="flex-1 text-black px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-xs sm:text-sm"
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm"
                >
                  {loading ? 'Создание...' : 'Создать размер'}
                </button>
              </div>
            </form>
        </div>
      </Modal>

      {/* Модальное окно подтверждения удаления */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setItemToDelete(null);
        }}
        title="Подтверждение удаления"
        size="sm"
      >
        <div className="p-4">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Вы уверены?
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Вы действительно хотите удалить товар <strong>"{itemToDelete?.name}"</strong>? 
              Это действие нельзя отменить.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setItemToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              >
                {loading ? 'Удаление...' : 'Да, удалить'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Модальное окно подтверждения редактирования */}
      <Modal
        isOpen={showEditConfirm}
        onClose={() => {
          setShowEditConfirm(false);
          setItemToEdit(null);
        }}
        title="Подтверждение сохранения"
        size="sm"
      >
        <div className="p-4">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Сохранить изменения?
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Вы хотите сохранить изменения для товара <strong>"{itemToEdit?.name}"</strong>?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setShowEditConfirm(false);
                  setItemToEdit(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Отмена
              </button>
              <button
                onClick={async () => {
                  setShowEditConfirm(false);
                  setItemToEdit(null);
                  await submitForm();
                }}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Сохранение...' : 'Да, сохранить'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminMenuPage;


