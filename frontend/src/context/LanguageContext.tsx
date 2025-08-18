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
    
    // Статусы
    'open': 'Открыто',
    'closed': 'Закрыто',
    'guest': 'Гость',
    'telegram': 'Telegram',
    
    // Кнопки
    'logout': 'Выйти',
    'login': 'Войти',
    'register': 'Регистрация',
    'try_again': 'Попробовать снова',
    'refresh': 'Обновить',
    
    // Загрузка
    'loading_menu': 'Загрузка меню...',
    'preparing_delicious_dishes': 'Подготавливаем вкусные блюда для вас',
    
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
    
    // Статусы
    'open': 'Ochiq',
    'closed': 'Yopiq',
    'guest': 'Mehmon',
    'telegram': 'Telegram',
    
    // Кнопки
    'logout': 'Chiqish',
    'login': 'Kirish',
    'register': 'Ro\'yxatdan o\'tish',
    'try_again': 'Qayta urinib ko\'ring',
    'refresh': 'Yangilash',
    
    // Загрузка
    'loading_menu': 'Menyu yuklanmoqda...',
    'preparing_delicious_dishes': 'Siz uchun mazali taomlar tayyorlaymiz',
    
    // Поиск
    'search_results': 'Qidiruv natijalari',
    'found': 'Topildi',
    'nothing_found': 'Sizning so\'rovingiz bo\'yicha hech narsa topilmadi',
    'change_search_query': 'Qidiruv so\'rovini o\'zgartirib ko\'ring'
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
