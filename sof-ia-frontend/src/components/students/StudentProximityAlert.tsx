import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Calendar, X, Check } from 'lucide-react';
import Button from '@/components/common/Button';
import { StudentProximityAlert } from '@/types';
import { NotificationService } from '@/services/notification.service';
import { useTheme } from '@/components/layout/MainLayout';

interface StudentProximityAlertProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: StudentProximityAlert[];
}

const StudentProximityAlert: React.FC<StudentProximityAlertProps> = ({
  isOpen,
  onClose,
  alerts
}) => {
  const { isDarkMode } = useTheme();
  const [selectedAlert, setSelectedAlert] = useState<StudentProximityAlert | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  /**
   * Maneja el clic en una alerta
   */
  const handleAlertClick = (alert: StudentProximityAlert) => {
    setSelectedAlert(alert);
  };

  /**
   * Maneja el cierre de alerta específica
   */
  const handleDismissAlert = async (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
    
    // Marcar notificación como leída en el servicio
    try {
      await NotificationService.markAsRead(alertId);
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  /**
   * Maneja el cierre de todas las alertas
   */
  const handleDismissAll = async () => {
    const alertIds = alerts.map(alert => alert.id);
    setDismissedAlerts(new Set(alertIds));
    
    try {
      await NotificationService.markAllAsRead();
    } catch (error) {
      console.error('Error marking all alerts as read:', error);
    }
    
    onClose();
  };

  /**
   * Obtiene color según días restantes
   */
  const getSeverityColor = (dias: number): string => {
    if (dias <= 7) return 'text-danger bg-danger/10 border-danger/20';
    if (dias <= 15) return 'text-warning bg-warning/10 border-warning/20';
    return 'text-info bg-info/10 border-info/20';
  };

  /**
   * Obtiene mensaje según días restantes
   */
  const getSeverityMessage = (dias: number): string => {
    if (dias <= 7) return 'Crítico - Menos de una semana';
    if (dias <= 15) return 'Urgente - Menos de quince días';
    return 'Atención - Próximo a cumplir 6 meses';
  };

  /**
   * Obtiene icono según días restantes
   */
  const getSeverityIcon = (dias: number) => {
    if (dias <= 7) return AlertTriangle;
    if (dias <= 15) return Clock;
    return Calendar;
  };

  // Filtrar alertas no descartadas
  const activeAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));

  if (!isOpen || activeAlerts.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-university-indigo font-poppins">
                Alertas de Proximidad a 6 Meses
              </h2>
              <p className="text-sm text-gray-600 font-opensans">
                {activeAlerts.length} estudiante{activeAlerts.length !== 1 ? 's' : ''} próximo{activeAlerts.length !== 1 ? 's' : ''} a cumplir 6 meses en el sistema
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDismissAll}
              className="flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Descartar Todas
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row h-full">
          {/* Lista de alertas */}
          <div className="flex-1 overflow-y-auto max-h-[60vh]">
            <div className="p-4 space-y-3">
              {activeAlerts.map((alert) => {
                const SeverityIcon = getSeverityIcon(alert.diasRestantes);
                const severityColor = getSeverityColor(alert.diasRestantes);
                const severityMessage = getSeverityMessage(alert.diasRestantes);
                
                return (
                  <div
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className={`
                      p-4 rounded-lg border cursor-pointer transition-all duration-200
                      ${selectedAlert?.id === alert.id 
                        ? 'border-university-indigo bg-university-indigo/5 shadow-lg' 
                        : 'border-gray-200 hover:border-university-indigo hover:shadow-md'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                          ${getSeverityColor(alert.diasRestantes)}
                        `}>
                          <SeverityIcon className="w-4 h-4" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="font-medium text-university-indigo font-poppins mb-1">
                            {alert.estudianteNombre}
                          </div>
                          <div className="text-sm text-gray-600 font-opensans mb-2">
                            {alert.mensaje}
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className={severityColor}>
                              {severityMessage}
                            </span>
                            <span className="text-gray-500">
                              Fecha de inicio: {new Date(alert.fechaInicio).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-bold text-university-indigo font-poppins">
                          {alert.diasRestantes}d
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismissAlert(alert.id);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel de detalles */}
          {selectedAlert && (
            <div className="lg:w-96 border-l bg-gray-50 p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-university-indigo font-poppins mb-3">
                    Detalles del Estudiante
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">Nombre:</span>
                      <p className="font-medium text-university-indigo font-poppins">
                        {selectedAlert.estudianteNombre}
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-600">Tiempo en el sistema:</span>
                      <p className="text-lg font-bold text-university-indigo font-poppins">
                        {selectedAlert.diasRestantes} días para cumplir 6 meses
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-600">Fecha de inicio:</span>
                      <p className="font-medium">
                        {new Date(selectedAlert.fechaInicio).toLocaleDateString('es-CO', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-600">Fecha cumplimiento 6 meses:</span>
                      <p className="font-medium text-university-indigo font-poppins">
                        {new Date(
                          new Date(selectedAlert.fechaInicio).getTime() + (6 * 30 * 24 * 60 * 60 * 1000)
                        ).toLocaleDateString('es-CO', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-university-indigo font-poppins mb-3">
                    Acciones Recomendadas
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Programar cita de seguimiento</p>
                        <p className="text-xs text-gray-600">
                          Agendar una cita antes de cumplir los 6 meses para evaluar progreso
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Actualizar información de contacto</p>
                        <p className="text-xs text-gray-600">
                          Verificar que los datos del estudiante estén actualizados
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Revisar documentos</p>
                        <p className="text-xs text-gray-600">
                          Asegurar que toda la documentación esté completa y vigente
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    variant="primary"
                    onClick={() => {
                      // Aquí podríamos implementar acción específica como agendar cita
                    }}
                    className="w-full"
                  >
                    Agendar Cita de Seguimiento
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentProximityAlert;