import { UserRole, UserStatus } from '@/types';

// Definir CaseType localmente para evitar import circular
export enum CaseType {
  DERECHO_FAMILIA = 'DERECHO_FAMILIA',
  DERECHO_LABORAL = 'DERECHO_LABORAL',
  DERECHO_CIVIL = 'DERECHO_CIVIL',
  DERECHO_PENAL = 'DERECHO_PENAL'
}

// Constantes globales de la aplicación
export const APP_NAME = 'SOF-IA';
export const UNIVERSITY_NAME = 'Institución Universitaria de Colombia';

// Credenciales del administrador por defecto (SOLO PARA DESARROLLO)
// Tu compañero debe cambiar esto en el backend
export const DEFAULT_ADMIN = {
  EMAIL: 'admin@gmail.com',
  PASSWORD: 'admin123', // Esto NO debe estar en producción
} as const;

// Configuración del Chatbot
export const CHATBOT_CONFIG = {
  WHATSAPP_URL: 'https://web.whatsapp.com',
  BOT_URL: '#chatbot-placeholder', // Para cuando implementemos el chatbot real
  MESSAGE: 'Próximamente conectará al chatbot de WhatsApp. Actualmente muestra información administrativa.',
  DESCRIPTION: 'El acceso al chatbot estará disponible próximamente. Los estudiantes pueden acceder directamente a WhatsApp mientras tanto.'
} as const;

// Roles de usuario
export const USER_ROLES = {
  ADMIN: UserRole.ADMINISTRADOR,
  STUDENT: UserRole.ESTUDIANTE,
  INACTIVE: UserRole.INACTIVO,
} as const;

// Estados de usuario
export const USER_STATUS = {
  ACTIVE: UserStatus.ACTIVO,
  INACTIVE: UserStatus.INACTIVO,
} as const;

// Tipos de casos jurídicos
export const CASE_TYPES = {
  FAMILY: CaseType.DERECHO_FAMILIA,
  LABOR: CaseType.DERECHO_LABORAL,
  CIVIL: CaseType.DERECHO_CIVIL,
  PENAL: CaseType.DERECHO_PENAL,
} as const;

// Configuración de paginación
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 20, 50],
} as const;

// Rutas de la aplicación
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  USERS: '/users',
  CONVERSATIONS: '/conversations',
  SURVEYS: '/surveys',
  STUDENTS: '/students',
} as const;

// Mensajes de la aplicación
export const MESSAGES = {
  LOGIN: {
    SUCCESS: 'Inicio de sesión exitoso',
    ERROR: 'Credenciales inválidas',
    REQUIRED: 'Por favor ingrese sus credenciales',
  },
  ERROR: {
    GENERIC: 'Ha ocurrido un error. Por favor intente nuevamente.',
    NETWORK: 'Error de conexión. Verifique su internet.',
    UNAUTHORIZED: 'No tiene permisos para realizar esta acción.',
  },
  SUCCESS: {
    CREATE: 'Registro creado exitosamente',
    UPDATE: 'Registro actualizado exitosamente',
    DELETE: 'Registro eliminado exitosamente',
  },
} as const;

// Configuración de gráficos - Colores universitarios
export const CHART_COLORS = {
  PRIMARY: '#1A1F71',
  ACCENT: '#FFCD00',
  SUCCESS: '#22C55E',
  WARNING: '#F59E0B',
  DANGER: '#EF4444',
  INFO: '#3B82F6',
  GRAY: '#6C757D',
  GRAY_LIGHT: '#F4F6F9',
  INDIGO_DARK: '#2E2A78',
  YELLOW_DARK: '#E6B800',
} as const;