import React, { useState, useEffect } from 'react';
import { Bell, Search, Filter, Check, Trash2, CheckCircle, AlertCircle, Calendar, User, Bot, Settings, FileSpreadsheet, FileText, Camera, X } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import SearchBar from '@/components/common/SearchBar';
import { Notification } from '@/types';
import { NotificationService } from '@/services/notification.service';
import { exportService } from '@/services/exportService';
import { useTheme } from '@/components/layout/MainLayout';

const NotificacionesPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await NotificationService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIconByType = (tipo: string) => {
    switch (tipo) {
      case 'student': return <User className="w-5 h-5" />;
      case 'cita': return <Calendar className="w-5 h-5" />;
      case 'system': return <Settings className="w-5 h-5" />;
      case 'audit': return <Bot className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case 'high': return 'text-red-500 bg-red-100';
      case 'medium': return 'text-yellow-500 bg-yellow-100';
      case 'low': return 'text-blue-500 bg-blue-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'student': return 'Estudiante';
      case 'cita': return 'Cita';
      case 'system': return 'Sistema';
      case 'audit': return 'Auditoría';
      default: return tipo;
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await NotificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  };

  const handleMarkAllAsRead = async () => {
    await NotificationService.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
  };

  const handleDelete = async (id: string) => {
    await NotificationService.deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleExportExcel = () => {
    const data = notifications.map(n => ({
      Título: n.titulo,
      Mensaje: n.mensaje,
      Tipo: getTipoLabel(n.tipo),
      Prioridad: n.prioridad,
      Estado: n.leida ? 'Leída' : 'No leída',
      Fecha: NotificationService.formatRelativeDate(n.fecha)
    }));
    exportService.toExcel(data, 'notificaciones', 'Notificaciones');
  };

  const handleExportPDF = () => {
    const data = notifications.map(n => ({
      Título: n.titulo,
      Tipo: n.tipo,
      Prioridad: n.prioridad,
      Estado: n.leida ? 'Leída' : 'No leída',
      Fecha: NotificationService.formatRelativeDate(n.fecha)
    }));
    exportService.toPDF(data, 'notificaciones', 'Lista de Notificaciones - SOF-IA');
  };

  const handleExportPNG = () => {
    const element = document.getElementById('notificaciones-table');
    if (element) {
      exportService.toPNGElement(element, 'notificaciones');
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = !searchQuery || 
      n.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.mensaje.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTipo = !filtroTipo || n.tipo === filtroTipo;
    const matchesPrioridad = !filtroPrioridad || n.prioridad === filtroPrioridad;
    const matchesEstado = !filtroEstado || 
      (filtroEstado === 'leida' && n.leida) || 
      (filtroEstado === 'no-leida' && !n.leida);
    return matchesSearch && matchesTipo && matchesPrioridad && matchesEstado;
  });

  const unreadCount = notifications.filter(n => !n.leida).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold font-poppins ${isDarkMode ? 'text-white' : 'text-indigo-600'}`}>
            Notificaciones
          </h1>
          <p className={`mt-1 font-opensans ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {unreadCount > 0 ? `Tienes ${unreadCount} notificaciones sin leer` : 'Estás al día con tus notificaciones'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportExcel} className="flex items-center gap-1">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportPDF} className="flex items-center gap-1">
            <FileText className="w-4 h-4" /> PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportPNG} className="flex items-center gap-1">
            <Camera className="w-4 h-4" /> Imagen
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1">
            <SearchBar
              placeholder="Buscar notificaciones..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
            >
              <option value="">Todos los tipos</option>
              <option value="student">Estudiante</option>
              <option value="cita">Cita</option>
              <option value="system">Sistema</option>
              <option value="audit">Auditoría</option>
            </select>
            <select
              value={filtroPrioridad}
              onChange={(e) => setFiltroPrioridad(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
            >
              <option value="">Todas las prioridades</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
            >
              <option value="">Todos los estados</option>
              <option value="no-leida">No leídas</option>
              <option value="leida">Leídas</option>
            </select>
          </div>
        </div>

        {unreadCount > 0 && (
          <div className="mb-4">
            <Button variant="secondary" size="sm" onClick={handleMarkAllAsRead}>
              <Check className="w-4 h-4 mr-1" />
              Marcar todas como leídas
            </Button>
          </div>
        )}

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`h-20 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`} />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No hay notificaciones
            </p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              Las notificaciones aparecerán aquí cuando ocurran eventos
            </p>
          </div>
        ) : (
          <div id="notificaciones-table" className="space-y-3">
            {filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                  isDarkMode 
                    ? notification.leida ? 'bg-gray-800 border-gray-700' : 'bg-gray-700 border-gray-600'
                    : notification.leida ? 'bg-white border-gray-200' : 'bg-indigo-50 border-indigo-200'
                } ${!notification.leida ? 'border-l-4' : ''} ${
                  notification.prioridad === 'high' ? 'border-l-red-500' : 
                  notification.prioridad === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  notification.tipo === 'student' ? 'bg-purple-100 text-purple-600' :
                  notification.tipo === 'cita' ? 'bg-green-100 text-green-600' :
                  notification.tipo === 'system' ? 'bg-gray-100 text-gray-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {getIconByType(notification.tipo)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {notification.titulo}
                      </h3>
                      <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {notification.mensaje}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {NotificationService.formatRelativeDate(notification.fecha)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          notification.prioridad === 'high' ? 'bg-red-100 text-red-700' :
                          notification.prioridad === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {notification.prioridad === 'high' ? 'Alta' : notification.prioridad === 'medium' ? 'Media' : 'Baja'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {getTipoLabel(notification.tipo)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.leida && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            isDarkMode ? 'hover:bg-gray-600 text-green-400' : 'hover:bg-green-50 text-green-600'
                          }`}
                          title="Marcar como leída"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          isDarkMode ? 'hover:bg-gray-600 text-red-400' : 'hover:bg-red-50 text-red-600'
                        }`}
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default NotificacionesPage;
