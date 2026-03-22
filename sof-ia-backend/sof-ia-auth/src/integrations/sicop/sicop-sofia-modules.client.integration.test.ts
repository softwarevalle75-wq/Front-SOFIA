import { beforeEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createJwtWithExp(expSecondsFromNow: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow }),
  ).toString('base64url');
  return `${header}.${payload}.signature`;
}

describe('sicop clients for SOFIA modules (mocked)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.SICOP_GATEWAY_URL = 'https://sicop.mock';
    process.env.SICOP_INTEGRATION_EMAIL = 'integration@mock.test';
    process.env.SICOP_INTEGRATION_PASSWORD = 'mock-password';
    process.env.SICOP_TIMEOUT_MS = '20';
    process.env.SICOP_RETRY_ATTEMPTS = '1';
  });

  it('consumes conversations, surveys, stats, history and notifications endpoints', async () => {
    const technicalToken = createJwtWithExp(600);

    const fetchMock = vi.fn(async (input: any, init?: RequestInit) => {
      const url = String(input);
      const method = String(init?.method || 'GET').toUpperCase();
      const parsed = new URL(url);
      const path = `${parsed.pathname}${parsed.search}`;

      if (parsed.pathname === '/auth/login' && method === 'POST') {
        return jsonResponse(200, { token: technicalToken });
      }

      if (path.startsWith('/cases/sofia/chatbot/conversations') && method === 'GET') {
        return jsonResponse(200, {
          data: [{ id: 'conv-1', temaLegal: 'Consulta laboral', estado: 'no_leido' }],
          pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
        });
      }

      if (parsed.pathname.endsWith('/summary') && method === 'PUT') {
        return jsonResponse(200, { data: { id: 'conv-1', resumen: 'Resumen guardado' } });
      }

      if (parsed.pathname === '/cases/sofia/chatbot/surveys' && method === 'GET') {
        return jsonResponse(200, { data: [{ id: 'survey-1', calificacion: 5 }] });
      }

      if (parsed.pathname === '/cases/sofia/chatbot/surveys/stats' && method === 'GET') {
        return jsonResponse(200, { data: { calificacionPromedio: 4.5, totalEncuestas: 10 } });
      }

      if (parsed.pathname === '/cases/sofia/stats/dashboard' && method === 'GET') {
        return jsonResponse(200, { data: { totalUsers: 100, totalConsultations: 50 } });
      }

      if (parsed.pathname === '/cases/sofia/history' && method === 'GET') {
        return jsonResponse(200, { data: [{ id: 'hist-1', tipo: 'auditoria' }] });
      }

      if (parsed.pathname === '/auth/audit/logs' && method === 'POST') {
        return jsonResponse(201, { data: { id: 'audit-1', accion: 'CREAR' } });
      }

      if (parsed.pathname === '/cases/sofia/notifications' && method === 'GET') {
        return jsonResponse(200, { data: [{ id: 'not-1', leida: false }] });
      }

      if (parsed.pathname === '/cases/sofia/notifications/count' && method === 'GET') {
        return jsonResponse(200, { data: { count: 3 } });
      }

      throw new Error(`Unhandled fetch in test: ${method} ${path}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const { sicopConversationsClient } = await import('./sicop-conversations.client');
    const { sicopSurveysClient } = await import('./sicop-surveys.client');
    const { sicopStatsClient } = await import('./sicop-stats.client');
    const { sicopHistoryClient } = await import('./sicop-history.client');
    const { sicopNotificationsClient } = await import('./sicop-notifications.client');

    const conversations = await sicopConversationsClient.getConversations({ page: 1, pageSize: 10 });
    expect(conversations.data.length).toBe(1);

    const summary = await sicopConversationsClient.updateSummary('conv-1', { resumen: 'Resumen guardado' });
    expect((summary.data as Record<string, unknown>).id).toBe('conv-1');

    const surveys = await sicopSurveysClient.list();
    expect(surveys.data.length).toBe(1);

    const surveyStats = await sicopSurveysClient.getStats();
    expect((surveyStats.data as Record<string, unknown>).totalEncuestas).toBe(10);

    const dashboard = await sicopStatsClient.getDashboard();
    expect((dashboard.data as Record<string, unknown>).totalUsers).toBe(100);

    const history = await sicopHistoryClient.getHistory();
    expect(history.length).toBe(1);

    const audit = await sicopHistoryClient.createAuditLog({ accion: 'CREAR' });
    expect((audit.data as Record<string, unknown>).id).toBe('audit-1');

    const notifications = await sicopNotificationsClient.list();
    expect(notifications.data.length).toBe(1);

    const unread = await sicopNotificationsClient.countUnread();
    expect(unread).toBe(3);
  });
});
