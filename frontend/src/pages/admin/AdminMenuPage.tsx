import React from 'react';
import { menuApi } from '../../api/menu';

export const AdminMenuPage: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const res = await menuApi.getCategories();
      if (res.success) setCategories(res.data || []);
      else setError(res.error?.message || 'Ошибка загрузки');
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Категории</h2>
        <button className="px-3 py-2 bg-blue-600 text-white rounded">Добавить категорию</button>
      </div>
      {loading && <div>Загрузка...</div>}
      {error && <div className="text-red-600">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((c) => (
          <div key={c.id} className="bg-white border rounded p-3">
            <div className="font-medium">{c.name}</div>
            <div className="text-sm text-gray-600 line-clamp-2">{c.description}</div>
            <div className="mt-2 flex gap-2">
              <button className="px-2 py-1 text-sm border rounded">Редактировать</button>
              <button className="px-2 py-1 text-sm border rounded">Удалить</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminMenuPage;


