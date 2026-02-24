import React, { useState, useEffect } from 'react';
import { X, Filter, Download, Calendar, Clock } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { AuditHistory } from '@/types';
import { AuditService } from '@/services/audit.service';
import { useTheme } from '@/components/layout/MainLayout';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<'notifications' | 'audit'>('notifications');
  const [auditHistory, setAuditHistory] = useState<AuditHistory[]>([]);
  const [auditStats, setAuditStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Carga historial de auditoría
   */
  const loadAuditHistory = async () => {
    setLoading(true);
    try {
      const [history, stats] = await Promise.all([
        AuditService.getAuditHistory(),
        AuditService.getAuditStats()
      ]);
      
      setAuditHistory(history);
      setAuditStats(stats);
    } catch (error) {
      console.error('Error loading audit history:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Exporta historial de auditoría
   */
  const handleExportAudit = () => {
    const csvContent = [
      ['Fecha', 'Usuario', 'Acción', 'Recurso', 'Detalles', 'IP', 'Navegador'],
      ...auditHistory.map(log => [
        AuditService.formatAuditDate(log.fecha),
        log.usuario,
        AuditService.getActionDescription(log.accion),
        log.recurso,
        log.detalles,
        log.ip || 'N/A',
        log.navegador || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  /**
   * Exporta estadísticas de auditoría
   */
  const handleExportStats = () => {
    if (!auditStats) return;

    const statsContent = `
ESTADÍSTICAS DE AUDITORÍA
Generado: ${new Date().toLocaleString()}

Total de Acciones: ${auditStats.totalAcciones}
Acciones Hoy: ${auditStats.accionesHoy}
Acciones Esta Semana: ${auditStats.accionesEstaSemana}
Acciones Este Mes: ${auditStats.accionesEsteMes}
Usuario Más Activo: ${auditStats.usuarioMasActivo}

DETALLES POR PERÍODO:
• Hoy: ${auditStats.accionesHoy} acciones registradas
• Últimos 7 días: ${auditStats.accionesEstaSemana} acciones registradas
• Últimos 30 días: ${auditStats.accionesEsteMes} acciones registradas

DISTRIBUCIÓN POR USUARIO:
${auditStats.usuarioMasActivo} - Usuario más activo con más acciones registradas

Esta información ayuda a identificar patrones de uso del sistema y mantener registros de actividades administrativas para fines de auditoría y seguridad.
    `;

    const blob = new Blob([statsContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `estadisticas_auditoria_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen && activeTab === 'audit') {
      loadAuditHistory();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Panel de Control"
      size="xl"
    >
      <div className="space-y-6">
        {/* Tabs de navegación */}
        <div className={`flex space-x-1 rounded-lg p-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'notifications'
                ? isDarkMode 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-white text-indigo-600 shadow-sm'
                : isDarkMode ? 'text-gray-300 hover:text-indigo-300' : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            Notificaciones
          </button>
          
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'audit'
                ? isDarkMode 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-white text-indigo-600 shadow-sm'
                : isDarkMode ? 'text-gray-300 hover:text-indigo-300' : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            Historial de Auditoría
          </button>
        </div>

        {/* Contenido de las tabs */}
        <div className="min-h-[400px]">
          {activeTab === 'notifications' && (
            <div className="text-center py-12">
              <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-university-indigo font-poppins mb-2">
                Gestión de Notificaciones
              </h3>
              <p className="text-gray-600 font-opensans mb-4">
                Las notificaciones se gestionan desde la campana en el header principal
              </p>
              <div className="flex justify-center space-x-4">
                <div className="text-center p-4 bg-university-indigo/5 rounded-lg">
                  <Bell className="w-8 h-8 text-university-indigo mx-auto mb-2" />
                  <p className="text-sm text-university-indigo font-medium">Notificaciones</p>
                  <p className="text-xs text-gray-600">Ubicadas en el header</p>
                </div>
                <div className="text-center p-4 bg-success/5 rounded-lg">
                  <X className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-sm text-success font-medium">Configuración</p>
                  <p className="text-xs text-gray-600">Preferencias y filtros</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-6">
              {/* Estadísticas de auditoría */}
              {auditStats && !loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-university-indigo/5 border border-university-indigo/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-university-indigo font-poppins">
                      {auditStats.totalAcciones}
                    </div>
                    <div className="text-sm text-gray-600 font-opensans">Total Acciones</div>
                  </div>
                  
                  <div className="bg-success/5 border border-success/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-success font-poppins">
                      {auditStats.accionesHoy}
                    </div>
                    <div className="text-sm text-gray-600 font-opensans">Acciones Hoy</div>
                  </div>
                  
                  <div className="bg-warning/5 border border-warning/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-warning font-poppins">
                      {auditStats.accionesEstaSemana}
                    </div>
                    <div className="text-sm text-gray-600 font-opensans">Esta Semana</div>
                  </div>
                  
                  <div className="bg-info/5 border border-info/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-info font-poppins">
                      {auditStats.accionesEsteMes}
                    </div>
                    <div className="text-sm text-gray-600 font-opensans">Este Mes</div>
                  </div>
                  
                  <div className="bg-university-yellow/5 border border-university-yellow/20 rounded-lg p-4 text-center">
                    <div className="text-xl font-bold text-university-indigo font-poppins">
                      {auditStats.usuarioMasActivo.split('@')[0]}
                    </div>
                    <div className="text-sm text-gray-600 font-opensans">Usuario Más Activo</div>
                  </div>
                </div>
              )}

              {/* Tabla de historial */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-university-indigo font-poppins flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Historial de Auditoría
                  </h3>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleExportAudit}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Exportar Historial
                    </Button>
                    
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleExportStats}
                      className="flex items-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      Exportar Estadísticas
                    </Button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-university-indigo"></div>
                    <p className="text-sm text-gray-600 font-opensans mt-2">Cargando historial...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-university-indigo/5">
                        <tr>
                          <th className="px-4 py-3 text-left text-university-indigo font-medium">Fecha</th>
                          <th className="px-4 py-3 text-left text-university-indigo font-medium">Usuario</th>
                          <th className="px-4 py-3 text-left text-university-indigo font-medium">Acción</th>
                          <th className="px-4 py-3 text-left text-university-indigo font-medium">Recurso</th>
                          <th className="px-4 py-3 text-left text-university-indigo font-medium">Detalles</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {auditHistory.map((log, index) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-600">
                              {AuditService.formatAuditDate(log.fecha)}
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-university-indigo">{log.usuario}</p>
                                <p className="text-xs text-gray-500">{new Date(log.fecha).toLocaleDateString()}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${AuditService.getActionColor(log.accion)}`}>
                                {AuditService.getActionDescription(log.accion)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{log.recurso}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{log.detalles}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {auditHistory.length === 0 && (
                      <div className="text-center py-12">
                        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-opensans">No hay actividades registradas</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          
          {activeTab === 'notifications' && (
            <Button 
              variant="primary" 
              onClick={() => {
                // Aquí podríamos redirigir a configuración de notificaciones
              }}
            >
              Configurar Notificaciones
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default NotificationModal;