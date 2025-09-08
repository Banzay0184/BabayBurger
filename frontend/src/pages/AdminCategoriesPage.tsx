import React from 'react';
import { adminCategoriesApi, type AdminCategoryCreateInput, type AdminCategoryUpdateInput } from '../api/menu';
import type { ApiCategory } from '../api/menuTypes';

export const AdminCategoriesPage: React.FC = () => {
  const [categories, setCategories] = React.useState<ApiCategory[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [newName, setNewName] = React.useState('');
  const [newDesc, setNewDesc] = React.useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await adminCategoriesApi.list();
    if (res.success && res.data) setCategories(res.data);
    else setError(res.error?.message || 'Ошибка загрузки');
    setLoading(false);
  };

  React.useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: AdminCategoryCreateInput = { name: newName.trim(), description: newDesc.trim() || undefined };
    if (!payload.name) return;
    const res = await adminCategoriesApi.create(payload);
    if (res.success) {
      setNewName('');
      setNewDesc('');
      await load();
    } else {
      setError(res.error?.message || 'Ошибка создания');
    }
  };

  const handleRename = async (id: number, name: string) => {
    const payload: AdminCategoryUpdateInput = { name };
    const res = await adminCategoriesApi.update(id, payload);
    if (res.success) await load();
    else setError(res.error?.message || 'Ошибка обновления');
  };

  const handleRemove = async (id: number) => {
    if (!confirm('Удалить категорию?')) return;
    const res = await adminCategoriesApi.remove(id);
    if (res.success) await load();
    else setError(res.error?.message || 'Ошибка удаления');
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Категории (админ)</h1>
      {error && <div className="mb-3 text-red-500">{error}</div>}

      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Название категории"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Описание (необязательно)"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
        />
        <button className="bg-black text-white px-4 py-2 rounded" type="submit">Добавить</button>
      </form>

      {loading ? (
        <div>Загрузка...</div>
      ) : (
        <ul className="space-y-2">
          {categories.map((c) => (
            <li key={c.id} className="border rounded p-3 flex items-center gap-2">
              <input
                className="border rounded px-2 py-1 flex-1"
                defaultValue={c.name}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== c.name) handleRename(c.id, name);
                }}
              />
              <button className="text-red-600" onClick={() => handleRemove(c.id)}>Удалить</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminCategoriesPage;


