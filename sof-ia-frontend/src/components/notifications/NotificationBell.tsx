import React, { useState, useEffect } from 'react';
import { Bell, X, Check, AlertTriangle, Info, Bot } from 'lucide-react';
import Button from '@/components/common/Button';
import { Notification } from '@/types';
import { NotificationService } from '@/services/notification.service';
import { useTheme } from '@/components/layout/MainLayout';

interface NotificationBellProps {
  onOpenHistory: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onOpenHistory }) => {
  const { isDarkMode } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * Carga notificaciones
   */
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const notifs = await NotificationService.getNotifications();
      setNotifications(notifs);
      
      const unread = await NotificationService.getUnreadCount();
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Marca notificación como leída
   */
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);
      
      // Actualizar estado local
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, leida: true } 
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  /**
   * Marca todas como leídas
   */
  const handleMarkAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, leida: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  /**
   * Elimina notificación
   */
  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      await NotificationService.deleteNotification(notificationId);
      
      // Actualizar estado local
      const deletedNotif = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      
      if (!deletedNotif?.leida) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  /**
   * Cierra el dropdown
   */
  const handleClose = () => {
    setIsOpen(false);
  };

  // Efecto para cargar notificaciones al montar
  useEffect(() => {
    loadNotifications();
    
    // Recargar cada 30 segundos
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Obtiene ícono según tipo de notificación
   */
  const getNotificationIcon = (tipo: Notification['tipo']) => {
    switch (tipo) {
      case 'audit': return <Bot className="w-4 h-4" />;
      case 'system': return <Info className="w-4 h-4" />;
      case 'student': return <AlertTriangle className="w-4 h-4" />;
      case 'cita': return <Bell className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  /**
   * Obtiene color según prioridad
   */
  const getPriorityBorderColor = (prioridad: Notification['prioridad']): string => {
    switch (prioridad) {
      case 'high': return 'border-l-4 border-l-danger';
      case 'medium': return 'border-l-4 border-l-warning';
      case 'low': return 'border-l-4 border-l-info';
      default: return 'border-l-4 border-l-gray-300';
    }
  };

  return (
    <div className="relative">
      {/* Botón de notificaciones */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-50 rounded-lg transition-colors group"
        title="Notificaciones"
      >
        <Bell className={`w-5 h-5 ${loading ? 'animate-pulse' : ''} text-gray-600 group-hover:text-university-indigo transition-colors`} />
        
        {/* Badge de contador */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-danger text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de notificaciones */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={handleClose}
          />

          {/* Panel de notificaciones */}
          <div className={`absolute right-0 mt-2 w-96 rounded-lg shadow-2xl border z-50 max-h-96 overflow-hidden ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-600' 
              : 'bg-white border-gray-200'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-university-indigo" />
                <h3 className="font-semibold text-university-indigo font-poppins">
                  Notificaciones
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-university-indigo text-white text-xs font-bold px-2 py-1 rounded-full">
                    {unreadCount} nueva{unreadCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs"
                  >
                    Marcar todas como leídas
                  </Button>
                )}
                
                <button
                  onClick={onOpenHistory}
                  className="text-university-indigo hover:text-university-indigo/80 text-sm font-medium"
                >
                  Ver historial completo →
                </button>
              </div>
            </div>

            {/* Lista de notificaciones */}
            <div className="overflow-y-auto max-h-80">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-university-indigo"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No tienes notificaciones</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`
                        p-4 hover:bg-gray-50 transition-colors cursor-pointer
                        ${!notification.leida ? 'bg-university-indigo/5' : ''}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icono y borde de prioridad */}
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                          ${NotificationService.getPriorityColor(notification.prioridad)}
                        `}>
                          {getNotificationIcon(notification.tipo)}
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm text-gray-900 mb-1">
                                {notification.titulo}
                              </p>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {notification.mensaje}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              {!notification.leida && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notification.id);
                                  }}
                                  className="text-university-indigo hover:text-university-indigo/80"
                                  title="Marcar como leída"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              
                              <button
                                onClick={(e) => handleDeleteNotification(notification.id, e)}
                                className="text-gray-400 hover:text-danger transition-colors"
                                title="Eliminar notificación"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs ${NotificationService.getPriorityColor(notification.prioridad)}`}>
                              {notification.prioridad.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {NotificationService.formatRelativeDate(notification.fecha)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;