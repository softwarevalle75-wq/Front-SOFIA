import React from 'react';
import { useTheme } from '@/components/layout/MainLayout';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'outline' | 'accent' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  type = 'button',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon,
  className = '',
  ...props 
}) => {
  const { isDarkMode } = useTheme();

  const baseStyles = 'font-medium rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';
  
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white font-poppins shadow-md hover:shadow-lg',
    accent: 'bg-yellow-500 hover:bg-yellow-600 text-indigo-900 font-poppins font-semibold shadow-md hover:shadow-lg',
    secondary: isDarkMode 
      ? 'bg-gray-700 hover:bg-gray-600 text-white font-poppins border border-gray-600' 
      : 'bg-gray-100 hover:bg-gray-200 text-gray-800 font-poppins border border-gray-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white font-poppins shadow-md',
    success: 'bg-green-600 hover:bg-green-700 text-white font-poppins shadow-md',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white font-poppins shadow-md',
    outline: isDarkMode 
      ? 'border-2 border-indigo-400 text-indigo-300 hover:bg-indigo-600 hover:text-white font-poppins' 
      : 'border-2 border-indigo-600 text-indigo-700 hover:bg-indigo-600 hover:text-white font-poppins',
    ghost: isDarkMode 
      ? 'text-indigo-300 hover:bg-gray-700 font-poppins' 
      : 'text-indigo-600 hover:bg-indigo-50 font-poppins'
  };

  const sizes: Record<ButtonSize, string> = {
    sm: 'py-1.5 px-3 text-sm',
    md: 'py-2 px-4 text-base',
    lg: 'py-3 px-6 text-lg'
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      
      {!loading && icon && <span>{icon}</span>}
      
      {children}
    </button>
  );
};

export default Button;
