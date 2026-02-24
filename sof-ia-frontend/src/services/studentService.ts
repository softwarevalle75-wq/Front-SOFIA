import { apiService } from './api.service';
import { API_CONFIG } from '@/config/api.config';
import { Student, UserRole, UserStatus } from '../types';

export const studentService = {
  async getStudents(): Promise<Student[]> {
    const response = await apiService.get<{ success: boolean; data: Student[] }>(
      API_CONFIG.ENDPOINTS.STUDENTS.BASE
    );
    
    // Convertir modalidad a minúsculas para que coincida con el frontend
    if (response.data) {
      response.data = response.data.map(est => ({
        ...est,
        modalidad: (est.modalidad as string)?.toLowerCase() || 'presencial'
      }));
    }
    
    return response.data || [];
  },

  async getStudentById(id: string): Promise<Student | null> {
    const response = await apiService.get<{ success: boolean; data: Student }>(
      API_CONFIG.ENDPOINTS.STUDENTS.BY_ID(id)
    );
    return response.data || null;
  },

  async createStudent(studentData: Omit<Student, 'id' | 'fechaCreacion'>): Promise<Student> {
    // Convertir modalidad y estado a mayúsculas para el enum de Prisma
    const dataToSend = {
      ...studentData,
      modalidad: studentData.modalidad?.toUpperCase() || 'PRESENCIAL',
      estado: studentData.estado?.toUpperCase() || 'ACTIVO',
    };
    const response = await apiService.post<{ success: boolean; data: Student }>(
      API_CONFIG.ENDPOINTS.STUDENTS.BASE,
      dataToSend
    );
    if (!response.success) {
      throw new Error('Error al crear estudiante');
    }
    return response.data;
  },

  async updateStudent(id: string, studentData: Partial<Student>): Promise<Student> {
    const allowedFields = [
      'documento',
      'nombre', 
      'correo', 
      'telefono', 
      'programa', 
      'modalidad', 
      'estado', 
      'estadoCuenta', 
      'accesoCitas', 
      'acudimientos', 
      'fechaInicio'
    ];
    
    const cleanData: Record<string, any> = {};
    
    for (const key of allowedFields) {
      if ((studentData as any)[key] !== undefined) {
        let value = (studentData as any)[key];
        
        if (key === 'modalidad' && value) {
          value = value.toUpperCase();
        }
        if (key === 'estado' && value) {
          value = value.toUpperCase();
        }
        
        cleanData[key] = value;
      }
    }
    
    const response = await apiService.put<{ success: boolean; data: Student }>(
      API_CONFIG.ENDPOINTS.STUDENTS.BY_ID(id),
      cleanData
    );
    
    if (!response.success) {
      throw new Error('Error al actualizar estudiante');
    }
    
    const backendData = response.data;
    
    let estadoNormalizado = backendData.estado;
    if (typeof estadoNormalizado === 'string') {
      estadoNormalizado = estadoNormalizado.toUpperCase();
      if (estadoNormalizado === 'ACTIVE' || estadoNormalizado === 'ACTIV') {
        estadoNormalizado = 'ACTIVO';
      } else if (estadoNormalizado === 'INACTIVE' || estadoNormalizado === 'INACTIV') {
        estadoNormalizado = 'INACTIVO';
      }
    }
    
    return {
      ...backendData,
      estado: estadoNormalizado,
      modalidad: (backendData.modalidad as string)?.toLowerCase() || 'presencial',
      fechaCreacion: backendData.creadoEn || backendData.fechaCreacion,
    };
  },

  async deleteStudent(id: string): Promise<void> {
    const response = await apiService.delete<{ success: boolean }>(
      API_CONFIG.ENDPOINTS.STUDENTS.BY_ID(id)
    );
    if (!response.success) {
      throw new Error('Error al eliminar estudiante');
    }
  },

  async importarEstudiantes(estudiantes: Array<{
    documento: string;
    nombre: string;
    correo?: string;
    telefono?: string;
    programa?: string;
    semestre?: number;
    modalidad?: string;
  }>): Promise<{ exitosos: number; fallidos: number; errores: string[]; estudiantesCreados: any[] }> {
    const response = await apiService.post<{ 
      success: boolean; 
      data: { exitosos: number; fallidos: number; errores: string[]; estudiantesCreados: any[] } 
    }>(
      API_CONFIG.ENDPOINTS.STUDENTS.IMPORTAR,
      { estudiantes }
    );
    if (!response.success) {
      throw new Error('Error al importar estudiantes');
    }
    return response.data;
  },

  async searchStudents(query: string): Promise<Student[]> {
    const students = await this.getStudents();
    
    if (!query) return students;
    
    const lowercaseQuery = query.toLowerCase();
    return students.filter(student =>
      student.nombre.toLowerCase().includes(lowercaseQuery) ||
      student.documento.includes(query) ||
      (student.correo && student.correo.toLowerCase().includes(lowercaseQuery))
    );
  },

  async deleteAllStudents(): Promise<{ eliminados: number }> {
    const response = await apiService.delete<{ 
      success: boolean; 
      data: { eliminados: number }
    }>(
      `${API_CONFIG.ENDPOINTS.STUDENTS.BASE}/todos/delete`
    );
    if (!response.success) {
      throw new Error('Error al eliminar todos los estudiantes');
    }
    return response.data;
  },
};

export default studentService;
