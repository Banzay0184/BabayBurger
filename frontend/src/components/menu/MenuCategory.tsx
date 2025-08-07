import React from 'react';
import { MenuItem } from './MenuItem';
import type { MenuCategory as MenuCategoryType, MenuItem as MenuItemType } from '../types/menu';

interface MenuCategoryProps {
  category: MenuCategoryType;
  onItemSelect?: (item: MenuItemType) => void;
}

export const MenuCategory: React.FC<MenuCategoryProps> = ({ category, onItemSelect }) => {
  if (!category.items || category.items.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      {/* Заголовок категории */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text-primary mb-3">
          {category.name}
        </h2>
        {category.description && (
          <p className="text-text-secondary text-lg">
            {category.description}
          </p>
        )}
      </div>

      {/* Сетка блюд */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {category.items.map((item) => (
          <MenuItem 
            key={item.id} 
            item={item} 
            onSelect={onItemSelect}
          />
        ))}
      </div>
    </div>
  );
}; 