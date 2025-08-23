import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type Language = 'ru' | 'uz';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  formatCurrency: (amount: number) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ru: {
    // Общие
    'loading': 'Загрузка...',
    'error': 'Ошибка',
    'cancel': 'Отмена',
    'confirm': 'Подтвердить',
    'add': 'Добавить',
    'remove': 'Удалить',
    'edit': 'Редактировать',
    'save': 'Сохранить',
    'close': 'Закрыть',
    
    // Навигация
    'menu': 'Меню',
    'cart': 'Корзина',
    'search': 'Поиск',
    'address': 'Адрес',
    'profile': 'Профиль',
    'orders': 'Заказы',
    'favorites': 'Избранное',
    
    // Меню
    'categories': 'Категории',
    'select_category': 'Выберите категорию',
    'full_menu': 'Полное меню',
    'select_category_or_view_all': 'Выберите категорию выше или просмотрите все блюда',
    'dishes_from_category': 'Блюда из выбранной категории',
    'show_all': 'Показать все',
    'menu_unavailable': 'В данный момент меню недоступно',
    'try_later': 'Попробуйте позже или свяжитесь с нами',
    'refresh_menu': 'Обновить меню',
    
    // Блюда
    'add_to_cart': 'Добавить в корзину',
    'select_options': 'Выбрать опции',
    'in_cart': 'В корзине',
    'favorite': 'Избранное',
    'remove_from_favorites': 'Убран из избранного',
    
    // Опции
    'select_size': 'Выберите размер',
    'additions_optional': 'Дополнения (необязательно)',
    'your_selection': 'Ваш выбор',
    'size': 'Размер',
    'addition': 'Дополнение',
    'total': 'Итого',
    
    // Корзина
    'cart_empty': 'Корзина пуста',
    'add_dishes_from_menu': 'Добавьте блюда из меню',
    'clear_cart': 'Очистить',
    'add_more_with_other_options': 'Добавить еще с другими опциями',
    'checkout': 'Оформить заказ',
    'item_added_to_cart': 'добавлен в корзину',
    'with_options': 'с',
    'cart_total': 'Итого по корзине',
    'total_items': 'Всего товаров',
    'price_per_item': 'Цена за шт.',
    'add_more': 'Добавить еще',
    
    // Акции
    'promotions_discounts': 'Акции и скидки',
    'apply_promotion': 'Применить акцию',
    
    // Хиты и новинки
    'hits': 'Хиты продаж',
    'new_items': 'Новинки',
    
    // Теги
    'spicy': 'Острое',
    'vegetarian': 'Вегетарианское',
    'gluten_free': 'Без глютена',
    'hit': 'Хит',
    'new': 'Новинка',
    
    // Уведомления
    'removed_from_favorites': 'убран из избранного',
    'added_to_favorites': 'добавлен в избранное',
    'error_toggle_favorite': 'Ошибка при работе с избранным',
    
    // Статусы
    'open': 'Открыто',
    'closed': 'Закрыто',
    'guest': 'Гость',
    'telegram': 'Telegram',
    'open_until_21': 'Открыто до 21:00',
    'closed_sunday': 'Воскресенье - выходной',
    'next_open_monday': 'Следующий рабочий день - понедельник',
    'opens_at_8': 'Открывается в 8:00',
    'closed_until_tomorrow': 'Закрыто до завтра',
    'next_open_8': 'Следующее открытие в 8:00',
    'closes_in': 'Закрывается через',
    'open_until_4am': 'Открыто до 4:00 утра',
    'open_all_night': 'Работаем всю ночь',
    'note_24h_operation': 'Работаем круглосуточно с 8:00 до 4:00 следующего дня',
    'restaurant_closed': 'Ресторан закрыт',
    'next_opening': 'Следующее открытие',
    'working_hours': 'Время работы',
    'monday': 'Понедельник',
    'saturday': 'Суббота',
    'sunday': 'Воскресенье',
    'our_address': 'Наш адрес',
    'restaurant_address': 'г. Ташкент, ул. Примерная, д. 123, офис 456',
    'contacts': 'Контакты',
    'restaurant_phone': '+998 90 123 45 67',
    
    // Кнопки
    'logout': 'Выйти',
    'login': 'Войти',
    'register': 'Регистрация',
    
    // Поиск и фильтрация
    'search_dishes': 'Поиск блюд',
    'search_placeholder': 'Введите название блюда...',
    'back_to_menu': 'Назад к меню',
    'category': 'Категория',
    'all_categories': 'Все категории',
    'price_range': 'Диапазон цен',
    'sort_by': 'Сортировать по',
    'by_name': 'По названию',
    'by_price': 'По цене',
    'by_popularity': 'По популярности',
    'by_newest': 'По новизне',
    'found_items': 'Найдено блюд',
    'no_items_found': 'Блюда не найдены',
    'try_different_filters': 'Попробуйте изменить фильтры',
    
    // Загрузка
    'loading_menu': 'Загрузка меню...',
    'preparing_delicious_dishes': 'Подготавливаем вкусные блюда для вас',
    'no_favorites': 'У вас пока нет избранных товаров',
    
    // Адреса
    'delivery_address': 'Адрес доставки',
    'delivery_addresses': 'Адреса доставки',
    'add_address': 'Добавить адрес',
    'edit_address': 'Редактировать адрес',
    'street': 'Улица',
    'house_number': 'Номер дома',
    'apartment': 'Квартира',
    'city': 'Город',
    'phone_number': 'Номер телефона',
    'comment': 'Комментарий',
    'set_as_primary': 'Установить как основной',
    'primary': 'Основной',
    'set_primary': 'Сделать основным',
    'delete': 'Удалить',
    'update': 'Обновить',
    'back': 'Назад',
    'no_addresses': 'У вас пока нет адресов',
    'add_first_address': 'Добавьте первый адрес для доставки',
    'street_placeholder': 'Например: ул. Навои',
    'comment_placeholder': 'Дополнительная информация (подъезд, этаж, код домофона)',
    
    // Карта и геолокация
    'select_address_on_map': 'Выберите адрес на карте',
    'loading_map': 'Загрузка карты',
    'map_instructions': 'Нажмите на карту, чтобы выбрать адрес доставки. Зеленые зоны - доступны для доставки.',
    'delivery_zones': 'Зоны доставки',
    'available_address': 'Доступный адрес',
    'unavailable_address': 'Недоступный адрес',
    'my_location': 'Моё местоположение',
    'selected_address': 'Выбранный адрес',
    'confirm_address': 'Подтвердить адрес',
    'delivery_available': 'Доставка доступна',
    'delivery_unavailable': 'Доставка недоступна',
    'delivery_zone': 'Зона доставки',
    'delivery_fee': 'Стоимость доставки',
    'currency': 'сум',
    'address_outside_delivery_zone': 'Адрес находится вне зоны доставки',
    'address_outside_delivery_zone_description': 'К сожалению, доставка по этому адресу недоступна',
    'geolocation_error': 'Не удалось определить ваше местоположение',
    'geolocation_not_supported': 'Геолокация не поддерживается вашим браузером',
    'select_on_map': 'Выбрать на карте',
    'enter_manually': 'Ввести вручную',
    
    // Поиск
    'search_results': 'Результаты поиска',
    'found': 'Найдено',
    'nothing_found': 'По вашему запросу ничего не найдено',
    'change_search_query': 'Попробуйте изменить поисковый запрос'
  },
  uz: {
    // Общие
    'loading': 'Yuklanmoqda...',
    'error': 'Xato',
    'cancel': 'Bekor qilish',
    'confirm': 'Tasdiqlash',
    'add': 'Qo\'shish',
    'remove': 'O\'chirish',
    'edit': 'Tahrirlash',
    'save': 'Saqlash',
    'close': 'Yopish',
    
    // Навигация
    'menu': 'Menyu',
    'cart': 'Savat',
    'search': 'Qidiruv',
    'address': 'Manzil',
    'profile': 'Profil',
    'orders': 'Buyurtmalar',
    'favorites': 'Sevimlilar',
    
    // Меню
    'categories': 'Kategoriyalar',
    'select_category': 'Kategoriyani tanlang',
    'full_menu': 'To\'liq menyu',
    'select_category_or_view_all': 'Yuqoridagi kategoriyani tanlang yoki barcha taomlarni ko\'ring',
    'dishes_from_category': 'Tanlangan kategoriyadagi taomlar',
    'show_all': 'Hammasini ko\'rsatish',
    'menu_unavailable': 'Hozirda menyu mavjud emas',
    'try_later': 'Keyinroq urinib ko\'ring yoki biz bilan bog\'laning',
    'refresh_menu': 'Menyuni yangilash',
    
    // Блюда
    'add_to_cart': 'Savatga qo\'shish',
    'select_options': 'Variantlarni tanlash',
    'in_cart': 'Savatda',
    'favorite': 'Sevimli',
    'remove_from_favorites': 'Sevimlilardan olib tashlandi',
    
    // Опции
    'select_size': 'O\'lchamni tanlang',
    'additions_optional': 'Qo\'shimchalar (ixtiyoriy)',
    'your_selection': 'Sizning tanlovingiz',
    'size': 'O\'lcham',
    'addition': 'Qo\'shimcha',
    'total': 'Jami',
    
    // Корзина
    'cart_empty': 'Savat bo\'sh',
    'add_dishes_from_menu': 'Menyudan taom qo\'shing',
    'clear_cart': 'Tozalash',
    'add_more_with_other_options': 'Boshqa variantlar bilan yana qo\'shish',
    'checkout': 'Buyurtma berish',
    'item_added_to_cart': 'savatga qo\'shildi',
    'with_options': 'bilan',
    'cart_total': 'Savat umumiy',
    'total_items': 'Umumiy mahsulotlar',
    'price_per_item': 'Narxi birlik',
    'add_more': 'Boshqa qo\'shing',
    
    // Акции
    'promotions_discounts': 'Aksiyalar va chegirmalar',
    'apply_promotion': 'Aksiyani qo\'llash',
    
    // Хиты и новинки
    'hits': 'Sotuvlar hitlari',
    'new_items': 'Yangi mahsulotlar',
    
    // Теги
    'spicy': 'O\'tkir',
    'vegetarian': 'Vegetarian',
    'gluten_free': 'Glyutensiz',
    'hit': 'Hit',
    'new': 'Yangi',
    
    // Уведомления
    'removed_from_favorites': 'sevimlilardan olib tashlandi',
    'added_to_favorites': 'sevimlilarga qo\'shildi',
    'error_toggle_favorite': 'Sevimli ishida xato',
    
    // Статусы
    'open': 'Ochiq',
    'closed': 'Yopiq',
    'guest': 'Mehmon',
    'telegram': 'Telegram',
    'open_until_21': 'Ochiq 21:00gacha',
    'closed_sunday': 'Yakshanba - dam olish',
    'next_open_monday': 'Keyingi ish kuni - shanba',
    'opens_at_8': '8:00ga ochiladi',
    'closed_until_tomorrow': 'Ertaga yopiq',
    'next_open_8': 'Keyingi ochilish 8:00ga',
    'closes_in': 'Yopishiga',
    'open_until_4am': 'Ochiq 4:00gacha',
    'open_all_night': 'Tungi vaqtda ham ishlaymiz',
    'note_24h_operation': '8:00dan 4:00gacha ertalab ishlaymiz',
    'restaurant_closed': 'Restoran yopiq',
    'next_opening': 'Keyingi ochilish',
    'working_hours': 'Ish vaqti',
    'monday': 'Dushanba',
    'saturday': 'Shanba',
    'sunday': 'Yakshanba',
    'our_address': 'Bizning manzilimiz',
    'restaurant_address': 'Toshkent shahar, Misrli ko\'chasi, 123-uy, 456-boshqaruv xonasi',
    'contacts': 'Aloqa',
    'restaurant_phone': '+998 90 123 45 67',
    
    // Кнопки
    'logout': 'Chiqish',
    'login': 'Kirish',
    'register': 'Ro\'yxatdan o\'tish',
    
    // Поиск и фильтрация
    'search_dishes': 'Qidiruv taomlari',
    'search_placeholder': 'Taom nomini kiriting...',
    'back_to_menu': 'Menyuga qaytish',
    'category': 'Kategoriya',
    'all_categories': 'Barcha kategoriyalar',
    'price_range': 'Narxlarning diapazoni',
    'sort_by': 'Saralash',
    'by_name': 'Nomiga ko\'ra',
    'by_price': 'Narxidan ko\'ra',
    'by_popularity': 'Mashhurlikka ko\'ra',
    'by_newest': 'Yangilikka ko\'ra',
    'found_items': 'Qidiruv taomlari',
    'no_items_found': 'Taomlar topilmadi',
    'try_different_filters': 'Filtrlarni o\'zgartiring',
    
    // Загрузка
    'loading_menu': 'Menyu yuklanmoqda...',
    'preparing_delicious_dishes': 'Siz uchun mazali taomlar tayyorlaymiz',
    'no_favorites': 'Sizda hali sevimli mahsulotlar yo\'q',
    
    // Адреса
    'delivery_address': 'Yetkazib berish manzili',
    'delivery_addresses': 'Yetkazib berish manzillari',
    'add_address': 'Manzil qo\'shish',
    'edit_address': 'Manzilni tahrirlash',
    'street': 'Ko\'cha',
    'house_number': 'Uy raqami',
    'apartment': 'Xona',
    'city': 'Shahar',
    'phone_number': 'Telefon raqami',
    'comment': 'Izoh',
    'set_as_primary': 'Asosiy sifatida o\'rnatish',
    'primary': 'Asosiy',
    'set_primary': 'Asosiy qilish',
    'delete': 'O\'chirish',
    'update': 'Yangilash',
    'back': 'Orqaga',
    'no_addresses': 'Sizda hali manzillar yo\'q',
    'add_first_address': 'Yetkazib berish uchun birinchi manzilni qo\'shing',
    'street_placeholder': 'Masalan: Navoiy ko\'chasi',
    'comment_placeholder': 'Qo\'shimcha ma\'lumot (eshik, qavat, domofon kodi)',
    
    // Карта и геолокация
    'select_address_on_map': 'Xaritada manzilni tanlang',
    'loading_map': 'Xarita yuklanmoqda',
    'map_instructions': 'Yetkazib berish manzilini tanlash uchun xaritaga bosing. Yashil hududlar - yetkazib berish uchun mavjud.',
    'delivery_zones': 'Yetkazib berish hududlari',
    'available_address': 'Mavjud manzil',
    'unavailable_address': 'Mavjud bo\'lmagan manzil',
    'my_location': 'Mening joylashuvim',
    'selected_address': 'Tanlangan manzil',
    'confirm_address': 'Manzilni tasdiqlash',
    'delivery_available': 'Yetkazib berish mavjud',
    'delivery_unavailable': 'Yetkazib berish mavjud emas',
    'delivery_zone': 'Yetkazib berish hududi',
    'delivery_fee': 'Yetkazib berish narxi',
    'currency': 'so\'m',
    'address_outside_delivery_zone': 'Manzil yetkazib berish hududidan tashqarida',
    'address_outside_delivery_zone_description': 'Afsuski, bu manzilga yetkazib berish mavjud emas',
    'geolocation_error': 'Sizning joylashuvingizni aniqlab bo\'lmadi',
    'geolocation_not_supported': 'Geolokatsiya brauzeringiz tomonidan qo\'llab-quvvatlanmaydi',
    'select_on_map': 'Xaritada tanlash',
    'enter_manually': 'Qo\'lda kiritish',
    
    'try_again': 'Qayta urinib ko\'ring',
    'refresh': 'Yangilash'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('ru');

  // Загружаем язык из localStorage при инициализации
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'ru' || savedLanguage === 'uz')) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Сохраняем язык в localStorage при изменении
  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  // Функция перевода
  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  // Форматирование валюты
  const formatCurrency = (amount: number): string => {
    // Всегда без копеек, с разделителем тысяч пробелом
    const integer = Math.round(Number(amount) || 0);
    const formattedNumber = integer.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const suffix = language === 'uz' ? "so'm" : 'сум';
    return `${formattedNumber} ${suffix}`;
  };

  const value: LanguageContextType = {
    language,
    setLanguage: handleLanguageChange,
    t,
    formatCurrency
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
