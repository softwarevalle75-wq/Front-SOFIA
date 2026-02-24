import React from 'react';
import { useTheme } from '@/components/layout/MainLayout';

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  currentPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
}

const Table = <T,>({ 
  columns, 
  data, 
  loading = false, 
  emptyMessage = 'No hay datos disponibles',
  pageSize = 10,
  currentPage = 1,
  totalItems,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  rowClassName
}: TableProps<T>) => {
  const { isDarkMode } = useTheme();
  const dataLength = totalItems ?? data.length;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, dataLength);
  const currentData = data.slice(startIndex, endIndex);

  return (
    <div className="overflow-x-auto">
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Cargando...</p>
        </div>
      ) : currentData.length === 0 ? (
        <div className="text-center py-8">
          <p className={isDarkMode ? 'text-gray-500' : 'text-gray-500'}>{emptyMessage}</p>
        </div>
      ) : (
        <>
          <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
            <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                {columns.map((column, index) => (
                  <th key={column.key} className={`${column.width || ''} px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} divide-y ${isDarkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
              {currentData.map((row, rowIndex) => (
                <tr 
                  key={rowIndex} 
                  className={rowClassName ? rowClassName(row) : `${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} cursor-pointer`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((column, colIndex) => (
                    <td key={column.key} className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      {column.render ? column.render(row) : (
                        <span>{row[column.key as keyof T]}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className={`flex items-center justify-between px-6 py-3 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
              Mostrando {Math.min(currentData.length, dataLength)} de {dataLength} resultados
            </div>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <button 
                  onClick={() => onPageChange && onPageChange(currentPage - 1)}
                  className="px-3 py-1 text-sm text-indigo-600 border border-indigo-600 rounded hover:bg-indigo-600 hover:text-white"
                >
                  Anterior
                </button>
              )}
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                Página {currentPage}
              </span>
              {endIndex < dataLength && (
                <button 
                  onClick={() => onPageChange && onPageChange(currentPage + 1)}
                  className="px-3 py-1 text-sm text-indigo-600 border border-indigo-600 rounded hover:bg-indigo-600 hover:text-white"
                >
                  Siguiente
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Table;
