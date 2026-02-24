import React from 'react';
import { useTheme } from '@/components/layout/MainLayout';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  headerAction?: React.ReactNode;
  actions?: React.ReactNode;
  padding?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  title, 
  subtitle,
  className = '',
  headerAction,
  actions,
  padding = true,
  ...props 
}) => {
  const { isDarkMode } = useTheme();

  return (
    <div 
      className={`rounded-lg shadow-md border transition-colors duration-200 hover:shadow-lg ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-100'
      } ${padding ? 'p-6' : ''} ${className}`}
      {...props}
    >
      {(title || subtitle || headerAction || actions) && (
        <div className="flex justify-between items-start mb-4">
          <div>
            {title && (
              <h3 className={`text-lg font-semibold font-poppins ${isDarkMode ? 'text-white' : 'text-university-indigo'}`}>{title}</h3>
            )}
            {subtitle && (
              <p className={`text-sm mt-1 font-opensans ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            {actions}
          </div>
        </div>
      )}
      
      <div className="font-opensans">{children}</div>
    </div>
  );
};

export default Card;
