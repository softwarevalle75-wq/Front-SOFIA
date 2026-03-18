import sicopAuthClient from './sicop-auth.client';

type UnknownRecord = Record<string, unknown>;

function asRecord(payload: unknown): UnknownRecord {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as UnknownRecord;
  }
  return {};
}

export class SicopStatsClient {
  async getDashboard(query?: Record<string, unknown>): Promise<UnknownRecord> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query || {})) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      params.set(key, String(value));
    }
    const endpoint = params.toString().length > 0
      ? `/cases/sofia/stats/dashboard?${params.toString()}`
      : '/cases/sofia/stats/dashboard';
    const response = await sicopAuthClient.requestWithAuth(endpoint, { method: 'GET' });
    return asRecord(response.data);
  }

  async getConversationsStats(query?: Record<string, unknown>): Promise<UnknownRecord> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query || {})) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      params.set(key, String(value));
    }
    const endpoint = params.toString().length > 0
      ? `/cases/sofia/stats/conversations?${params.toString()}`
      : '/cases/sofia/stats/conversations';
    const response = await sicopAuthClient.requestWithAuth(endpoint, { method: 'GET' });
    return asRecord(response.data);
  }

  async getSatisfaccionStats(query?: Record<string, unknown>): Promise<UnknownRecord> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query || {})) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      params.set(key, String(value));
    }
    const endpoint = params.toString().length > 0
      ? `/cases/sofia/stats/satisfaccion?${params.toString()}`
      : '/cases/sofia/stats/satisfaccion';
    const response = await sicopAuthClient.requestWithAuth(endpoint, { method: 'GET' });
    return asRecord(response.data);
  }
}

export const sicopStatsClient = new SicopStatsClient();

export default sicopStatsClient;
