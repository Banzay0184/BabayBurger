import React from 'react';
import MenuItem from './MenuItem';
import type { MenuCategory as MenuCategoryType, MenuItem as MenuItemType } from '../../types/menu';

interface MenuCategoryProps {
  category: MenuCategoryType;
  onItemSelect?: (item: MenuItemType) => void;
  onNavigateToDetails?: (item: MenuItemType) => void;
}

export const MenuCategory: React.FC<MenuCategoryProps> = ({ category, onItemSelect, onNavigateToDetails }) => {
  if (!category.items || category.items.length === 0) {
    console.log('❌ MenuCategory: no items for category', category.name);
    return null;
  }

  return (
    <div className="mb-12 animate-fade-in">
      {/* Современный заголовок категории для темной темы */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mr-4 shadow-dark-glow overflow-hidden">
            {category.image ? (
              <img 
                src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000' || 'https://3e3f35c1758a.ngrok-free.app'  }${category.image}`}
                alt={category.name}
                className="w-8 h-8 object-cover rounded-lg"
                onError={(e) => {
                  console.error('❌ Failed to load category image:', category.image);
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const fallback = document.createElement('span');
                    fallback.className = 'text-white text-lg';
                    fallback.textContent = '🍽️';
                    parent.appendChild(fallback);
                  }
                }}
                onLoad={() => console.log('✅ Category image loaded:', category.image)}
              />
            ) : (
              <span className="text-white text-lg">🍽️</span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-100 neon-text">
            {category.name}
          </h2>
        </div>
        {category.description && (
          <p className="text-gray-400 text-lg leading-relaxed max-w-2xl">
            {category.description}
          </p>
        )}
      </div>

      {/* Сетка блюд с современным дизайном для темной темы */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {category.items.map((item: MenuItemType, index: number) => (
          <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
            <MenuItem 
              item={item} 
              onSelect={onItemSelect}
              onNavigateToDetails={onNavigateToDetails}
            />
          </div>
        ))}
      </div>
    </div>
  );
}; 