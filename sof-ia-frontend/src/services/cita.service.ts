import { apiService } from './api.service';
import { API_CONFIG } from '@/config/api.config';
import { ManualCita, CitasStats } from '@/types';

export class CitaService {

  static async reasignarCita(id: string, nuevaFecha: string, nuevaHora: string): Promise<ManualCita> {
    return this.reprogramarCita(id, nuevaFecha, nuevaHora);
  }
  
  static async getCitasStats(): Promise<CitasStats> {
    const response = await apiService.get<{ success: boolean; data: any }>(
      API_CONFIG.ENDPOINTS.CITAS.STATS
    );
    
    if (response.success && response.data) {
      return {
        agendadas: {
          total: response.data.agendadas || 0,
          presencial: response.data.presencial || 0,
          virtual: response.data.virtual || 0,
        },
        canceladas: response.data.canceladas || 0,
      };
    }
    
    return {
      agendadas: { total: 0, presencial: 0, virtual: 0 },
      canceladas: 0,
    };
  }

  static async getCitas(filtros?: {
    estado?: 'agendada' | 'cancelada' | 'completada';
    modalidad?: 'presencial' | 'virtual';
    fechaInicio?: string;
    fechaFin?: string;
    estudianteId?: string;
  }): Promise<ManualCita[]> {
    const params: Record<string, string> = {};
    
    if (filtros?.estado) params.estado = filtros.estado;
    if (filtros?.modalidad) params.modalidad = filtros.modalidad;
    if (filtros?.estudianteId) params.estudianteId = filtros.estudianteId;
    
    const response = await apiService.get<{ success: boolean; data: any[] }>(
      API_CONFIG.ENDPOINTS.CITAS.BASE,
      params
    );
    
    if (response.success && response.data) {
      return response.data.map((cita: any) => ({
        id: cita.id,
        estudianteId: cita.estudianteId,
        estudianteNombre: cita.estudiante?.nombre || 'Estudiante',
        usuarioNombre: cita.usuarioNombre || 'Usuario no registrado',
        fecha: new Date(cita.fecha).toISOString().split('T')[0],
        hora: cita.hora,
        modalidad: cita.modalidad?.toLowerCase() || 'presencial',
        motivo: cita.motivo || '',
        estado: this.mapEstado(cita.estado),
        createdAt: cita.creadoEn,
      }));
    }
    
    return [];
  }

  private static mapEstado(estado: string): 'agendada' | 'cancelada' | 'completada' {
    switch (estado) {
      case 'AGENDADA': return 'agendada';
      case 'CANCELADA': return 'cancelada';
      case 'COMPLETIDA': return 'completada';
      default: return 'agendada';
    }
  }

  static async crearCita(cita: {
    fecha: string;
    hora: string;
    modalidad: 'presencial' | 'virtual';
    motivo: string;
    usuarioNombre?: string;
    usuarioTipoDocumento?: string;
    usuarioNumeroDocumento?: string;
    usuarioCorreo?: string;
    usuarioTelefono?: string;
  }): Promise<ManualCita> {
    const response = await apiService.post<{ success: boolean; data: any }>(
      API_CONFIG.ENDPOINTS.CITAS.BASE,
      {
        fecha: cita.fecha,
        hora: cita.hora,
        modalidad: cita.modalidad.toUpperCase(),
        motivo: cita.motivo,
        usuarioNombre: cita.usuarioNombre,
        usuarioTipoDocumento: cita.usuarioTipoDocumento,
        usuarioNumeroDocumento: cita.usuarioNumeroDocumento,
        usuarioCorreo: cita.usuarioCorreo,
        usuarioTelefono: cita.usuarioTelefono,
      }
    );
    
    if (!response.success) {
      throw new Error((response as any).message || 'Error al crear cita');
    }
    
    const data = response.data;
    return {
      id: data.id,
      estudianteId: data.estudianteId,
      estudianteNombre: data.estudiante?.nombre || 'Estudiante',
      fecha: new Date(data.fecha).toISOString().split('T')[0],
      hora: data.hora,
      modalidad: data.modalidad?.toLowerCase() || 'presencial',
      motivo: data.motivo || '',
      estado: 'agendada',
      createdAt: data.creadoEn,
      usuarioNombre: data.usuarioNombre,
      usuarioTipoDocumento: data.usuarioTipoDocumento,
      usuarioNumeroDocumento: data.usuarioNumeroDocumento,
      usuarioCorreo: data.usuarioCorreo,
      usuarioTelefono: data.usuarioTelefono,
    };
  }

  static async modificarCita(id: string, cambios: Partial<ManualCita>): Promise<ManualCita> {
    const updateData: any = {};
    
    if (cambios.fecha) updateData.fecha = new Date(cambios.fecha);
    if (cambios.hora) updateData.hora = cambios.hora;
    if (cambios.modalidad) updateData.modalidad = cambios.modalidad.toUpperCase();
    if (cambios.motivo) updateData.motivo = cambios.motivo;
    if (cambios.estado) updateData.estado = cambios.estado.toUpperCase();
    
    const response = await apiService.put<{ success: boolean; data: any }>(
      API_CONFIG.ENDPOINTS.CITAS.BY_ID(id),
      updateData
    );
    
    if (!response.success) {
      throw new Error('Error al modificar cita');
    }
    
    const data = response.data;
    return {
      id: data.id,
      estudianteId: data.estudianteId,
      estudianteNombre: data.estudiante?.nombre || 'Estudiante',
      usuarioNombre: data.usuarioNombre || 'Usuario no registrado',
      fecha: new Date(data.fecha).toISOString().split('T')[0],
      hora: data.hora,
      modalidad: data.modalidad?.toLowerCase() || 'presencial',
      motivo: data.motivo || '',
      estado: this.mapEstado(data.estado),
      createdAt: data.creadoEn,
    };
  }

  static async cancelarCita(
    id: string, 
    motivo: string
  ): Promise<ManualCita> {
    const response = await apiService.post<{ success: boolean; data: any }>(
      API_CONFIG.ENDPOINTS.CITAS.CANCELAR(id),
      { motivo }
    );
    
    if (!response.success) {
      throw new Error('Error al cancelar cita');
    }
    
    const data = response.data || {};
    const fecha = data.fecha ? new Date(data.fecha).toISOString().split('T')[0] : '';
    return {
      id: data.id || id,
      estudianteId: data.estudianteId || '',
      estudianteNombre: data.estudiante?.nombre || 'Estudiante',
      usuarioNombre: data.usuarioNombre || 'Usuario no registrado',
      fecha,
      hora: data.hora || '',
      modalidad: data.modalidad?.toLowerCase() || 'presencial',
      motivo: data.motivo || '',
      estado: 'cancelada',
      createdAt: data.creadoEn || new Date().toISOString(),
    };
  }

  static async reprogramarCita(id: string, nuevaFecha: string, nuevaHora: string): Promise<ManualCita> {
    const response = await apiService.post<{ success: boolean; data: any }>(
      API_CONFIG.ENDPOINTS.CITAS.REPROGRAMAR(id),
      { fecha: nuevaFecha, hora: nuevaHora }
    );
    
    if (!response.success) {
      throw new Error('Error al reprogramar cita');
    }
    
    const data = response.data;
    return {
      id: data.id,
      estudianteId: data.estudianteId,
      estudianteNombre: data.estudiante?.nombre || 'Estudiante',
      usuarioNombre: data.usuarioNombre || 'Usuario no registrado',
      fecha: new Date(data.fecha).toISOString().split('T')[0],
      hora: data.hora,
      modalidad: data.modalidad?.toLowerCase() || 'presencial',
      motivo: data.motivo || '',
      estado: 'agendada',
      createdAt: data.creadoEn,
    };
  }

  static async getCitaById(id: string): Promise<ManualCita | null> {
    const response = await apiService.get<{ success: boolean; data: any }>(
      API_CONFIG.ENDPOINTS.CITAS.BY_ID(id)
    );
    
    if (response.success && response.data) {
      const cita = response.data;
      return {
        id: cita.id,
        estudianteId: cita.estudianteId,
        estudianteNombre: cita.estudiante?.nombre || 'Estudiante',
        usuarioNombre: cita.usuarioNombre || 'Usuario no registrado',
        fecha: new Date(cita.fecha).toISOString().split('T')[0],
        hora: cita.hora,
        modalidad: cita.modalidad?.toLowerCase() || 'presencial',
        motivo: cita.motivo || '',
        estado: this.mapEstado(cita.estado),
        createdAt: cita.creadoEn,
      };
    }
    
    return null;
  }

  static async getDisponibilidad(fecha: string, modalidad: 'presencial' | 'virtual'): Promise<{
    fechaDisponible: boolean;
    horasDisponibles: string[];
    motivoIndisponibilidad?: string;
  }> {
    const response = await apiService.get<{ success: boolean; data: {
      fechaDisponible: boolean;
      horasDisponibles: string[];
      motivoIndisponibilidad?: string;
    } }>(
      API_CONFIG.ENDPOINTS.CITAS.DISPONIBILIDAD,
      { fecha, modalidad: modalidad.toUpperCase() },
    );

    if (!response.success || !response.data) {
      throw new Error('No fue posible consultar la disponibilidad de horarios.');
    }

    return response.data;
  }

  static formatCitaDate(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  static getEstadoColor(estado: ManualCita['estado']): string {
    switch (estado) {
      case 'agendada': return 'bg-success text-white';
      case 'cancelada': return 'bg-danger text-white';
      case 'completada': return 'bg-university-indigo text-white';
      default: return 'bg-gray-500 text-white';
    }
  }

  static getModalidadColor(modalidad: ManualCita['modalidad']): string {
    switch (modalidad) {
      case 'presencial': return 'text-university-indigo bg-university-indigo/10';
      case 'virtual': return 'text-warning bg-warning/10';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  static validarFecha(fecha: string): {
    valida: boolean;
    errores: string[];
  } {
    const errores: string[] = [];
    const date = new Date(fecha);
    const now = new Date();
    
    if (date < now.setHours(0, 0, 0, 0)) {
      errores.push('No se pueden agendar citas en fechas pasadas');
    }
    
    const maxFuture = new Date();
    maxFuture.setMonth(maxFuture.getMonth() + 3);
    if (date > maxFuture) {
      errores.push('No se pueden agendar citas con más de 3 meses de anticipación');
    }
    
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      errores.push('No se pueden agendar citas fines de semana');
    }
    
    return {
      valida: errores.length === 0,
      errores
    };
  }
}
