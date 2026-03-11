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
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
    }),
  ).toString('base64url');
  return `${header}.${payload}.signature`;
}

describe('sicop auth client integration (mocked)', () => {
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

  it('handles success flow', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { token: createJwtWithExp(600) }))
      .mockResolvedValueOnce(jsonResponse(200, { users: [{ id: 'u1' }] }));

    vi.stubGlobal('fetch', fetchMock);
    const { sicopAuthClient } = await import('./sicop-auth.client');

    const response = await sicopAuthClient.requestWithAuth<{ users: Array<{ id: string }> }>('/auth/users', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    expect(response.data.users[0].id).toBe('u1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('relogins once on 401 and retries once', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { token: createJwtWithExp(600) }))
      .mockResolvedValueOnce(jsonResponse(401, { message: 'unauthorized' }))
      .mockResolvedValueOnce(jsonResponse(200, { token: createJwtWithExp(600) }))
      .mockResolvedValueOnce(jsonResponse(200, { users: [{ id: 'u2' }] }));

    vi.stubGlobal('fetch', fetchMock);
    const { sicopAuthClient } = await import('./sicop-auth.client');

    const response = await sicopAuthClient.requestWithAuth<{ users: Array<{ id: string }> }>('/auth/users', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    expect(response.data.users[0].id).toBe('u2');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('retries on timeout/network errors', async () => {
    const abortError = new Error('timeout');
    abortError.name = 'AbortError';

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { token: createJwtWithExp(600) }))
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce(jsonResponse(200, { users: [{ id: 'u3' }] }));

    vi.stubGlobal('fetch', fetchMock);
    const { sicopAuthClient } = await import('./sicop-auth.client');

    const response = await sicopAuthClient.requestWithAuth<{ users: Array<{ id: string }> }>('/auth/users', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    expect(response.data.users[0].id).toBe('u3');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries on 5xx and fails after max attempts', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { token: createJwtWithExp(600) }))
      .mockResolvedValueOnce(jsonResponse(500, { message: 'server error' }))
      .mockResolvedValueOnce(jsonResponse(502, { message: 'bad gateway' }))
      .mockResolvedValueOnce(jsonResponse(503, { message: 'unavailable' }));

    vi.stubGlobal('fetch', fetchMock);
    const { sicopAuthClient } = await import('./sicop-auth.client');

    await expect(
      sicopAuthClient.requestWithAuth('/auth/users', { method: 'GET' }),
    ).rejects.toThrow('unavailable');

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
