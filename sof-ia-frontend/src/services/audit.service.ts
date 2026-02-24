import { AuditHistory } from '@/types';

/**
 * Servicio de registro de auditoría
 */
export class AuditService {
  
  /**
   * Registra una acción de auditoría
   */
  static async logAction(action: {
    usuario: string;
    accion: string;
    recurso: string;
    detalles: string;
  }): Promise<AuditHistory> {
    const auditLog: AuditHistory = {
      id: Date.now().toString(),
      usuario: action.usuario,
      accion: action.accion,
      recurso: action.recurso,
      fecha: new Date().toISOString(),
      detalles: action.detalles,
      ip: this.getClientIP(),
      navegador: this.getBrowserInfo()
    };

    // Mock - tu compañero conectará con backend real
    
    // Simular almacenamiento
    this.storeAuditLog(auditLog);
    
    return auditLog;
  }

  /**
   * Obtiene historial de auditoría
   */
  static async getAuditHistory(limit: number = 100, offset: number = 0): Promise<AuditHistory[]> {
    // Mock de datos de auditoría - tu compañero conectará con backend real
    const mockAuditHistory: AuditHistory[] = [
      {
        id: '1',
        usuario: 'admin@sofia.com',
        accion: 'CREAR_ESTUDIANTE',
        recurso: 'Estudiante',
        fecha: new Date(Date.now() - 3600000).toISOString(),
        detalles: 'Se creó el estudiante: Juan Pérez González (ID: 123)',
        ip: '192.168.1.100',
        navegador: 'Chrome 120.0.0.0'
      },
      {
        id: '2',
        usuario: 'admin@sofia.com',
        accion: 'MODIFICAR_ESTUDIANTE',
        recurso: 'Estudiante',
        fecha: new Date(Date.now() - 7200000).toISOString(),
        detalles: 'Se modificó el estado del estudiante: Ana María Rodríguez (ID: 456)',
        ip: '192.168.1.100',
        navegador: 'Chrome 120.0.0.0'
      },
      {
        id: '3',
        usuario: 'admin@sofia.com',
        accion: 'ELIMINAR_ESTUDIANTE',
        recurso: 'Estudiante',
        fecha: new Date(Date.now() - 10800000).toISOString(),
        detalles: 'Se eliminó el estudiante: Carlos López (ID: 789)',
        ip: '192.168.1.100',
        navegador: 'Chrome 120.0.0.0'
      },
      {
        id: '4',
        usuario: 'admin@sofia.com',
        accion: 'AGENDAR_CITA',
        recurso: 'Cita',
        fecha: new Date(Date.now() - 14400000).toISOString(),
        detalles: 'Se agendó cita para estudiante: María Fernanda Torres',
        ip: '192.168.1.100',
        navegador: 'Chrome 120.0.0.0'
      },
      {
        id: '5',
        usuario: 'admin@sofia.com',
        accion: 'EXPORTAR_REPORTE',
        recurso: 'Reporte',
        fecha: new Date(Date.now() - 18000000).toISOString(),
        detalles: 'Se exportó reporte de estudiantes en formato Excel',
        ip: '192.168.1.100',
        navegador: 'Chrome 120.0.0.0'
      },
      {
        id: '6',
        usuario: 'admin@sofia.com',
        accion: 'IMPORTAR_EXCEL',
        recurso: 'Estudiantes',
        fecha: new Date(Date.now() - 21600000).toISOString(),
        detalles: 'Se importaron 25 estudiantes desde archivo Excel',
        ip: '192.168.1.100',
        navegador: 'Chrome 120.0.0.0'
      }
    ];

    return new Promise(resolve => {
      setTimeout(() => resolve(mockAuditHistory.slice(offset, offset + limit)), 300);
    });
  }

  /**
   * Obtiene estadísticas de auditoría
   */
  static async getAuditStats(): Promise<{
    totalAcciones: number;
    accionesHoy: number;
    accionesEstaSemana: number;
    accionesEsteMes: number;
    usuarioMasActivo: string;
  }> {
    const allLogs = await this.getAuditHistory(1000);
    const now = new Date();
    const today = now.toDateString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const accionesHoy = allLogs.filter(log => 
      new Date(log.fecha).toDateString() === today
    ).length;

    const accionesEstaSemana = allLogs.filter(log => 
      new Date(log.fecha) >= weekAgo
    ).length;

    const accionesEsteMes = allLogs.filter(log => 
      new Date(log.fecha) >= monthAgo
    ).length;

    // Contar acciones por usuario
    const accionesPorUsuario = allLogs.reduce((acc, log) => {
      acc[log.usuario] = (acc[log.usuario] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const usuarioMasActivo = Object.entries(accionesPorUsuario)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    return {
      totalAcciones: allLogs.length,
      accionesHoy,
      accionesEstaSemana,
      accionesEsteMes,
      usuarioMasActivo
    };
  }

  /**
   * Almacena log de auditoría (simulación)
   */
  private static storeAuditLog(log: AuditHistory): void {
    // Simulación de almacenamiento en localStorage
    const existingLogs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
    existingLogs.unshift(log);
    
    // Mantener solo últimos 1000 logs
    if (existingLogs.length > 1000) {
      existingLogs.splice(1000);
    }
    
    localStorage.setItem('auditLogs', JSON.stringify(existingLogs));
  }

  /**
   * Obtiene IP del cliente (simulación)
   */
  private static getClientIP(): string {
    // En producción, esto vendría del backend
    return '192.168.1.100';
  }

  /**
   * Obtiene información del navegador
   */
  private static getBrowserInfo(): string {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent;
      if (ua.includes('Chrome')) return `Chrome ${this.getChromeVersion()}`;
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Safari')) return 'Safari';
      if (ua.includes('Edge')) return 'Edge';
    }
    return 'Unknown';
  }

  /**
   * Obtiene versión de Chrome
   */
  private static getChromeVersion(): string {
    if (typeof window !== 'undefined') {
      const match = navigator.userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
      return match ? match[1] : 'Unknown';
    }
    return 'Unknown';
  }

  /**
   * Formatea fecha de auditoría
   */
  static formatAuditDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Obtiene descripción amigable de acción
   */
  static getActionDescription(accion: string): string {
    const descriptions: Record<string, string> = {
      'CREAR_ESTUDIANTE': 'Creó estudiante',
      'MODIFICAR_ESTUDIANTE': 'Modificó estudiante',
      'ELIMINAR_ESTUDIANTE': 'Eliminó estudiante',
      'AGENDAR_CITA': 'Agendó cita',
      'CANCELAR_CITA': 'Canceló cita',
      'EXPORTAR_REPORTE': 'Exportó reporte',
      'IMPORTAR_EXCEL': 'Importó estudiantes',
      'MODIFICAR_USUARIO': 'Modificó usuario',
      'ELIMINAR_USUARIO': 'Eliminó usuario',
      'INICIAR_SESION': 'Inició sesión',
      'CERRAR_SESION': 'Cerró sesión'
    };

    return descriptions[accion] || accion;
  }

  /**
   * Obtiene color según tipo de acción
   */
  static getActionColor(accion: string): string {
    if (accion.includes('CREAR')) return 'text-success';
    if (accion.includes('MODIFICAR')) return 'text-warning';
    if (accion.includes('ELIMINAR')) return 'text-danger';
    if (accion.includes('EXPORTAR')) return 'text-info';
    if (accion.includes('IMPORTAR')) return 'text-info';
    return 'text-gray-600';
  }
}