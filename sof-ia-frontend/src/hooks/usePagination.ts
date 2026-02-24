import { useState } from 'react';
import { PaginationParams } from '@/types';

/**
 * Hook para manejar paginación
 */
export const usePagination = (initialPageSize: number = 10) => {
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    pageSize: initialPageSize,
  });

  const setPage = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const setPageSize = (pageSize: number) => {
    setPagination({ page: 1, pageSize });
  };

  const reset = () => {
    setPagination({ page: 1, pageSize: initialPageSize });
  };

  return {
    pagination,
    setPage,
    setPageSize,
    reset,
  };
};