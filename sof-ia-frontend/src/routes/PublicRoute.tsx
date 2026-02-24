import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '@/services/auth.service';

/**
 * Componente de ruta pública
 * Redirige al dashboard si ya hay sesión activa
 */
const PublicRoute: React.FC = () => {
  const isAuthenticated = authService.isAuthenticated();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
