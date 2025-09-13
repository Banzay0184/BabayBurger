import React, { useState, useEffect } from 'react';
import type { OrderForOperator } from '../../types/operator';
import { operatorOrdersApi } from '../../api/operatorApi';

interface EditOrderModalProps {
  order: OrderForOperator;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (order: OrderForOperator) => void;
  isLoading?: boolean;
}

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  addons: string[];
  total_price: number;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);

  // Загрузка корзины заказа и меню
  useEffect(() => {
    if (isOpen) {
      setIsLoadingItems(true);
      setError(null);
      
      const loadData = async () => {
        try {
          // Загружаем корзину
          if (order.items_details) {
            const items: CartItem[] = order.items_details.map(item => ({
              id: item.id,
              name: item.menu_item_name,
              price: item.menu_item_price,
              quantity: item.quantity,
              size: item.size_option_name || undefined,
              addons: item.add_ons_names || [],
              total_price: item.total_price
            }));
            setCartItems(items);
          }
          
          // Загружаем меню
          try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.babayfood.uz/api';
            const token = localStorage.getItem('operator_token');
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'ngrok-skip-browser-warning': 'true',
            };
            if (token) {
              headers['Authorization'] = `Token ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/menu/`, {
              method: 'GET',
              headers
            });

            if (response.ok) {
              const menu = await response.json();
              console.log('🍽️ Загружено меню:', menu);
              
              // Проверяем формат ответа и извлекаем массив товаров
              let menuArray = [];
              if (menu.all_items && Array.isArray(menu.all_items)) {
                // Используем all_items из endpoint /menu/
                menuArray = menu.all_items;
              } else if (Array.isArray(menu)) {
                menuArray = menu;
              } else if (menu.results && Array.isArray(menu.results)) {
                menuArray = menu.results;
              } else if (menu.data && Array.isArray(menu.data)) {
                menuArray = menu.data;
              } else {
                console.warn('Неожиданный формат меню:', menu);
                menuArray = [];
              }
              
              setMenuItems(menuArray);
              console.log('🍽️ Установлены товары меню:', menuArray);
              
              // Проверяем наличие соусов
              const sauces = menuArray.filter((item: any) => 
                item.name && item.name.toLowerCase().includes('соус')
              );
              console.log('🍯 Найдены соусы:', sauces);
              
              // Проверяем структуру всех товаров
              console.log('🔍 Структура товаров:', menuArray.slice(0, 3).map((item: any) => ({
                id: item.id,
                name: item.name,
                category: item.category,
                category_id: item.category_id,
                category_name: item.category_name,
                is_active: item.is_active
              })));

              // Извлекаем категории из ответа /menu/
              let categoriesArray = [];
              if (menu.categories && Array.isArray(menu.categories)) {
                // Используем категории из endpoint /menu/
                categoriesArray = menu.categories;
              } else {
                // Fallback: загружаем категории отдельно
                const categoriesResponse = await fetch(`${API_BASE_URL}/categories/`, {
                  method: 'GET',
                  headers
                });

                if (categoriesResponse.ok) {
                  const categoriesData = await categoriesResponse.json();
                  console.log('📂 Загружены категории (fallback):', categoriesData);
                  
                  if (Array.isArray(categoriesData)) {
                    categoriesArray = categoriesData;
                  } else if (categoriesData.results && Array.isArray(categoriesData.results)) {
                    categoriesArray = categoriesData.results;
                  } else if (categoriesData.data && Array.isArray(categoriesData.data)) {
                    categoriesArray = categoriesData.data;
                  }
                } else {
                  console.warn('Ошибка загрузки категорий:', categoriesResponse.status);
                }
              }
              
              setCategories(categoriesArray);
              console.log('📂 Установлены категории:', categoriesArray);
              
              // Проверяем наличие категории соусов
              const sauceCategory = categoriesArray.find((cat: any) => 
                cat.name && cat.name.toLowerCase().includes('соус')
              );
              console.log('🍯 Найдена категория соусов:', sauceCategory);
            } else {
              console.warn('Ошибка загрузки меню:', response.status);
              setMenuItems([]);
              setCategories([]);
            }
          } catch (menuError) {
            console.error('Ошибка загрузки меню:', menuError);
            setMenuItems([]);
          }
          
        } catch (err) {
          setError('Ошибка загрузки данных');
          console.error('Ошибка загрузки данных:', err);
        } finally {
          setIsLoadingItems(false);
        }
      };
      
      loadData();
    }
  }, [isOpen, order.items_details]);

  // Обновление количества товара
  const handleQuantityChange = (itemId: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    setCartItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              quantity: newQuantity,
              total_price: item.price * newQuantity
            }
          : item
      )
    );
  };

  // Удаление товара из корзины
  const handleRemoveItem = (itemId: number) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Выбор товара для добавления
  const handleSelectMenuItem = (menuItem: any) => {
    console.log('🍽️ Выбран товар:', {
      name: menuItem.name,
      size_options: menuItem.size_options,
      add_on_options: menuItem.add_on_options,
      category: menuItem.category
    });
    setSelectedMenuItem(menuItem);
    setSelectedSize(null);
    setSelectedAddons([]);
  };

  // Добавление нового товара в корзину
  const handleAddMenuItem = () => {
    if (!selectedMenuItem || !selectedMenuItem.name || !selectedMenuItem.price) {
      console.error('Некорректные данные товара:', selectedMenuItem);
      return;
    }

    // Рассчитываем цену с учетом размера и добавок
    let basePrice = Number(selectedMenuItem.price);
    let sizeModifier = 0;
    let addonsPrice = 0;

    if (selectedSize && selectedSize.price_modifier) {
      sizeModifier = Number(selectedSize.price_modifier);
    }

    selectedAddons.forEach(addon => {
      if (addon.price) {
        addonsPrice += Number(addon.price);
      }
    });

    const totalPrice = basePrice + sizeModifier + addonsPrice;

    const newItem: CartItem = {
      id: selectedMenuItem.id, // Используем ID товара из меню
      name: selectedMenuItem.name,
      price: basePrice,
      quantity: 1,
      size: selectedSize ? selectedSize.name : undefined,
      addons: selectedAddons.map(addon => addon.name),
      total_price: totalPrice
    };
    
    setCartItems(prev => [...prev, newItem]);
    setShowAddItem(false);
    setSelectedMenuItem(null);
    setSelectedSize(null);
    setSelectedAddons([]);
  };

  // Сохранение изменений
  const handleSaveChanges = async () => {
    try {
      setIsLoadingItems(true);
      setError(null);
      
      // Подготавливаем данные для отправки на сервер
      const cartData = {
        items: cartItems.map(item => {
          // Находим menu_item_id по названию товара
          const menuItem = menuItems.find(mi => mi.name === item.name);
          const menuItemId = menuItem ? menuItem.id : item.id;
          
          // Находим размер, если указан
          let sizeOptionId = null;
          if (item.size && menuItem && menuItem.size_options) {
            const sizeOption = menuItem.size_options.find((so: any) => so.name === item.size);
            sizeOptionId = sizeOption ? sizeOption.id : null;
          }
          
          // Находим добавки, если указаны
          const addonIds: number[] = [];
          if (item.addons && item.addons.length > 0 && menuItem && menuItem.add_on_options) {
            item.addons.forEach(addonName => {
              const addon = menuItem.add_on_options.find((ao: any) => ao.name === addonName);
              if (addon) {
                addonIds.push(addon.id);
              }
            });
          }
          
          return {
            menu_item_id: menuItemId,
            quantity: item.quantity,
            size_option_id: sizeOptionId,
            addon_ids: addonIds
          };
        })
      };
      
      console.log('🔄 Отправляем данные корзины:', cartData);
      console.log('📋 Информация о заказе:', {
        orderId: order.id,
        assignedOperator: order.assigned_operator,
        status: order.status
      });
      
      // Отправляем обновленную корзину на сервер
      const updatedOrder = await operatorOrdersApi.updateOrderCart(order.id, cartData);
      
      console.log('✅ Корзина обновлена:', updatedOrder);
      
      onUpdate(updatedOrder);
      onClose();
      
    } catch (err) {
      setError('Ошибка сохранения изменений: ' + (err as Error).message);
      console.error('Ошибка сохранения изменений:', err);
    } finally {
      setIsLoadingItems(false);
    }
  };

  // Расчет общей суммы
  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + item.total_price;
    }, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-white text-2xl font-bold">Изменение заказа #{order.id}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 mb-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {isLoadingItems ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Загрузка корзины...</p>
          </div>
        ) : (
          <>
            {/* Кнопка добавления блюда */}
            <div className="mb-4">
              <button
                onClick={() => setShowAddItem(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>➕</span>
                <span>Добавить блюдо</span>
              </button>
            </div>

            {/* Список товаров */}
            <div className="space-y-4 mb-6">
              {cartItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">Корзина пуста</p>
                </div>
              ) : (
                cartItems.map(item => (
                  <div key={item.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold">{item.name}</h4>
                        {item.size && (
                          <p className="text-blue-400 text-sm font-medium">
                            Размер: {item.size}
                          </p>
                        )}
                        <p className="text-gray-400 text-sm">
                          Цена за единицу: {new Intl.NumberFormat('ru-RU').format(item.price)} сум
                        </p>
                        {item.addons && item.addons.length > 0 && (
                          <div className="mt-2">
                            <p className="text-gray-400 text-xs">Добавки:</p>
                            {item.addons.map((addon, index) => (
                              <p key={index} className="text-gray-500 text-xs ml-2">
                                + {addon}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-400 hover:text-red-300 text-lg ml-2"
                        title="Удалить товар"
                      >
                        🗑️
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 0}
                          className="bg-gray-600 hover:bg-gray-500 text-white w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="text-white font-semibold w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className="bg-gray-600 hover:bg-gray-500 text-white w-8 h-8 rounded-full flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">
                          {new Intl.NumberFormat('ru-RU').format(item.total_price)} сум
                        </p>
                        <p className="text-gray-400 text-xs">
                          {item.quantity} × {new Intl.NumberFormat('ru-RU').format(item.price)} сум
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Общая сумма */}
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-white text-lg font-semibold">Итого:</span>
                <span className="text-white text-xl font-bold">
                  {new Intl.NumberFormat('ru-RU').format(calculateTotal())} сум
                </span>
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="flex space-x-4">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={isLoadingItems || cartItems.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isLoadingItems ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Модальное окно выбора блюда */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white text-2xl font-bold">Выберите блюдо</h3>
              <button
                onClick={() => {
                  setShowAddItem(false);
                  setSelectedMenuItem(null);
                  setSelectedSize(null);
                  setSelectedAddons([]);
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {!selectedMenuItem ? (
              // Выбор категории и товара
              <div>
                {/* Категории */}
                <div className="mb-6">
                  <h4 className="text-white text-lg font-semibold mb-3">Категории</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        !selectedCategory 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      Все
                    </button>
                    {Array.isArray(categories) && categories.map(category => {
                      // Подсчитываем количество товаров в категории
                      const itemCount = Array.isArray(menuItems) ? menuItems.filter(item => 
                        item && (item.category === category.id || item.category_id === category.id)
                      ).length : 0;
                      
                      return (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            selectedCategory?.id === category.id 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          }`}
                        >
                          {category.name} ({itemCount})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Товары */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.isArray(menuItems) && menuItems
                    .filter(item => {
                      if (!item) return false;
                      
                      // Показываем неактивные товары с пометкой "Недоступно"
                      if (item.is_active === false) {
                        // Добавляем свойство для отображения как недоступного
                        item._isUnavailable = true;
                        return true; // Показываем, но с пометкой
                      }
                      
                      if (!selectedCategory) return true;
                      
                      // Отладочная информация для фильтрации
                      const matchesCategory = item.category === selectedCategory.id || item.category_id === selectedCategory.id;
                      if (selectedCategory.name === 'Соусы') {
                        console.log('🍯 Фильтрация соусов:', {
                          itemName: item.name,
                          itemCategory: item.category,
                          itemCategoryId: item.category_id,
                          selectedCategoryId: selectedCategory.id,
                          matchesCategory
                        });
                      }
                      
                      return matchesCategory;
                    })
                    .map(menuItem => (
                    <div
                      key={menuItem.id}
                      className={`rounded-lg p-4 transition-colors ${
                        menuItem._isUnavailable 
                          ? 'bg-gray-600 cursor-not-allowed opacity-60' 
                          : 'bg-gray-700 cursor-pointer hover:bg-gray-600'
                      }`}
                      onClick={() => !menuItem._isUnavailable && handleSelectMenuItem(menuItem)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className={`font-semibold ${
                            menuItem._isUnavailable ? 'text-gray-400' : 'text-white'
                          }`}>
                            {menuItem.name}
                          </h4>
                          <p className="text-gray-400 text-sm mt-1">
                            {menuItem.description || 'Описание отсутствует'}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <p className={`font-semibold ${
                              menuItem._isUnavailable ? 'text-gray-500' : 'text-green-400'
                            }`}>
                              {new Intl.NumberFormat('ru-RU').format(Number(menuItem.price) || 0)} сум
                            </p>
                            {menuItem._isUnavailable && (
                              <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                                Недоступно
                              </span>
                            )}
                            {!menuItem._isUnavailable && menuItem.is_hit && (
                              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                Хит
                              </span>
                            )}
                            {!menuItem._isUnavailable && menuItem.is_new && (
                              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                Новинка
                              </span>
                            )}
                          </div>
                        </div>
                        {(menuItem.image || menuItem.image_url) && (
                          <img
                            src={menuItem.image || menuItem.image_url}
                            alt={menuItem.name}
                            className={`w-16 h-16 object-cover rounded-lg ml-4 ${
                              menuItem._isUnavailable ? 'opacity-50' : ''
                            }`}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {Array.isArray(menuItems) && menuItems.filter(item => {
                  if (!item) return false;
                  if (!selectedCategory) return true;
                  return item.category === selectedCategory.id || item.category_id === selectedCategory.id;
                }).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Блюда не найдены</p>
                    <p className="text-gray-500 text-sm mt-2">
                      В этой категории пока нет товаров
                    </p>
                    {selectedCategory && (
                      <p className="text-gray-600 text-xs mt-1">
                        Категория: {selectedCategory.name} (ID: {selectedCategory.id})
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Настройка выбранного товара
              <div>
                <div className="flex items-center mb-6">
                  <button
                    onClick={() => {
                      setSelectedMenuItem(null);
                      setSelectedSize(null);
                      setSelectedAddons([]);
                    }}
                    className="text-blue-400 hover:text-blue-300 mr-4"
                  >
                    ← Назад
                  </button>
                  <h4 className="text-white text-xl font-semibold">{selectedMenuItem.name}</h4>
                </div>

                {/* Размеры */}
                {selectedMenuItem.size_options && selectedMenuItem.size_options.length > 0 && (
                  <div className="mb-6">
                    <h5 className="text-white font-semibold mb-4 flex items-center">
                      <span className="mr-2">📏</span>
                      Размер:
                    </h5>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedMenuItem.size_options
                        .filter((size: any) => size.is_active !== false)
                        .map((size: any) => (
                        <button
                          key={size.id}
                          onClick={() => setSelectedSize(size)}
                          className={`
                            relative p-4 text-sm rounded-xl border-2 transition-all duration-300 font-medium text-center
                            ${selectedSize?.id === size.id
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 shadow-lg scale-105'
                              : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600 hover:border-blue-500/50 hover:shadow-md hover:scale-102'
                            }
                          `}
                        >
                          <div className="font-semibold mb-1">{size.name}</div>
                          {size.price_modifier && size.price_modifier !== 0 && (
                            <div className={`text-xs ${selectedSize?.id === size.id ? 'text-blue-100' : 'text-gray-400'}`}>
                              {size.price_modifier > 0 ? '+' : ''}{new Intl.NumberFormat('ru-RU').format(Number(size.price_modifier) || 0)} сум
                            </div>
                          )}
                          {selectedSize?.id === size.id && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Добавки */}
                {selectedMenuItem.add_on_options && selectedMenuItem.add_on_options.length > 0 && (
                  <div className="mb-6">
                    <h5 className="text-white font-semibold mb-4 flex items-center">
                      <span className="mr-2">➕</span>
                      Добавки (опционально):
                    </h5>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedMenuItem.add_on_options
                        .filter((addon: any) => addon.is_active !== false)
                        .map((addon: any) => {
                          const isSelected = selectedAddons.some(a => a.id === addon.id);
                          return (
                            <button
                              key={addon.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedAddons(prev => prev.filter(a => a.id !== addon.id));
                                } else {
                                  setSelectedAddons(prev => [...prev, addon]);
                                }
                              }}
                              className={`
                                relative p-4 text-sm rounded-xl border-2 transition-all duration-300 font-medium text-center
                                ${isSelected
                                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-500 shadow-lg scale-105'
                                  : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600 hover:border-green-500/50 hover:shadow-md hover:scale-102'
                                }
                              `}
                            >
                              <div className="font-semibold mb-1">{addon.name}</div>
                              <div className={`text-xs ${isSelected ? 'text-green-100' : 'text-gray-400'}`}>
                                +{new Intl.NumberFormat('ru-RU').format(Number(addon.price) || 0)} сум
                              </div>
                              {isSelected && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Итоговая цена и кнопка добавления */}
                <div className="mt-6 p-6 bg-gradient-to-r from-gray-700 to-gray-800 rounded-xl border border-gray-600">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-300 text-lg font-semibold">Итого:</span>
                    <span className="text-2xl font-bold text-green-400">
                      {(() => {
                        let total = Number(selectedMenuItem.price);
                        if (selectedSize && selectedSize.price_modifier) {
                          total += Number(selectedSize.price_modifier);
                        }
                        selectedAddons.forEach(addon => {
                          if (addon.price) {
                            total += Number(addon.price);
                          }
                        });
                        return new Intl.NumberFormat('ru-RU').format(total);
                      })()} сум
                    </span>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedMenuItem(null);
                        setSelectedSize(null);
                        setSelectedAddons([]);
                      }}
                      className="flex-1 px-4 py-3 bg-gray-600 text-gray-300 rounded-lg font-semibold hover:bg-gray-500 transition-all duration-300"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleAddMenuItem}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-300 hover:scale-105 shadow-lg"
                    >
                      <span className="flex items-center justify-center">
                        <span className="mr-2">🛒</span>
                        Добавить в корзину
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
