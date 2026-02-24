// Solo los tipos que realmente usamos

export interface User {
  id: string;
  nombre: string;
  email: string;
  documento: string;
  rol: UserRole;
  estado: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

export enum UserRole {
  ADMINISTRADOR = 'Administrador',
  ESTUDIANTE = 'Estudiante',
  INACTIVO = 'Inactivo',
}

export enum UserStatus {
  ACTIVO = 'Activo',
  INACTIVO = 'Inactivo',
}

export interface Survey {
  id: string;
  usuarioId: string;
  calificacion: number;
  comentario: string;
  fecha: string;
}

export interface SurveyStats {
  calificacionPromedio: number;
  totalEncuestas: number;
  distribucion: {
    [key: number]: number;
  };
  comentarios: Array<{
    usuario: string;
    calificacion: number;
    comentario: string;
  }>;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalConsultations: number;
  pendingAppointments: number;
  cancelledAppointments: number;
  totalRevenue: number;
  averageConsultationDuration: number;
  consultationCount: number;
  appointmentCount: number;
  userCount: number;
  activityChange: number;
  appointmentsChange: number;
  satisfactionRate: number;
  retentionRate: number;
  newUsersThisMonth: number;
  revenueThisMonth: number;
}

export interface SystemUsage {
  mes: string;
  consultas: number;
}

export interface UserGrowth {
  mes: string;
  nuevosUsuarios: number;
}

export interface SystemStatus {
  operativo: boolean;
  mensaje?: string;
  tiempoRespuesta: number;
  incidencias: number;
}

export interface SystemAlert {
  tipo: 'info' | 'warning' | 'error' | 'success';
  mensaje: string;
}

export interface ChatHistory {
  id: string;
  usuario: string;
  fecha: string;
  momento: string;
  mensaje: string;
  estado: 'leído' | 'no leído';
  consultorioJuridico?: string;
}

export interface Student {
  id: string;
  nombre: string;
  documento: string;
  correo?: string;
  telefono?: string;
  rol: UserRole;
  estado: UserStatus;
  accesoCitas?: boolean;
  acudimientos?: boolean;
  modalidad: 'presencial' | 'virtual';
  programa?: string;
  fechaInicio?: string;
  fechaCreacion?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SearchFilters {
  search?: string;
  estado?: string;
  rol?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

// Tipos para notificaciones
export interface Notification {
  id: string;
  tipo: 'audit' | 'system' | 'student' | 'cita';
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  prioridad: 'low' | 'medium' | 'high';
}

export interface AuditHistory {
  id: string;
  usuario: string;
  accion: string;
  recurso: string;
  fecha: string;
  detalles: string;
  ip?: string;
  navegador?: string;
}

// Tipos extendidos para chat
export interface ChatFilters extends SearchFilters {
  casoLegal?: string;
  consultorioJuridico?: string;
}

export interface ChatSummary {
  id: string;
  usuario: string;
  fecha: string;
  resumen: string;
  casoLegal: string;
  tipo: string;
  estado: string;
  consultorioJuridico?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ia';
  text: string;
  timestamp: string;
  isReportable?: boolean;
}

// Tipos para reportes de chat
export interface ChatReport {
  id: string;
  messageId: string;
  reason: string;
  description?: string;
  createdAt: string;
  status: 'pending' | 'reviewed' | 'resolved';
}

// Tipos extendidos para estudiantes
export interface StudentProximityAlert {
  id: string;
  estudianteId: string;
  estudianteNombre: string;
  fechaInicio: string;
  diasRestantes: number;
  tipo: '6_MONTH_PROXIMITY' | 'OTHER';
  mensaje: string;
  leida: boolean;
  createdAt: string;
}

// Tipos para exportación
export interface ExportOptions {
  format: 'pdf' | 'excel' | 'png';
  title: string;
  data?: any;
  chartElement?: HTMLElement;
}

// Tipos para actualizaciones en tiempo real
export interface RealtimeUpdate {
  type: 'stats' | 'citas' | 'students' | 'notifications';
  data: any;
  timestamp: string;
}

// Tipos para importación Excel
export interface ExcelImportData {
  nombre: string;
  documento: string;
  correo?: string;
  fechaInicio?: string;
  modalidad?: 'presencial' | 'virtual';
  telefono?: string;
  estado?: 'Activo' | 'Inactivo';
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  data: any;
}

export interface ExcelImportResult {
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: ImportError[];
  students: Student[];
}

export interface HistorialAccion {
  id: string;
  adminId: string;
  adminNombre: string;
  accion: string;
  entidad: string;
  entidadId?: string;
  detalle: string;
  fecha: string;
  tipo: 'crear' | 'editar' | 'eliminar' | 'agendar' | 'reprogramar' | 'cancelar' | 'importar' | 'exportar' | 'reportar';
}

export interface ManualCita {
  id: string;
  estudianteId: string;
  estudianteNombre: string;
  fecha: string;
  hora: string;
  modalidad: 'presencial' | 'virtual';
  motivo: string;
  estado: 'agendada' | 'cancelada' | 'completada';
  createdAt: string;
  // Datos del usuario que agenda la cita
  usuarioNombre?: string;
  usuarioTipoDocumento?: string;
  usuarioNumeroDocumento?: string;
  usuarioCorreo?: string;
  usuarioTelefono?: string;
}

export interface CitasStats {
  agendadas: {
    total: number;
    presencial: number;
    virtual: number;
  };
  canceladas: number;
}