import React, { useState, useEffect } from 'react';
import { menuApi } from '../../api/menu';
import { MenuCategory } from './MenuCategory';
import { PromotionCard } from './PromotionCard';
import { FeaturedSection } from './FeaturedSection';

const MenuPage: React.FC = () => {
  const [menuData, setMenuData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMenu = async () => {
      try {
        console.log('🍔 Загружаем меню...');
        

        
        const result = await menuApi.getMenu();
        
        if (result.success && result.data) {
          console.log('✅ Меню загружено:', result.data);
          setMenuData(result.data);
        } else {
          console.error('❌ Ошибка загрузки меню:', result.error);
          setError(result.error?.message || 'Ошибка загрузки меню');
        }
      } catch (err: any) {
        console.error('❌ Исключение при загрузке меню:', err);
        setError(err.message || 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };

    loadMenu();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-6"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-accent-500 rounded-full animate-spin mx-auto" style={{ animationDelay: '-0.5s' }}></div>
          </div>
          <p className="text-gray-300 text-lg font-medium">Загрузка меню...</p>
          <p className="text-gray-500 text-sm mt-2">Подготавливаем вкусные блюда</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="w-20 h-20 bg-gradient-to-br from-error-500 to-error-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-100 mb-4">Ошибка загрузки меню</h2>
        <p className="text-gray-400 mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-300 hover:scale-105 shadow-dark-card"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Промо-акции */}
      {menuData?.promotions && menuData.promotions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-100 mb-6 flex items-center">
            <span className="mr-3">🎉</span>
            Специальные предложения
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuData.promotions.map((promotion: any) => (
              <PromotionCard key={promotion.id} promotion={promotion} />
            ))}
          </div>
        </div>
      )}

      {/* Популярные блюда */}
      {menuData?.categories && (
        <FeaturedSection 
          title="🔥 Популярные блюда"
          items={menuData.categories.flatMap((cat: any) => 
            cat.items?.filter((item: any) => item.is_hit) || []
          )}
        />
      )}

      {/* Новинки */}
      {menuData?.categories && (
        <FeaturedSection 
          title="✨ Новинки"
          items={menuData.categories.flatMap((cat: any) => 
            cat.items?.filter((item: any) => item.is_new) || []
          )}
        />
      )}

      {/* Категории меню */}
      {menuData?.categories && (
        <div className="space-y-12">
          <h2 className="text-3xl font-bold text-gray-100 text-center mb-12">
            🍽️ Наше меню
          </h2>
          {menuData.categories.map((category: any) => (
            <MenuCategory key={category.id} category={category} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuPage; 