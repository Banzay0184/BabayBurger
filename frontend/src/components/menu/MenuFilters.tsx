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
    <div className="bg-light-gray border border-border-gray rounded-2xl p-6 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h3 className="text-xl font-semibold text-text-primary">
          Фильтры
        </h3>
        <Button 
          onClick={onReset}
          variant="secondary"
          size="sm"
        >
          Сбросить
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Поиск */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">
            Поиск
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="Название блюда..."
            className="w-full px-4 py-3 bg-bg-card border border-border-gray rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary placeholder-text-light"
          />
        </div>

        {/* Категория */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">
            Категория
          </label>
          <select
            value={filters.category || ''}
            onChange={handleCategoryChange}
            className="w-full px-4 py-3 bg-bg-card border border-border-gray rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary"
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
          <label className="block text-sm font-medium text-text-primary mb-3">
            Цена
          </label>
          <div className="flex space-x-3">
            <input
              type="number"
              name="minPrice"
              value={filters.priceRange[0]}
              onChange={handlePriceRangeChange}
              placeholder="От"
              className="flex-1 px-4 py-3 bg-bg-card border border-border-gray rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary placeholder-text-light"
            />
            <input
              type="number"
              name="maxPrice"
              value={filters.priceRange[1]}
              onChange={handlePriceRangeChange}
              placeholder="До"
              className="flex-1 px-4 py-3 bg-bg-card border border-border-gray rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary placeholder-text-light"
            />
          </div>
        </div>

        {/* Специальные фильтры */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">
            Специальные
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleShowHitsToggle}
              className={`
                px-3 py-2 text-sm rounded-xl border transition-all duration-200
                ${filters.showHits
                  ? 'bg-warning/20 text-warning border-warning/30'
                  : 'bg-bg-card text-text-secondary border-border-gray hover:bg-light-gray hover:text-text-primary'
                }
              `}
            >
              🔥 Хиты
            </button>
            <button
              onClick={handleShowNewToggle}
              className={`
                px-3 py-2 text-sm rounded-xl border transition-all duration-200
                ${filters.showNew
                  ? 'bg-success/20 text-success border-success/30'
                  : 'bg-bg-card text-text-secondary border-border-gray hover:bg-light-gray hover:text-text-primary'
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