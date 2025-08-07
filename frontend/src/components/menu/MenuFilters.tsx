import React from 'react';
import { Button } from '../ui/Button';
import type { MenuFilters as MenuFiltersType } from '../types/menu';

interface MenuFiltersProps {
  filters: MenuFiltersType;
  categories: { id: number; name: string }[];
  onFiltersChange: (filters: Partial<MenuFiltersType>) => void;
  onReset: () => void;
}

export const MenuFilters: React.FC<MenuFiltersProps> = ({
  filters,
  categories,
  onFiltersChange,
  onReset
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ search: e.target.value });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value === '' ? null : e.target.value;
    onFiltersChange({ category: value });
  };

  const handlePriceRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    const isMin = e.target.name === 'minPrice';
    
    onFiltersChange({
      priceRange: isMin 
        ? [value, filters.priceRange[1]]
        : [filters.priceRange[0], value]
    });
  };

  const handleAllergenToggle = (allergen: string) => {
    const newAllergens = filters.allergens.includes(allergen)
      ? filters.allergens.filter(a => a !== allergen)
      : [...filters.allergens, allergen];
    
    onFiltersChange({ allergens: newAllergens });
  };

  const handleShowHitsToggle = () => {
    onFiltersChange({ showHits: !filters.showHits });
  };

  const handleShowNewToggle = () => {
    onFiltersChange({ showNew: !filters.showNew });
  };

  return (
    <div className="tg-card-modern p-8 mb-10 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">🔍</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900">
            Фильтры
          </h3>
        </div>
        <Button 
          onClick={onReset}
          variant="secondary"
          size="sm"
          className="!px-4 !py-2"
        >
          <span className="flex items-center">
            <span className="mr-2">🔄</span>
            Сбросить
          </span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Поиск */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <span className="mr-2">🔎</span>
            Поиск
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="Название блюда..."
            className="tg-input"
          />
        </div>

        {/* Категория */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <span className="mr-2">📂</span>
            Категория
          </label>
          <select
            value={filters.category || ''}
            onChange={handleCategoryChange}
            className="tg-input"
          >
            <option value="">Все категории</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Диапазон цен */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <span className="mr-2">💰</span>
            Цена
          </label>
          <div className="flex space-x-3">
            <input
              type="number"
              name="minPrice"
              value={filters.priceRange[0]}
              onChange={handlePriceRangeChange}
              placeholder="От"
              className="flex-1 tg-input"
            />
            <input
              type="number"
              name="maxPrice"
              value={filters.priceRange[1]}
              onChange={handlePriceRangeChange}
              placeholder="До"
              className="flex-1 tg-input"
            />
          </div>
        </div>

        {/* Специальные фильтры */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <span className="mr-2">⭐</span>
            Специальные
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleShowHitsToggle}
              className={`
                px-4 py-2 text-sm rounded-xl border-2 transition-all duration-300 font-medium
                ${filters.showHits
                  ? 'bg-gradient-to-r from-warning-500 to-warning-600 text-white border-warning-500 shadow-glow'
                  : 'bg-white/80 backdrop-blur-sm text-gray-700 border-gray-200 hover:bg-white hover:border-warning-300 hover:shadow-button'
                }
              `}
            >
              🔥 Хиты
            </button>
            <button
              onClick={handleShowNewToggle}
              className={`
                px-4 py-2 text-sm rounded-xl border-2 transition-all duration-300 font-medium
                ${filters.showNew
                  ? 'bg-gradient-to-r from-success-500 to-success-600 text-white border-success-500 shadow-glow'
                  : 'bg-white/80 backdrop-blur-sm text-gray-700 border-gray-200 hover:bg-white hover:border-success-300 hover:shadow-button'
                }
              `}
            >
              ✨ Новинки
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 