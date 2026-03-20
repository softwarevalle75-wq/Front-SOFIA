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

function normalizeAction(value: string): string {
  return String(value || 'REPORTAR').trim().toUpperCase();
}

function resolveEvent(action: string): 'LOGIN' | 'LOGOUT' | 'FAIL' | 'BLOCKED' {
  if (action.includes('BLOCK')) return 'BLOCKED';
  if (action.includes('FALLO') || action.includes('ERROR') || action.includes('FAIL')) return 'FAIL';
  if (action.includes('LOGOUT')) return 'LOGOUT';
  if (action.includes('LOGIN')) return 'LOGIN';
  return 'LOGOUT';
}

export const auditoriaService = {
  async registrar(data: AuditPayload) {
    const action = normalizeAction(data.accion);
    const event = resolveEvent(action);
    const success = event !== 'FAIL';

    return sicopHistoryClient.createAuditLog({
      userId: data.adminId,
      event,
      action,
      details: data.detalles,
      ipAddress: data.ip,
      userAgent: data.userAgent,
      success,
    });
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
    const items = await this.getAll({
      entidad: options?.entidad,
      adminId: options?.adminId,
      limit: 500,
      offset: 0,
    });
    return items.length;
  },
};

export default auditoriaService;
