import { sicopHistoryClient } from '../integrations/sicop/sicop-history.client';

export const historialService = {
  async getHistorialCompleto(options?: {
    limit?: number;
    offset?: number;
    tipo?: string;
  }) {
    return sicopHistoryClient.getHistory({
      limit: options?.limit ?? 500,
      offset: options?.offset ?? 0,
      tipo: options?.tipo,
    });
  },

  async getEstadisticas() {
    return sicopHistoryClient.getHistoryStats();
  },
};

export default historialService;
