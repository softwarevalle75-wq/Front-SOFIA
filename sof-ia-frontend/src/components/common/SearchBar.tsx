import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useTheme } from '@/components/layout/MainLayout';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch,
  value: controlledValue,
  onChange,
  placeholder = 'Buscar...',
  className = '',
  debounceMs = 300
}) => {
  const { isDarkMode } = useTheme();
  const [debouncedValue, setDebouncedValue] = useState(controlledValue || '');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    if (onChange) {
      onChange(newValue);
    }
    
    if (onSearch) {
      setDebouncedValue(newValue);
    }
  };

  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (debounceTimer && debouncedValue !== (controlledValue || '')) {
      const timer = setTimeout(() => {
        if (onSearch) {
          onSearch(debouncedValue);
        }
      }, debounceMs);
      
      setDebounceTimer(timer);
    }
  }, [debouncedValue, controlledValue, onSearch, debounceMs, debounceTimer]);

  useEffect(() => {
    setDebouncedValue(controlledValue || '');
  }, [controlledValue]);

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
      </div>
      
      <input
        type="text"
        value={controlledValue || ''}
        onChange={handleSearchChange}
        placeholder={placeholder}
        className={`
          block w-full pl-10 pr-3 py-2 border rounded-md 
          leading-5 sm:text-sm
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          transition-colors duration-200
          ${isDarkMode 
            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
            : 'border-gray-300 bg-white placeholder-gray-500'
          }
        `}
      />
    </div>
  );
};

export default SearchBar;
