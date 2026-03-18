import { beforeEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(status: number, payload: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
  });
}

function createJwtWithExp(expSecondsFromNow: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
    }),
  ).toString('base64url');
  return `${header}.${payload}.signature`;
}

describe('sicop appointments client integration (mocked)', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.SICOP_GATEWAY_URL = 'https://sicop.mock';
    process.env.SICOP_INTEGRATION_EMAIL = 'integration@mock.test';
    process.env.SICOP_INTEGRATION_PASSWORD = 'mock-password';
    process.env.SICOP_TIMEOUT_MS = '20';
    process.env.SICOP_RETRY_ATTEMPTS = '2';
    vi.restoreAllMocks();
  });

  it('loads only first page by default to avoid expensive pagination loops', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { token: createJwtWithExp(600) }))
      .mockResolvedValueOnce(
        jsonResponse(
          200,
          { appointments: [{ id: 'a1' }] },
          {
            'x-pagination-limit': '100',
            'x-pagination-offset': '0',
            'x-pagination-has-more': 'true',
          },
        ),
      )
      .mockResolvedValueOnce(jsonResponse(200, { appointments: [{ id: 'a2' }] }));

    vi.stubGlobal('fetch', fetchMock);
    const { sicopAppointmentsClient } = await import('./sicop-appointments.client');

    const data = await sicopAppointmentsClient.getAppointments();

    expect(data).toHaveLength(1);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/appointments?limit=100&offset=0&sourceSystem=SOFIA');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('loads multiple pages only when fetchAllPages=true', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { token: createJwtWithExp(600) }))
      .mockResolvedValueOnce(
        jsonResponse(
          200,
          { appointments: [{ id: 'a1' }] },
          {
            'x-pagination-limit': '100',
            'x-pagination-offset': '0',
            'x-pagination-has-more': 'true',
          },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          200,
          { appointments: [{ id: 'a2' }] },
          {
            'x-pagination-limit': '100',
            'x-pagination-offset': '100',
            'x-pagination-has-more': 'false',
          },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);
    const { sicopAppointmentsClient } = await import('./sicop-appointments.client');

    const data = await sicopAppointmentsClient.getAppointments({ fetchAllPages: true });

    expect(data).toHaveLength(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/appointments?limit=100&offset=0&sourceSystem=SOFIA');
    expect(String(fetchMock.mock.calls[2][0])).toContain('/appointments?limit=100&offset=100&sourceSystem=SOFIA');
  });

  it('maps business filters to SICOP query params', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { token: createJwtWithExp(600) }))
      .mockResolvedValueOnce(
        jsonResponse(
          200,
          { appointments: [{ id: 'a3' }] },
          { 'x-pagination-has-more': 'false' },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);
    const { sicopAppointmentsClient } = await import('./sicop-appointments.client');

    await sicopAppointmentsClient.getAppointments({
      estado: 'AGENDADA',
      modalidad: 'VIRTUAL',
      origen: 'sistema',
      from: '2026-03-01',
      to: '2026-03-31',
      updatedSince: '2026-03-10T00:00:00.000Z',
    });

    const url = String(fetchMock.mock.calls[1][0]);
    expect(url).toContain('estado=AGENDADA');
    expect(url).toContain('modalidad=VIRTUAL');
    expect(url).toContain('sourceSystem=SOFIA');
    expect(url).toContain('from=2026-03-01');
    expect(url).toContain('to=2026-03-31');
    expect(url).toContain('updatedSince=2026-03-10T00%3A00%3A00.000Z');
  });

  it('accepts sourceSystem filter directly', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { token: createJwtWithExp(600) }))
      .mockResolvedValueOnce(
        jsonResponse(
          200,
          { appointments: [{ id: 'a6' }] },
          { 'x-pagination-has-more': 'false' },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);
    const { sicopAppointmentsClient } = await import('./sicop-appointments.client');

    await sicopAppointmentsClient.getAppointments({
      sourceSystem: 'CHATBOT',
    });

    const url = String(fetchMock.mock.calls[1][0]);
    expect(url).toContain('sourceSystem=CHATBOT');
  });

  it('retries on timeout and returns data', async () => {
    const abortError = new Error('timeout');
    abortError.name = 'AbortError';

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { token: createJwtWithExp(600) }))
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce(
        jsonResponse(
          200,
          { appointments: [{ id: 'a4' }] },
          { 'x-pagination-has-more': 'false' },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);
    const { sicopAppointmentsClient } = await import('./sicop-appointments.client');

    const data = await sicopAppointmentsClient.getAppointments();
    expect(data).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('fails when /appointments exhausts network retries', async () => {
    const abortError = new Error('timeout');
    abortError.name = 'AbortError';

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { token: createJwtWithExp(600) }))
      .mockRejectedValueOnce(abortError)
      .mockRejectedValueOnce(abortError)
      .mockRejectedValueOnce(abortError);

    vi.stubGlobal('fetch', fetchMock);
    const { sicopAppointmentsClient } = await import('./sicop-appointments.client');

    await expect(sicopAppointmentsClient.getAppointments()).rejects.toMatchObject({
      code: 'SICOP_NETWORK_ERROR',
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('reads appointment stats from /appointments/stats', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { token: createJwtWithExp(600) }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: {
            total: 12,
            byStatus: {
              AGENDADA: 5,
              CANCELADA: 4,
              COMPLETADA: 3,
            },
            byMode: {
              PRESENCIAL: 7,
              VIRTUAL: 5,
            },
          },
        }),
      );

    vi.stubGlobal('fetch', fetchMock);
    const { sicopAppointmentsClient } = await import('./sicop-appointments.client');

    const stats = await sicopAppointmentsClient.getAppointmentsStats({ sourceSystem: 'SOFIA' });

    expect(stats).toEqual({
      total: 12,
      agendadas: 5,
      canceladas: 4,
      completadas: 3,
      presencial: 7,
      virtual: 5,
    });
    expect(String(fetchMock.mock.calls[1][0])).toContain('/appointments/stats?sourceSystem=SOFIA');
  });
});
