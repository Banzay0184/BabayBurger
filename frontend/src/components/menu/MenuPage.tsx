import React, { useState, useEffect } from 'react';
import { menuApi } from '../../api/menu';
import { API_CONFIG } from '../../config/api';

// Функция для тестирования API подключения
const testApiConnection = async () => {
  const baseUrl = API_CONFIG.BASE_URL;
  
  console.log('🔍 Тестирование API подключения...');
  console.log('🌐 Base URL:', baseUrl);
  
  const tests = [
    {
      name: 'Test endpoint',
      url: `${baseUrl}test/`,
      method: 'GET'
    },
    {
      name: 'Menu endpoint',
      url: `${baseUrl}menu/`,
      method: 'GET'
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      console.log(`📋 Тестируем: ${test.name}`);
      
      const response = await fetch(test.url, {
        method: test.method,
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.text();
        console.log(`✅ ${test.name}: УСПЕХ (${response.status})`);
        console.log(`📄 Ответ: ${data.substring(0, 100)}...`);
        results.push({ test: test.name, success: true, status: response.status });
      } else {
        console.log(`❌ ${test.name}: ОШИБКА (${response.status})`);
        results.push({ test: test.name, success: false, status: response.status });
      }
    } catch (error: any) {
      console.log(`❌ ${test.name}: ИСКЛЮЧЕНИЕ - ${error.message}`);
      results.push({ test: test.name, success: false, error: error.message });
    }
  }
  
  console.log('📊 Результаты тестирования:', results);
  return results;
};

const MenuPage: React.FC = () => {
  const [menuData, setMenuData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMenu = async () => {
      try {
        console.log('🍔 Загружаем меню...');
        
        // Сначала тестируем подключение
        await testApiConnection();
        
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
        <button 
          onClick={() => window.location.href = '?test=api'}
          style={{ marginLeft: '10px', padding: '5px 10px' }}
        >
          Тестировать API
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