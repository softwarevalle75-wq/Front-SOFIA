import React from 'react';
import { useTheme } from '@/components/layout/MainLayout';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'md',
  className = '',
  variant
}) => {
  const { isDarkMode } = useTheme();

  const getStyles = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    
    if (statusLower.includes('activo') && !statusLower.includes('inactivo')) {
      return isDarkMode 
        ? 'bg-green-900/50 text-green-300 border border-green-700' 
        : 'bg-green-100 text-green-800';
    }
    if (statusLower.includes('inactivo')) {
      return isDarkMode 
        ? 'bg-gray-700 text-gray-300 border border-gray-600' 
        : 'bg-gray-100 text-gray-800';
    }
    if (statusLower.includes('pendiente')) {
      return isDarkMode 
        ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' 
        : 'bg-yellow-100 text-yellow-800';
    }
    if (statusLower.includes('completad')) {
      return isDarkMode 
        ? 'bg-blue-900/50 text-blue-300 border border-blue-700' 
        : 'bg-blue-100 text-blue-800';
    }
    if (statusLower.includes('elimin')) {
      return isDarkMode 
        ? 'bg-red-900/50 text-red-300 border border-red-700' 
        : 'bg-red-100 text-red-800';
    }
    if (statusLower.includes('leído') || statusLower.includes('leido')) {
      return isDarkMode 
        ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700' 
        : 'bg-indigo-100 text-indigo-800';
    }
    if (statusLower.includes('no leído') || statusLower.includes('no leido')) {
      return isDarkMode 
        ? 'bg-orange-900/50 text-orange-300 border border-orange-700' 
        : 'bg-orange-100 text-orange-800';
    }
    
    return isDarkMode 
      ? 'bg-gray-700 text-gray-300 border border-gray-600' 
      : 'bg-gray-100 text-gray-800';
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm'
  };

  return (
    <span className={`
      inline-flex items-center rounded-full font-medium
      ${getStyles(status)}
      ${sizes[size]}
      ${className}
    `}>
      {status}
    </span>
  );
};

export default StatusBadge;
