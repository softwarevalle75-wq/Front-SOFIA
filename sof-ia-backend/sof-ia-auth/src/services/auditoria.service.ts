import { sicopHistoryClient } from '../integrations/sicop/sicop-history.client';

type AuditPayload = {
  accion: string;
  entidad: string;
  entidadId?: string;
  detalles: string;
  adminId?: string;
  adminNombre?: string;
  ip?: string;
  userAgent?: string;
};

export const auditoriaService = {
  async registrar(data: AuditPayload) {
    return sicopHistoryClient.createAuditLog(data as Record<string, unknown>);
  },

  async getAll(options?: {
    entidad?: string;
    adminId?: string;
    limit?: number;
    offset?: number;
  }) {
    return sicopHistoryClient.getAuditLogs(options as Record<string, unknown>);
  },

  async getByEntidad(entidad: string, limit?: number, offset?: number) {
    return sicopHistoryClient.getAuditLogs({ entidad, limit, offset });
  },

  async count(options?: {
    entidad?: string;
    adminId?: string;
  }) {
    const items = await sicopHistoryClient.getAuditLogs({
      entidad: options?.entidad,
      adminId: options?.adminId,
      limit: 1,
      offset: 0,
    });
    return Array.isArray(items) ? items.length : 0;
  },
};

export default auditoriaService;
