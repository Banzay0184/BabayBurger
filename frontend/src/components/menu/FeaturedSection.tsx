import React from 'react';
import { MenuItem } from './MenuItem';
import type { MenuItem as MenuItemType, SizeOption, AddOn } from '../types/menu';

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
      <div className="flex items-center space-x-3 mb-6">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-2xl font-bold text-text-primary">
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {items.map((item) => (
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