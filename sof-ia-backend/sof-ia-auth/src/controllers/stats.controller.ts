import { Request, Response } from 'express';
import { sicopStatsClient } from '../integrations/sicop/sicop-stats.client';
import { SicopIntegrationError } from '../integrations/sicop/sicop.types';

function mapSicopError(error: unknown): { status: number; message: string } {
  if (error instanceof SicopIntegrationError) {
    if (error.statusCode === 401 || error.statusCode === 403) return { status: 401, message: 'No autorizado' };
    return { status: 502, message: 'No fue posible consultar estadísticas en SICOP' };
  }
  return { status: 500, message: 'Error al obtener estadísticas' };
}

function dataEnvelope(payload: Record<string, unknown>) {
  if (payload.data && typeof payload.data === 'object') return payload.data;
  return payload;
}

export const statsController = {
  async getDashboardStats(req: Request, res: Response) {
    try {
      const data = await sicopStatsClient.getDashboard(req.query as Record<string, unknown>);
      return res.json({ success: true, data: dataEnvelope(data) });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },

  async getSatisfaccionStats(req: Request, res: Response) {
    try {
      const data = await sicopStatsClient.getSatisfaccionStats(req.query as Record<string, unknown>);
      return res.json({ success: true, data: dataEnvelope(data) });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },

  async getConversacionesStats(req: Request, res: Response) {
    try {
      const data = await sicopStatsClient.getConversationsStats(req.query as Record<string, unknown>);
      return res.json({ success: true, data: dataEnvelope(data) });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },
};

export default statsController;
