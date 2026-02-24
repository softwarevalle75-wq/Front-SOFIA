import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useTheme } from '@/components/layout/MainLayout';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  helperText?: string;
}

const Input: React.FC<InputProps> = ({ 
  label,
  type = 'text',
  name,
  error,
  required = false,
  disabled = false,
  className = '',
  icon: Icon,
  helperText,
  ...props
}) => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label 
          htmlFor={name} 
          className={`block text-sm font-medium font-poppins mb-1 ${isDarkMode ? 'text-gray-300' : 'text-university-indigo'}`}
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
          </div>
        )}
        
        <input
          type={type}
          id={name}
          name={name}
          disabled={disabled}
          required={required}
          className={`
            w-full px-3 py-2 border rounded-md font-opensans
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
            ${Icon ? 'pl-10' : ''}
            ${error 
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
              : isDarkMode 
                ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                : 'border-gray-300 bg-white'
            }
            ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}
            transition-colors duration-200
          `}
          {...props}
        />
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      
      {helperText && !error && (
        <p className={`mt-1 text-sm font-opensans ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{helperText}</p>
      )}
    </div>
  );
};

export default Input;
