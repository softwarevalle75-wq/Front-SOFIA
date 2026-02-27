import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '@/services/auth.service';

/**
 * Componente de ruta protegida
 * Redirige al login si no hay autenticación
 */
const ProtectedRoute: React.FC = () => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;

    const verifySession = async () => {
      if (!authService.isAuthenticated()) {
        if (!active) return;
        setIsAuthenticated(false);
        setIsChecking(false);
        return;
      }

      const validSession = await authService.verifyToken();
      if (!active) return;

      setIsAuthenticated(validSession);
      setIsChecking(false);
    };

    void verifySession();

    return () => {
      active = false;
    };
  }, []);

  if (isChecking) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Verificando sesion...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
