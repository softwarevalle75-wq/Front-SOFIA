import { User, Student, DashboardStats, SurveyStats, UserRole, UserStatus } from '@/types';

/**
 * Servicio con datos mock para desarrollo
 * Tu compañero reemplazará esto con llamadas reales a la API
 */

export const mockUsers: User[] = [
  {
    id: '1',
    nombre: 'María García López',
    email: 'maria@email.com',
    documento: '1087542210',
    rol: 'Estudiante' as any,
    estado: 'Activo' as any
  },
  {
    id: '2',
    nombre: 'Carlos Pérez',
    email: 'carlos@email.com',
    documento: '1098756432',
    rol: 'Estudiante' as any,
    estado: 'Activo' as any
  },
];

export const mockStudents: Student[] = [
{
    id: '2',
    nombre: 'Juan Pérez',
    documento: '1087652210',
    correo: 'estudiante@unal.edu.co',
    rol: UserRole.ESTUDIANTE,
    estado: UserStatus.ACTIVO,
    estadoCuenta: 'Activo',
    accesoCitas: true,
    acudimientos: false,
    modalidad: 'presencial'
  },
];

export const mockDashboardStats: DashboardStats = {
  totalUsuarios: 12500,
  totalConsultas: 25300,
  citasAgendadas: 1200,
  tasaCrecimiento: {
    usuarios: 12,
    consultas: 18,
    citas: 8
  }
};

export const mockSurveyStats: SurveyStats = {
  calificacionPromedio: 4.2,
  totalEncuestas: 1295,
  distribucion: {
    5: 456,
    4: 520,
    3: 139,
    2: 65,
    1: 115
  },
  comentarios: [
    {
      usuario: 'Usuario 1',
      calificacion: 5,
      comentario: 'Excelente atención'
    }
  ]
};