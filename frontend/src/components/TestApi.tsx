import React, { useEffect, useState } from 'react';
import { menuApi } from '../api/menu';

const TestApi: React.FC = () => {
  const [status, setStatus] = useState<string>('Тестирование...');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testApi = async () => {
      try {
        console.log('🧪 Тестируем API подключение...');
        const response = await menuApi.getMenu();
        
        if (response.success && response.data) {
          setStatus('✅ API работает!');
          setData(response.data);
          console.log('✅ API ответ:', response.data);
        } else {
          setStatus('❌ API ошибка');
          setError(response.error?.message || 'Неизвестная ошибка');
          console.error('❌ API ошибка:', response.error);
        }
      } catch (err: any) {
        setStatus('❌ Ошибка сети');
        setError(err.message || 'Ошибка подключения');
        console.error('❌ Ошибка сети:', err);
      }
    };

    testApi();
  }, []);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Тест API</h2>
      <div className="mb-4">
        <p className="font-semibold">Статус: {status}</p>
        {error && (
          <p className="text-red-600 mt-2">Ошибка: {error}</p>
        )}
      </div>
      
      {data && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Данные меню:</h3>
          <div className="text-sm">
            <p>Категорий: {data.categories?.length || 0}</p>
            <p>Всего товаров: {data.total_items || 0}</p>
            {data.categories?.slice(0, 2).map((cat: any) => (
              <div key={cat.id} className="mt-2 p-2 bg-gray-50 rounded">
                <p className="font-medium">{cat.name}</p>
                <p className="text-gray-600">Товаров: {cat.items?.length || 0}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestApi; 