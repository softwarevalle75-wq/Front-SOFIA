import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import LoginPage from '@/features/auth/LoginPage';
import ChangePasswordPage from '@/features/auth/components/ChangePasswordPage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import ChatHistoryPage from '@/features/chat-history/ChatHistoryPage';
import SurveysPage from '@/features/surveys/SurveysPage';
import StudentsPage from '@/features/students/StudentsPage';
import HistorialPage from '@/features/historial/HistorialPage';
import NotificacionesPage from '@/features/notifications/NotificacionesPage';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';

export const router = createBrowserRouter([
  // Rutas públicas - solo accesibles si NO hay sesión
  {
    element: <PublicRoute />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/change-password',
        element: <ChangePasswordPage />,
      },
    ],
  },
  
  // Rutas protegidas - requieren sesión activa
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout><Outlet /></MainLayout>,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'chat-history',
            element: <ChatHistoryPage />,
          },
          {
            path: 'surveys',
            element: <SurveysPage />,
          },
          {
            path: 'students',
            element: <StudentsPage />,
          },
          {
            path: 'historial',
            element: <HistorialPage />,
          },
          {
            path: 'notificaciones',
            element: <NotificacionesPage />,
          },
        ],
      },
    ],
  },
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);
