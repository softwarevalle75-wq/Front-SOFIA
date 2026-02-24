import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useTheme } from '@/components/layout/MainLayout';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  subtitle?: string | React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBgColor,
  subtitle,
  trend
}) => {
  const { isDarkMode } = useTheme();

  const iconStyle = isDarkMode 
    ? { color: '#1f2937', backgroundColor: '' }
    : { color: '#ffffff', backgroundColor: '' };

  return (
    <div className={`rounded-lg shadow-md p-6 border transition-colors duration-200 hover:shadow-lg ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-100'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`text-sm font-medium font-poppins ${isDarkMode ? 'text-gray-300' : 'text-university-indigo'}`}>{title}</p>
          <p className={`text-3xl font-bold mt-2 font-poppins ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          
          {subtitle && (
            <div className={`text-xs mt-1 font-opensans ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{subtitle}</div>
          )}
          
          {trend && (
            <div className="flex items-center mt-2">
              <span className={`text-sm font-medium font-poppins ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className={`text-xs ml-2 font-opensans ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>vs mes anterior</span>
            </div>
          )}
        </div>
        
        <div className={`${iconBgColor || (isDarkMode ? 'bg-indigo-700' : 'bg-indigo-500')} p-3 rounded-lg shadow-sm`}>
          <Icon className="w-8 h-8" style={{ color: iconStyle.color }} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
