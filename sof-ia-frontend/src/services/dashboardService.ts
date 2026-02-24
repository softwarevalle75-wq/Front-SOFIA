import { apiService } from './api.service';
import { API_CONFIG } from '../config/api.config';
import { DashboardStats } from '../types';

interface DashboardResponse {
  success: boolean;
  data: {
    totalUsers: number;
    activeUsers: number;
    totalConsultations: number;
    pendingAppointments: number;
    cancelledAppointments: number;
    activityChange: number;
    appointmentsChange: number;
    satisfactionRate: number;
    retentionRate: number;
    newUsersThisMonth: number;
    modalityData: Array<{ name: string; value: number; color: string }>;
    usageData: Array<{ date: string; value: number }>;
    growthData: Array<{ name: string; value: number }>;
    satisfactionData: Array<{ name: string; rating: number }>;
  };
}

interface SatisfaccionResponse {
  success: boolean;
  data: {
    calificacionPromedio: number;
    totalEncuestas: number;
    distribucion: Record<number, number>;
    comentarios: Array<{ usuario: string; calificacion: number; comentario: string }>;
  };
}

interface ConversacionesResponse {
  success: boolean;
  data: {
    total: number;
    esteMes: number;
    porCanal: Array<{ canal: string; count: number }>;
    porConsultorio: Array<{ consultorio: string | null; count: number }>;
  };
}

export const dashboardService = {
  async getDashboardStats(period: 'week' | 'month' | 'year' = 'month'): Promise<DashboardStats> {
    const response = await apiService.get<DashboardResponse>(
      `${API_CONFIG.ENDPOINTS.STATS}/dashboard?periodo=${period}`
    );

    if (response.success && response.data) {
      const d = response.data;
      return {
        totalUsers: d.totalUsers,
        activeUsers: d.activeUsers,
        totalConsultations: d.totalConsultations,
        pendingAppointments: d.pendingAppointments,
        cancelledAppointments: d.cancelledAppointments,
        totalRevenue: 0,
        averageConsultationDuration: 45,
        consultationCount: d.totalConsultations,
        appointmentCount: d.totalConsultations + d.pendingAppointments,
        userCount: d.totalUsers,
        activityChange: d.activityChange,
        appointmentsChange: d.appointmentsChange,
        satisfactionRate: d.satisfactionRate,
        retentionRate: d.retentionRate,
        newUsersThisMonth: d.newUsersThisMonth,
        revenueThisMonth: 0
      };
    }

    throw new Error('Error al obtener estadísticas del dashboard');
  },

  async getChartData(period: 'week' | 'month' | 'year' = 'month'): Promise<Array<{ date: string; value: number }>> {
    const response = await apiService.get<DashboardResponse>(
      `${API_CONFIG.ENDPOINTS.STATS}/dashboard?periodo=${period}`
    );

    if (response.success && response.data?.usageData) {
      return response.data.usageData;
    }

    throw new Error('Error al obtener datos de uso');
  },

  async getGrowthData(period: 'week' | 'month' | 'year' = 'month'): Promise<Array<{ name: string; value: number }>> {
    const response = await apiService.get<DashboardResponse>(
      `${API_CONFIG.ENDPOINTS.STATS}/dashboard?periodo=${period}`
    );

    if (response.success && response.data?.growthData) {
      return response.data.growthData;
    }

    throw new Error('Error al obtener datos de crecimiento');
  },

  async getModalityDistribution(): Promise<Array<{ name: string; value: number; color: string }>> {
    const response = await apiService.get<DashboardResponse>(
      `${API_CONFIG.ENDPOINTS.STATS}/dashboard`
    );

    if (response.success && response.data?.modalityData) {
      return response.data.modalityData;
    }

    throw new Error('Error al obtener distribución por modalidad');
  },

  async getSatisfactionData(): Promise<Array<{ name: string; rating: number }>> {
    const response = await apiService.get<DashboardResponse>(
      `${API_CONFIG.ENDPOINTS.STATS}/dashboard`
    );

    if (response.success && response.data?.satisfactionData) {
      return response.data.satisfactionData;
    }

    throw new Error('Error al obtener datos de satisfacción');
  },

  async getSatisfaccionStats(): Promise<{
    calificacionPromedio: number;
    totalEncuestas: number;
    distribucion: Record<number, number>;
    comentarios: Array<{ usuario: string; calificacion: number; comentario: string }>;
  }> {
    const response = await apiService.get<SatisfaccionResponse>(
      `${API_CONFIG.ENDPOINTS.STATS}/satisfaccion`,
      { origen: 'chatbot' }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error('Error al obtener estadísticas de satisfacción');
  },

  async getConversacionesStats(): Promise<{
    total: number;
    esteMes: number;
    porCanal: Array<{ canal: string; count: number }>;
    porConsultorio: Array<{ consultorio: string | null; count: number }>;
  }> {
    const response = await apiService.get<ConversacionesResponse>(
      `${API_CONFIG.ENDPOINTS.STATS}/conversaciones`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error('Error al obtener estadísticas de conversaciones');
  }
};

export default dashboardService;
