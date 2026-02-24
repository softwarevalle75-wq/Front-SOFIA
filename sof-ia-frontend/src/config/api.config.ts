// Configuración de la API para conectar con el backend (Express + Prisma)

export const API_CONFIG = {
  // URL base del backend - pointing to gateway
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  
  // Timeout de las peticiones en milisegundos
  TIMEOUT: 10000,
  
  // Endpoints de la API organizados por módulo
  ENDPOINTS: {
    // ========== Autenticación ==========
    AUTH: {
      LOGIN: '/auth/login',
      LOGOUT: '/auth/logout',
      REFRESH_TOKEN: '/auth/refresh',
      VERIFY: '/auth/verify',
      CHANGE_PASSWORD: '/auth/change-password',
      VERIFY_SESSION: '/auth/verify-session',
    },
    
    // ========== Estudiantes ==========
    STUDENTS: {
      BASE: '/estudiantes',
      BY_ID: (id: string) => `/estudiantes/${id}`,
      CREATE: '/estudiantes',
      UPDATE: (id: string) => `/estudiantes/${id}`,
      DELETE: (id: string) => `/estudiantes/${id}`,
      IMPORTAR: '/estudiantes/importar',
    },
    
    // ========== Citas ==========
    CITAS: {
      BASE: '/citas',
      BY_ID: (id: string) => `/citas/${id}`,
      CREATE: '/citas',
      UPDATE: (id: string) => `/citas/${id}`,
      DELETE: (id: string) => `/citas/${id}`,
      CANCELAR: (id: string) => `/citas/${id}/cancelar`,
      REPROGRAMAR: (id: string) => `/citas/${id}/reprogramar`,
      STATS: '/citas/stats',
      DISPONIBILIDAD: '/citas/disponibilidad',
    },
    
    // ========== Historial ==========
    HISTORIAL: {
      BASE: '/historial',
      STATS: '/historial/stats',
    },

    // ========== Conversaciones ==========
    CONVERSACIONES: {
      BASE: '/conversaciones',
      BY_ID: (id: string) => `/conversaciones/${id}`,
      MENSAJES: (id: string) => `/conversaciones/${id}/mensajes`,
    },

    // ========== Encuestas ==========
    ENCUESTAS: {
      BASE: '/encuestas',
      STATS: '/encuestas/stats',
    },

    // ========== Stats ==========
    STATS: '/stats',

    // ========== Notificaciones ==========
    NOTIFICATIONS: {
      BASE: '/notificaciones',
      NO_LEIDAS: '/notificaciones/no-leidas',
      COUNT: '/notificaciones/count',
      MARK_ALL_READ: '/notificaciones/leer-todas',
    },

    // ========== Estudiantes próximos 6 meses ==========
    ESTUDIANTES_PROXIMOS: '/estudiantes/proximos-6-meses',
  }
} as const;

// Headers por defecto para las peticiones
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
} as const;
