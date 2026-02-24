import { Student, StudentProximityAlert } from '@/types';

/**
 * Servicio para gestión de proximidad de estudiantes a 6 meses
 */
export class StudentProximityService {
  
  /**
   * Obtiene alertas de estudiantes próximos a 6 meses
   */
  static async getProximityAlerts(): Promise<StudentProximityAlert[]> {
    // Mock de alertas - tu compañero conectará con backend real
    const mockAlerts: StudentProximityAlert[] = [
      {
        id: '1',
        estudianteId: '1',
        estudianteNombre: 'Ana María Rodríguez',
        fechaInicio: '2025-08-15', // 6 meses atrás aproximadamente
        diasRestantes: 15,
        tipo: '6_MONTH_PROXIMITY',
        mensaje: 'La estudiante completará 6 meses en el sistema en 15 días',
        leida: false,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        estudianteId: '2',
        estudianteNombre: 'Carlos Pérez Gómez',
        fechaInicio: '2025-08-20',
        diasRestantes: 10,
        tipo: '6_MONTH_PROXIMITY',
        mensaje: 'El estudiante completará 6 meses en el sistema en 10 días',
        leida: false,
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        estudianteId: '3',
        estudianteNombre: 'María Camila González',
        fechaInicio: '2025-08-25',
        diasRestantes: 5,
        tipo: '6_MONTH_PROXIMITY',
        mensaje: 'La estudiante completará 6 meses en el sistema en 5 días',
        leida: false,
        createdAt: new Date().toISOString()
      }
    ];

    return new Promise(resolve => {
      setTimeout(() => resolve(mockAlerts), 300);
    });
  }

  /**
   * Verifica si un estudiante está próximo a 6 meses
   */
  static checkSixMonthProximity(fechaInicio: string): {
    isProximo: boolean;
    diasRestantes: number;
    fechaLimite: Date;
  } {
    const startDate = new Date(fechaInicio);
    const sixMonthsLater = new Date(startDate);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    
    const today = new Date();
    const diasRestantes = Math.ceil((sixMonthsLater.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      isProximo: diasRestantes <= 30 && diasRestantes > 0,
      diasRestantes,
      fechaLimite: sixMonthsLater
    };
  }

  /**
   * Genera alerta de proximidad para un estudiante
   */
  static generateProximityAlert(student: Student): StudentProximityAlert | null {
    if (!student.fechaInicio) return null;
    
    const { isProximo, diasRestantes } = this.checkSixMonthProximity(student.fechaInicio);
    
    if (!isProximo) return null;
    
    return {
      id: `proximity_${student.id}`,
      estudianteId: student.id,
      estudianteNombre: student.nombre,
      fechaInicio: student.fechaInicio,
      diasRestantes,
      tipo: '6_MONTH_PROXIMITY',
      mensaje: this.generateProximityMessage(student.nombre, diasRestantes),
      leida: false,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Genera mensaje de proximidad
   */
  static generateProximityMessage(nombre: string, dias: number): string {
    if (dias <= 7) {
      return `${nombre} completará 6 meses en el sistema en ${dias} día${dias !== 1 ? 's' : ''} (crítico)`;
    } else if (dias <= 15) {
      return `${nombre} completará 6 meses en el sistema en ${dias} días (urgente)`;
    } else {
      return `${nombre} completará 6 meses en el sistema en ${dias} días`;
    }
  }

  /**
   * Obtiene estadísticas de proximidad
   */
  static async getProximityStats(): Promise<{
    totalProximos: number;
    criticos: number; // <= 7 días
    urgentes: number; // <= 15 días
    atencion: number; // <= 30 días
  }> {
    const alerts = await this.getProximityAlerts();
    
    return {
      totalProximos: alerts.length,
      criticos: alerts.filter(a => a.diasRestantes <= 7).length,
      urgentes: alerts.filter(a => a.diasRestantes <= 15).length,
      atencion: alerts.filter(a => a.diasRestantes <= 30).length
    };
  }

  /**
   * Crea estudiante de prueba próximo a 6 meses
   */
  static createTestStudent(): Student {
    const now = new Date();
    const fechaInicio = new Date(now);
    fechaInicio.setMonth(fechaInicio.getMonth() - 5); // 5 meses atrás
    fechaInicio.setDate(fechaInicio.getDate() - 15); // 15 días adicionales
    
    return {
      id: 'test_proximity_' + Date.now(),
      nombre: 'Estudiante Prueba Proximidad',
      documento: '1234567890',
      correo: 'test.proximidad@email.com',
      telefono: '3001234567',
      rol: 'Estudiante' as any,
      estado: 'Activo' as any,
      estadoCuenta: 'Activo',
      accesoCitas: true,
      acudimientos: false,
      modalidad: 'presencial',
      programa: 'Derecho',
      semestre: 6,
      fechaInicio: fechaInicio.toISOString().split('T')[0]
    };
  }

  /**
   * Obtiene color según días restantes
   */
  static getSeverityColor(dias: number): string {
    if (dias <= 7) return 'text-danger bg-danger/10 border-danger/20';
    if (dias <= 15) return 'text-warning bg-warning/10 border-warning/20';
    return 'text-info bg-info/10 border-info/20';
  }

  /**
   * Obtiene nivel de severidad
   */
  static getSeverityLevel(dias: number): 'critico' | 'urgente' | 'atencion' {
    if (dias <= 7) return 'critico';
    if (dias <= 15) return 'urgente';
    return 'atencion';
  }

  /**
   * Formatea fecha de proximidad
   */
  static formatProximityDate(fechaInicio: string): string {
    const { fechaLimite } = this.checkSixMonthProximity(fechaInicio);
    return fechaLimite.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Calcula progreso hacia 6 meses
   */
  static calculateProgress(fechaInicio: string): {
    diasTranscurridos: number;
    diasTotales: number;
    porcentaje: number;
  } {
    const startDate = new Date(fechaInicio);
    const sixMonthsLater = new Date(startDate);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    
    const today = new Date();
    const diasTranscurridos = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const diasTotales = Math.floor((sixMonthsLater.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const porcentaje = Math.min(100, Math.round((diasTranscurridos / diasTotales) * 100));
    
    return {
      diasTranscurridos,
      diasTotales,
      porcentaje
    };
  }

  /**
   * Marca alerta como leída
   */
  static async markAlertAsRead(alertId: string): Promise<void> {
    // Mock - tu compañero implementará llamada real a API
    
    // Simulación de actualización
    const existingAlerts = JSON.parse(localStorage.getItem('proximityAlerts') || '[]');
    const updatedAlerts = existingAlerts.map((alert: any) => 
      alert.id === alertId ? { ...alert, leida: true } : alert
    );
    localStorage.setItem('proximityAlerts', JSON.stringify(updatedAlerts));
  }

  /**
   * Marca todas las alertas como leídas
   */
  static async markAllAlertsAsRead(): Promise<void> {
    // Mock - tu compañero implementará llamada real a API
    
    // Simulación de actualización
    const existingAlerts = JSON.parse(localStorage.getItem('proximityAlerts') || '[]');
    const updatedAlerts = existingAlerts.map((alert: any) => ({ ...alert, leida: true }));
    localStorage.setItem('proximityAlerts', JSON.stringify(updatedAlerts));
  }

  /**
   * Obtiene recomendaciones según días restantes
   */
  static getRecommendations(dias: number): string[] {
    const recommendations: string[] = [
      'Programar cita de seguimiento antes de cumplir 6 meses',
      'Actualizar información de contacto del estudiante',
      'Revisar documentación y expediente completo'
    ];

    if (dias <= 7) {
      recommendations.unshift(
        'Contactar inmediatamente al estudiante',
        'Priorizar cita de seguimiento',
        'Evaluar necesidad de extensión de servicios'
      );
    } else if (dias <= 15) {
      recommendations.unshift(
        'Agendar cita en los próximos 7 días',
        'Preparar documentos de evaluación',
        'Coordinar con equipo de seguimiento'
      );
    }

    return recommendations;
  }
}