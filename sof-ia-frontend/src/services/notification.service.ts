import { Notification, AuditHistory } from '@/types';
import { apiService } from './api.service';
import { API_CONFIG } from '../config/api.config';

const NOTIFICATIONS_KEY = 'sofia_notifications';

interface NotificacionAPI {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  prioridad: string;
  leida: boolean;
  createdAt: string;
}

export class NotificationService {
  static async getNotifications(): Promise<Notification[]> {
    try {
      const response = await apiService.get<{
        success: boolean;
        data: NotificacionAPI[];
      }>(API_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE);

      if (response.success && response.data) {
        return response.data.map(n => ({
          id: n.id,
          tipo: n.tipo as Notification['tipo'],
          titulo: n.titulo,
          mensaje: n.mensaje,
          prioridad: n.prioridad as Notification['prioridad'],
          leida: n.leida,
          fecha: n.createdAt
        }));
      }
      return this.getMockNotifications();
    } catch (error) {
      return this.getMockNotifications();
    }
  }

  static async getUnreadCount(): Promise<number> {
    try {
      const response = await apiService.get<{
        success: boolean;
        data: { count: number };
      }>(API_CONFIG.ENDPOINTS.NOTIFICATIONS.COUNT);

      if (response.success && response.data) {
        return response.data.count;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  static async createNotification(notification: Omit<Notification, 'id' | 'fecha' | 'leida'>): Promise<Notification> {
    try {
      const response = await apiService.post<{
        success: boolean;
        data: NotificacionAPI;
      }>(API_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE, {
        tipo: notification.tipo,
        titulo: notification.titulo,
        mensaje: notification.mensaje,
        prioridad: notification.prioridad
      });

      if (response.success && response.data) {
        return {
          id: response.data.id,
          tipo: response.data.tipo as Notification['tipo'],
          titulo: response.data.titulo,
          mensaje: response.data.mensaje,
          prioridad: response.data.prioridad as Notification['prioridad'],
          leida: response.data.leida,
          fecha: response.data.createdAt
        };
      }
      throw new Error('Error creating notification');
    } catch (error) {
      throw error;
    }
  }

  static async markAsRead(notificationId: string): Promise<void> {
    try {
      await apiService.put<{ success: boolean }>(
        `${API_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE}/${notificationId}/leer`,
        {}
      );
    } catch (error) {
      // Silencioso
    }
  }

  static async markAllAsRead(): Promise<void> {
    try {
      await apiService.put<{ success: boolean }>(
        API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ,
        {}
      );
    } catch (error) {
      // Silencioso
    }
  }

  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      await apiService.delete<{ success: boolean }>(
        `${API_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE}/${notificationId}`
      );
    } catch (error) {
      // Silencioso
    }
  }

  static async notificarEstudianteCreado(nombre: string): Promise<void> {
    await this.createNotification({
      tipo: 'student',
      titulo: 'Nuevo Estudiante Registrado',
      mensaje: `${nombre} ha sido registrado exitosamente en el sistema`,
      prioridad: 'low'
    });
  }

  static async notificarEstudianteEditado(nombre: string): Promise<void> {
    await this.createNotification({
      tipo: 'student',
      titulo: 'Estudiante Actualizado',
      mensaje: `Los datos de ${nombre} han sido actualizados`,
      prioridad: 'low'
    });
  }

  static async notificarEstudianteEliminado(nombre: string): Promise<void> {
    await this.createNotification({
      tipo: 'student',
      titulo: 'Estudiante Eliminado',
      mensaje: `${nombre} ha sido eliminado del sistema`,
      prioridad: 'medium'
    });
  }

  static async notificarEstudianteProximo6Meses(nombre: string, diasRestantes: number): Promise<void> {
    await this.createNotification({
      tipo: 'student',
      titulo: 'Estudiante Próximo a 6 Meses',
      mensaje: `${nombre} completará 6 meses en ${diasRestantes} días. Considera realizar seguimiento.`,
      prioridad: 'medium'
    });
  }

  static async notificarCitaAgendada(estudianteNombre: string, fecha: string, hora: string, modalidad: string): Promise<void> {
    await this.createNotification({
      tipo: 'cita',
      titulo: 'Nueva Cita Agendada',
      mensaje: `${estudianteNombre} tiene cita el ${fecha} a las ${hora} (${modalidad})`,
      prioridad: 'high'
    });
  }

  static async notificarCitaCancelada(estudianteNombre: string, motivo: string): Promise<void> {
    await this.createNotification({
      tipo: 'cita',
      titulo: 'Cita Cancelada',
      mensaje: `La cita de ${estudianteNombre} ha sido cancelada. Motivo: ${motivo}`,
      prioridad: 'high'
    });
  }

  static async notificarCitaReprogramada(estudianteNombre: string, fechaAnterior: string, fechaNueva: string): Promise<void> {
    await this.createNotification({
      tipo: 'cita',
      titulo: 'Cita Reprogramada',
      mensaje: `La cita de ${estudianteNombre} ha sido reprogramada de ${fechaAnterior} a ${fechaNueva}`,
      prioridad: 'medium'
    });
  }

  static async notificarCitaHoy(estudianteNombre: string, hora: string, modalidad: string): Promise<void> {
    await this.createNotification({
      tipo: 'cita',
      titulo: 'Cita Hoy',
      mensaje: `Tienes una cita con ${estudianteNombre} hoy a las ${hora} (${modalidad})`,
      prioridad: 'high'
    });
  }

  static async getMockNotifications(): Promise<Notification[]> {
    const mockNotifications: Notification[] = [
      {
        id: 'mock-1',
        tipo: 'student',
        titulo: 'Estudiante Próximo a 6 Meses',
        mensaje: 'Ana María Rodríguez completará 6 meses en el sistema en 25 días',
        fecha: new Date().toISOString(),
        leida: false,
        prioridad: 'medium'
      },
      {
        id: 'mock-2',
        tipo: 'cita',
        titulo: 'Nueva Cita Agendada',
        mensaje: 'Carlos Pérez ha agendado una cita para mañana a las 10:00 AM',
        fecha: new Date(Date.now() - 3600000).toISOString(),
        leida: false,
        prioridad: 'high'
      },
      {
        id: 'mock-3',
        tipo: 'audit',
        titulo: 'Acción de Auditoría',
        mensaje: 'Se ha creado un nuevo estudiante en el sistema',
        fecha: new Date(Date.now() - 7200000).toISOString(),
        leida: true,
        prioridad: 'low'
      },
      {
        id: 'mock-4',
        tipo: 'system',
        titulo: 'Mantenimiento Programado',
        mensaje: 'El sistema estará en mantenimiento este domingo de 2:00 AM a 4:00 AM',
        fecha: new Date(Date.now() - 86400000).toISOString(),
        leida: true,
        prioridad: 'medium'
      }
    ];

    return new Promise(resolve => {
      setTimeout(() => resolve(mockNotifications), 300);
    });
  }

  static formatRelativeDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-CO', { 
      day: 'numeric', 
      month: 'short', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  }

  static getPriorityColor(prioridad: Notification['prioridad']): string {
    switch (prioridad) {
      case 'high': return 'text-danger bg-danger/10 border-danger/20';
      case 'medium': return 'text-warning bg-warning/10 border-warning/20';
      case 'low': return 'text-info bg-info/10 border-info/20';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  }

  static getTypeIcon(tipo: Notification['tipo']): string {
    switch (tipo) {
      case 'audit': return '📋';
      case 'system': return '⚙️';
      case 'student': return '🎓';
      case 'cita': return '📅';
      default: return '🔔';
    }
  }
}
