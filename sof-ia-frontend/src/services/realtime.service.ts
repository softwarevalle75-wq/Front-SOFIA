import { RealtimeUpdate } from '@/types';

/**
 * Servicio de actualizaciones en tiempo real
 * Simulación de WebSocket para desarrollo - tu compañero implementará WebSocket real
 */
export class RealtimeService {
  private static instance: RealtimeService | null = null;
  private static subscribers: Map<string, (update: RealtimeUpdate) => void> = new Map();
  private static pollInterval: NodeJS.Timeout | null = null;
  private static reconnectAttempts = 0;
  private static maxReconnectAttempts = 5;
  private static reconnectDelay = 5000; // 5 segundos

  /**
   * Obtiene instancia singleton
   */
  static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  /**
   * Inicia conexión en tiempo real
   */
  connect(): void {
    this.startPolling();
  }

  /**
   * Desconecta y limpia recursos
   */
  disconnect(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    this.subscribers.clear();
    this.reconnectAttempts = 0;
  }

  /**
   * Suscribe a actualizaciones de un tipo específico
   */
  subscribe(type: RealtimeUpdate['type'], callback: (update: RealtimeUpdate) => void): string {
    const subscriberId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.subscribers.set(subscriberId, callback);
    
    return subscriberId;
  }

  /**
   * Cancela suscripción
   */
  unsubscribe(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
  }

  /**
   * Inicia polling para simulación
   */
  private startPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    this.pollInterval = setInterval(() => {
      this.simulateRealtimeUpdate();
    }, 5000); // Polling cada 5 segundos
  }

  /**
   * Simula actualizaciones en tiempo real
   */
  private simulateRealtimeUpdate(): void {
    const types: RealtimeUpdate['type'][] = ['stats', 'citas', 'students', 'notifications'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    let update: RealtimeUpdate;

    switch (randomType) {
      case 'stats':
        update = this.generateStatsUpdate();
        break;
      
      case 'citas':
        update = this.generateCitasUpdate();
        break;
      
      case 'students':
        update = this.generateStudentsUpdate();
        break;
      
      case 'notifications':
        update = this.generateNotificationsUpdate();
        break;
      
      default:
        update = this.generateStatsUpdate();
    }

    this.notifySubscribers(update);
  }

  /**
   * Genera actualización de estadísticas
   */
  private generateStatsUpdate(): RealtimeUpdate {
    const changeTypes = ['new_user', 'new_consulta', 'new_cita', 'cancelled_cita'];
    const changeType = changeTypes[Math.floor(Math.random() * changeTypes.length)];
    
    let data: any;
    let message: string;

    switch (changeType) {
      case 'new_user':
        data = {
          totalUsuarios: Math.floor(Math.random() * 100) + 9000,
          totalConsultas: Math.floor(Math.random() * 500) + 30000
        };
        message = 'Nuevo usuario registrado en el sistema';
        break;
      
      case 'new_consulta':
        data = {
          totalConsultas: Math.floor(Math.random() * 100) + 30000
        };
        message = 'Nueva consulta realizada por estudiante';
        break;
      
      case 'new_cita':
        data = {
          citasAgendadas: Math.floor(Math.random() * 20) + 1800
        };
        message = 'Nueva cita agendada';
        break;
      
      case 'cancelled_cita':
        data = {
          citasAgendadas: Math.floor(Math.random() * 10) - 5 + 1800
        };
        message = 'Cita cancelada por estudiante';
        break;
      
      default:
        data = {};
        message = 'Actualización del sistema';
    }

    return {
      type: 'stats',
      data,
      timestamp: new Date().toISOString(),
      message
    };
  }

  /**
   * Genera actualización de citas
   */
  private generateCitasUpdate(): RealtimeUpdate {
    const actions = ['created', 'updated', 'cancelled', 'completed'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    const data = {
      id: `cita_${Date.now()}`,
      estudianteId: `student_${Math.floor(Math.random() * 100)}`,
      accion: action,
      timestamp: new Date().toISOString()
    };

    return {
      type: 'citas',
      data,
      timestamp: new Date().toISOString(),
      message: `Cita ${action}: ${data.id}`
    };
  }

  /**
   * Genera actualización de estudiantes
   */
  private generateStudentsUpdate(): RealtimeUpdate {
    const actions = ['created', 'updated', 'status_change', 'deleted'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    const data = {
      studentId: `student_${Math.floor(Math.random() * 100)}`,
      action: action,
      timestamp: new Date().toISOString()
    };

    return {
      type: 'students',
      data,
      timestamp: new Date().toISOString(),
      message: `Estudiante ${action}: ${data.studentId}`
    };
  }

  /**
   * Genera actualización de notificaciones
   */
  private generateNotificationsUpdate(): RealtimeUpdate {
    const types = ['info', 'warning', 'error', 'success'];
    const type = types[Math.floor(Math.random() * types.length)];
    const priorities = ['low', 'medium', 'high'];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    
    const data = {
      id: `notif_${Date.now()}`,
      title: this.generateNotificationTitle(type),
      message: this.generateNotificationMessage(type, priority),
      type,
      priority,
      timestamp: new Date().toISOString(),
      read: false
    };

    return {
      type: 'notifications',
      data,
      timestamp: new Date().toISOString(),
      message: `Notificación: ${data.title}`
    };
  }

  /**
   * Genera título de notificación
   */
  private generateNotificationTitle(type: string): string {
    const titles = {
      info: ['Información del Sistema', 'Actualización', 'Recordatorio', 'Aviso'],
      warning: ['Alerta de Sistema', 'Advertencia', 'Precaución', 'Atención'],
      error: ['Error Crítico', 'Fallo del Sistema', 'Problema Detectado', 'Error'],
      success: ['Operación Exitosa', 'Completado', 'Éxito', 'Confirmación']
    };

    const typeTitles = titles[type];
    return typeTitles[Math.floor(Math.random() * typeTitles.length)];
  }

  /**
   * Genera mensaje de notificación
   */
  private generateNotificationMessage(type: string, priority: string): string {
    const messages = {
      info: [
        'El sistema ha sido actualizado con nuevas funcionalidades',
        'Recordatorio: Es hora de revisar las tareas pendientes',
        'Nuevas características disponibles en el dashboard',
        'Se ha completado el proceso de sincronización'
      ],
      warning: [
        'Uso elevado del sistema detectado',
        'Se requiere atención: espacio de almacenamiento casi lleno',
        'Actualización de seguridad disponible',
        'Algunos estudiantes requieren atención'
      ],
      error: [
        'Error al procesar solicitud de estudiante',
        'Fallo en la conexión con la base de datos',
        'Error crítico en el módulo de pagos',
        'Sistema temporalmente no disponible'
      ],
      success: [
        'Nuevo estudiante registrado exitosamente',
        'Cita agendada correctamente',
        'Importación de datos completada',
        'Copia de seguridad creada exitosamente'
      ]
    };

    const typeMessages = messages[type];
    const baseMessage = typeMessages[Math.floor(Math.random() * typeMessages.length)];

    const priorityModifiers = {
      low: ' - Revisión general',
      medium: ' - Requerida atención',
      high: ' - Crítico - Acción inmediata'
    };

    return baseMessage + (priorityModifiers[priority as keyof typeof priorityModifiers] || '');
  }

  /**
   * Notifica a todos los suscriptores
   */
  private notifySubscribers(update: RealtimeUpdate): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(update);
      } catch (error) {
        // Error silencioso en callback del suscriptor
      }
    });
  }

  /**
   * Envia actualización manual (para pruebas)
   */
  sendManualUpdate(type: RealtimeUpdate['type'], data: any): void {
    const update: RealtimeUpdate = {
      type,
      data,
      timestamp: new Date().toISOString(),
      message: `Actualización manual de tipo: ${type}`
    };

    this.notifySubscribers(update);
  }

  /**
   * Verifica estado de conexión
   */
  getConnectionStatus(): {
    connected: boolean;
    lastUpdate: string;
    reconnectAttempts: number;
  } {
    return {
      connected: this.pollInterval !== null,
      lastUpdate: new Date().toISOString(),
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Intenta reconexión automática
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      
      setTimeout(() => {
        this.startPolling();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  /**
   * Configura opciones para WebSocket real
   */
  configureWebSocket(): void {
    // Tu compañero implementará configuración real de WebSocket
    // Configuración pendiente
  }

  /**
   * Obtiene estadísticas de conexión
   */
  getConnectionStats(): {
    uptime: number;
    subscribersCount: number;
    lastUpdate: string;
    reconnectAttempts: number;
    status: string;
  } {
    const now = new Date();
    const uptime = this.pollInterval ? Date.now() - this.reconnectAttempts * this.reconnectDelay : 0;
    
    return {
      uptime: Math.floor(uptime / 1000),
      subscribersCount: this.subscribers.size,
      lastUpdate: now.toISOString(),
      reconnectAttempts: this.reconnectAttempts,
      status: this.getConnectionStatus().connected ? 'connected' : 'disconnected'
    };
  }

  /**
   * Limpia todas las suscripciones
   */
  clearSubscribers(): void {
    this.subscribers.clear();
  }

  /**
   * Fuerza actualización inmediata
   */
  forceUpdate(): void {
    this.simulateRealtimeUpdate();
  }
}

export default RealtimeService;