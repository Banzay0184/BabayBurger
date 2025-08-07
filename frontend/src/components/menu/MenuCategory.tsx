import React from 'react';
import { MenuItem } from './MenuItem';
import type { MenuCategory as MenuCategoryType, MenuItem as MenuItemType } from '../../types/menu';

interface MenuCategoryProps {
  category: MenuCategoryType;
  onItemSelect?: (item: MenuItemType) => void;
}

export const MenuCategory: React.FC<MenuCategoryProps> = ({ category, onItemSelect }) => {
  if (!category.items || category.items.length === 0) {
    return null;
  }

  return (
    <div className="mb-12 animate-fade-in">
      {/* Современный заголовок категории */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mr-4 shadow-glow">
            <span className="text-white text-lg">🍽️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {category.name}
          </h2>
        </div>
        {category.description && (
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl">
            {category.description}
          </p>
        )}
      </div>

      {/* Сетка блюд с современным дизайном */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {category.items.map((item: MenuItemType, index: number) => (
          <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
            <MenuItem 
              item={item} 
              onSelect={onItemSelect}
            />
          </div>
        ))}
      </div>
    </div>
  );
}; 