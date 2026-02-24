import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '@/services/auth.service';

/**
 * Componente de ruta protegida
 * Redirige al login si no hay autenticación
 */
const ProtectedRoute: React.FC = () => {
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;