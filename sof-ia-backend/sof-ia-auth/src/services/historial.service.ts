import { sicopHistoryClient } from '../integrations/sicop/sicop-history.client';

function toHistorialRow(raw: Record<string, unknown>): Record<string, unknown> {
  const event = String(raw.event || '').toUpperCase();
  const action = String(raw.action || '').toUpperCase();
  const createdAt = String(raw.createdAt || raw.creadoEn || new Date().toISOString());
  const email = String(raw.email || '').trim();
  const userId = String(raw.userId || '').trim();

  const isLoginEvent = event === 'LOGIN' || event === 'FAIL' || action.includes('LOGIN');
  const entidadFromAction = action.includes('ESTUD') || action.includes('IMPORT') ? 'estudiante'
    : action.includes('CITA') || action.includes('AGENDAR') || action.includes('CANCELAR') || action.includes('REPROGRAM') ? 'cita'
    : 'sistema';
  const accion = isLoginEvent
    ? (event === 'FAIL' ? 'LOGIN_FALLO' : 'LOGIN_EXITO')
    : (action || 'REPORTAR');

  return {
    id: String(raw.id || `${userId || email || 'log'}-${createdAt}`),
    tipo: isLoginEvent ? 'login' : 'auditoria',
    accion,
    entidad: isLoginEvent ? 'login' : entidadFromAction,
    entidadId: raw.caseId ? String(raw.caseId) : undefined,
    detalles: String(raw.details || raw.message || action || event || 'Acción registrada'),
    adminId: userId || undefined,
    adminNombre: email || undefined,
    ip: raw.ipAddress ? String(raw.ipAddress) : undefined,
    userAgent: raw.userAgent ? String(raw.userAgent) : undefined,
    exitoso: raw.success !== undefined ? Boolean(raw.success) : event !== 'FAIL',
    correo: email || undefined,
    motivoFallo: event === 'FAIL' ? String(raw.details || 'Error de autenticación') : undefined,
    creadoEn: createdAt,
  };
}

export const historialService = {
  async getHistorialCompleto(options?: {
    limit?: number;
    offset?: number;
    tipo?: string;
  }) {
    const logs = await sicopHistoryClient.getAuditLogs({
      limit: options?.limit ?? 500,
      offset: options?.offset ?? 0,
      event: options?.tipo === 'login' ? 'LOGIN' : undefined,
    });

    const mapped = logs
      .map((item) => toHistorialRow(item as Record<string, unknown>))
      .sort((a, b) => new Date(String(b.creadoEn || 0)).getTime() - new Date(String(a.creadoEn || 0)).getTime());

    if (options?.tipo && options.tipo !== 'todos') {
      if (options.tipo === 'login') {
        return mapped.filter((item) => item.entidad === 'login');
      }
      return mapped.filter((item) => String(item.entidad || '').toLowerCase() === String(options.tipo || '').toLowerCase());
    }

    return mapped;
  },

  async getEstadisticas() {
    const logs = await sicopHistoryClient.getAuditLogs({ limit: 500, offset: 0 });
    const mapped = logs.map((item) => toHistorialRow(item as Record<string, unknown>));

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const totalLogins = mapped.filter((item) => item.entidad === 'login').length;
    const loginsExitosos = mapped.filter((item) => item.accion === 'LOGIN_EXITO').length;
    const loginsFallidos = mapped.filter((item) => item.accion === 'LOGIN_FALLO').length;
    const totalAuditorias = mapped.filter((item) => item.entidad !== 'login').length;
    const citasMes = mapped.filter((item) => {
      const createdAt = new Date(String(item.creadoEn || 0));
      return createdAt >= inicioMes && String(item.entidad || '').toLowerCase() === 'cita';
    }).length;
    const estudiantesMes = mapped.filter((item) => {
      const createdAt = new Date(String(item.creadoEn || 0));
      return createdAt >= inicioMes && String(item.entidad || '').toLowerCase() === 'estudiante';
    }).length;

    return {
      totalAuditorias,
      totalLogins,
      loginsExitosos,
      loginsFallidos,
      citasMes,
      estudiantesMes,
    };
  },
};

export default historialService;
