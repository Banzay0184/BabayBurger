import React from 'react';
import type { TelegramUser } from '../../types/telegram';

interface TelegramUserInfoProps {
  user: TelegramUser;
  className?: string;
}

export const TelegramUserInfo: React.FC<TelegramUserInfoProps> = ({ 
  user, 
  className = '' 
}) => {
  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <h3 className="font-semibold text-blue-900 mb-3">
        Данные пользователя Telegram:
      </h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-blue-700 font-medium">ID:</span>
          <span className="text-blue-900">{user.id}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-blue-700 font-medium">Имя:</span>
          <span className="text-blue-900">{user.first_name}</span>
        </div>
        
        {user.last_name && (
          <div className="flex justify-between">
            <span className="text-blue-700 font-medium">Фамилия:</span>
            <span className="text-blue-900">{user.last_name}</span>
          </div>
        )}
        
        {user.username && (
          <div className="flex justify-between">
            <span className="text-blue-700 font-medium">Username:</span>
            <span className="text-blue-900">@{user.username}</span>
          </div>
        )}
        
        {user.language_code && (
          <div className="flex justify-between">
            <span className="text-blue-700 font-medium">Язык:</span>
            <span className="text-blue-900">{user.language_code}</span>
          </div>
        )}
        
        {user.is_premium !== undefined && (
          <div className="flex justify-between">
            <span className="text-blue-700 font-medium">Premium:</span>
            <span className="text-blue-900">{user.is_premium ? 'Да' : 'Нет'}</span>
          </div>
        )}
      </div>
    </div>
  );
}; 