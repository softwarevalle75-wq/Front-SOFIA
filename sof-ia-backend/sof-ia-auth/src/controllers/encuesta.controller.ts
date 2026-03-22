import { Request, Response } from 'express';
import { sicopSurveysClient } from '../integrations/sicop/sicop-surveys.client';
import { SicopIntegrationError } from '../integrations/sicop/sicop.types';

function mapSicopError(error: unknown): { status: number; message: string } {
  if (error instanceof SicopIntegrationError) {
    if (error.statusCode === 401 || error.statusCode === 403) return { status: 401, message: 'No autorizado' };
    if (error.statusCode === 404) return { status: 404, message: 'Encuestas no encontradas' };
    return { status: 502, message: 'No fue posible consultar encuestas en SICOP' };
  }
  return { status: 500, message: 'Error al obtener encuestas' };
}

function toPaginationMeta(page: number, pageSize: number, pagination?: Record<string, unknown>, totalFromData?: number) {
  const total = Number(pagination?.total ?? totalFromData ?? 0);
  return {
    page,
    pageSize,
    total,
    totalPages: pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1,
  };
}

export const encuestaController = {
  async getAll(req: Request, res: Response) {
    try {
      const page = Number(req.query.page || 1);
      const pageSize = Number(req.query.pageSize || 10);
      const response = await sicopSurveysClient.list(req.query as Record<string, unknown>);

      return res.json({
        success: true,
        data: response.data,
        pagination: toPaginationMeta(page, pageSize, response.pagination, response.data.length),
      });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const data = await sicopSurveysClient.create(req.body as Record<string, unknown>);
      return res.status(201).json({ success: true, data: data.data ?? data });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const data = await sicopSurveysClient.getStats(req.query as Record<string, unknown>);
      return res.json({ success: true, data: data.data ?? data });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },
};

export default encuestaController;
