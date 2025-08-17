import React, { useState, useEffect } from 'react';
import { menuApi } from '../../api/menu';

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
    return <div>Загрузка меню...</div>;
  }

  if (error) {
    return (
      <div>
        <h2>Ошибка загрузки меню</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Попробовать снова
        </button>

      </div>
    );
  }

  return (
    <div>
      <h1>Меню</h1>
      {menuData && (
        <div>
          <h2>Категории ({menuData.categories?.length || 0})</h2>
          {menuData.categories?.map((category: any) => (
            <div key={category.id}>
              <h3>{category.name}</h3>
              <p>{category.description}</p>
              <p>Товаров: {category.items?.length || 0}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuPage; 