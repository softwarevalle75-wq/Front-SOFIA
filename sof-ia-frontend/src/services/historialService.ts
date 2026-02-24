import { apiService } from './api.service';
import { API_CONFIG } from '@/config/api.config';
import { HistorialAccion } from '@/types';

interface HistorialItem {
  id: string;
  tipo: 'auditoria' | 'login';
  accion: string;
  entidad: string;
  entidadId?: string;
  detalles: string;
  adminId?: string;
  adminNombre?: string;
  ip?: string;
  userAgent?: string;
  exitoso?: boolean;
  correo?: string;
  motivoFallo?: string;
  creadoEn: string;
}

export const historialService = {
  async getHistorial(opciones?: {
    limit?: number;
    offset?: number;
    tipo?: string;
  }): Promise<HistorialAccion[]> {
    const params: Record<string, string> = {};
    
    if (opciones?.limit) params.limit = opciones.limit.toString();
    if (opciones?.offset) params.offset = opciones.offset.toString();
    if (opciones?.tipo) params.tipo = opciones.tipo;
    
    const response = await apiService.get<{ success: boolean; data: HistorialItem[] }>(
      API_CONFIG.ENDPOINTS.HISTORIAL.BASE,
      params
    );
    
    if (response.success && response.data) {
      const mappedData = response.data.map((item: HistorialItem) => {
        // Mapear el tipo de acción a los tipos que espera el frontend
        let tipoAccion: string;
        let entidadMostrar: string;
        
        // Verificar si es una acción de login (puede venir con entidad='login' o accion que contiene 'LOGIN')
        if (item.entidad === 'login' || (item.accion && item.accion.includes('LOGIN'))) {
          tipoAccion = item.accion === 'LOGIN_EXITO' ? 'login' : 'reportar';
          entidadMostrar = 'Sesión';
        } else {
          // Para auditoria, mapear la accion
          switch (item.accion) {
            case 'CREAR':
              tipoAccion = 'crear';
              break;
            case 'EDITAR':
              tipoAccion = 'editar';
              break;
            case 'ELIMINAR':
              tipoAccion = 'eliminar';
              break;
            case 'AGENDAR':
              tipoAccion = 'agendar';
              break;
            case 'CANCELAR':
              tipoAccion = 'cancelar';
              break;
            case 'REPROGRAMAR':
              tipoAccion = 'reprogramar';
              break;
            case 'IMPORTAR':
              tipoAccion = 'importar';
              break;
            case 'EXPORTAR':
              tipoAccion = 'exportar';
              break;
            default:
              // Si no coincide con ninguno, usar la acción en minúsculas
              tipoAccion = item.accion ? item.accion.toLowerCase() : 'crear';
          }
          entidadMostrar = item.entidad.charAt(0).toUpperCase() + item.entidad.slice(1);
        }
        
        return {
          id: item.id,
          adminId: item.adminId || item.correo || 'sistema',
          adminNombre: item.adminNombre || item.correo || (item.exitoso ? 'Usuario' : 'Desconocido'),
          accion: tipoAccion,
          entidad: item.entidad === 'login' ? 'Sesión' : entidadMostrar,
          detalle: item.detalles,
          fecha: item.creadoEn, // Guardar como ISO string
          tipo: item.entidad === 'login' || (item.accion && item.accion.includes('LOGIN')) 
            ? (item.accion === 'LOGIN_EXITO' ? 'login' : 'reportar') 
            : tipoAccion,
        };
      });
      
      return mappedData as HistorialAccion[];
    }
    
    return [];
  },

  async getHistorialFiltrado(filtros: {
    tipo?: string;
    entidad?: string;
    adminId?: string;
  }): Promise<HistorialAccion[]> {
    return this.getHistorial({ tipo: filtros.entidad });
  },

  async registrarAccion(data: Omit<HistorialAccion, 'id' | 'fecha'>): Promise<void> {
    try {
      const response = await apiService.post<{ success: boolean; data: any }>(
        API_CONFIG.ENDPOINTS.HISTORIAL.BASE,
        {
          accion: data.accion?.toUpperCase() || 'REPORTAR',
          entidad: data.entidad || 'Mensaje Chat',
          entidadId: data.entidadId,
          detalle: data.detalle,
          adminId: data.adminId,
          adminNombre: data.adminNombre,
        }
      );
    } catch (error) {
      // Silencioso - el error ya se maneja en el UI
    }
  },

  async limpiarHistorial(): Promise<void> {
    // No implementado en backend por seguridad
    console.warn('Limpiar historial no está implementado en el backend');
  },

  async getRecientes(cantidad: number = 10): Promise<HistorialAccion[]> {
    return this.getHistorial({ limit: cantidad });
  },

  async getEstadisticas() {
    const response = await apiService.get<{ success: boolean; data: any }>(
      API_CONFIG.ENDPOINTS.HISTORIAL.STATS
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    return {
      totalAuditorias: 0,
      totalLogins: 0,
      loginsExitosos: 0,
      loginsFallidos: 0,
      citasMes: 0,
      estudiantesMes: 0,
    };
  },
};

export default historialService;
