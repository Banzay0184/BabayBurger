import React from 'react';
import { MenuItem } from './MenuItem';
import type { MenuItem as MenuItemType, SizeOption, AddOn } from '../../types/menu';

interface FeaturedSectionProps {
  title: string;
  items: MenuItemType[];
  icon: string;
  onItemSelect?: (item: MenuItemType, size?: SizeOption, addOns?: AddOn[]) => void;
}

export const FeaturedSection: React.FC<FeaturedSectionProps> = ({ 
  title, 
  items, 
  icon, 
  onItemSelect 
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <div className="flex items-center mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center mr-4 shadow-dark-glow">
          <span className="text-white text-lg">{icon}</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-100 neon-text">
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {items.map((item, index) => (
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