import sicopAuthClient from './sicop-auth.client';

type UnknownRecord = Record<string, unknown>;

function asRecord(payload: unknown): UnknownRecord {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as UnknownRecord;
  }
  return {};
}

function asList(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) return payload as UnknownRecord[];
  const root = asRecord(payload);
  if (Array.isArray(root.data)) return root.data as UnknownRecord[];
  if (Array.isArray(root.items)) return root.items as UnknownRecord[];
  return [];
}

export class SicopHistoryClient {
  async getHistory(query?: Record<string, unknown>): Promise<UnknownRecord[]> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query || {})) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      params.set(key, String(value));
    }
    const endpoint = params.toString().length > 0
      ? `/cases/sofia/history?${params.toString()}`
      : '/cases/sofia/history';
    const response = await sicopAuthClient.requestWithAuth(endpoint, { method: 'GET' });
    return asList(response.data);
  }

  async getHistoryStats(): Promise<UnknownRecord> {
    const response = await sicopAuthClient.requestWithAuth('/cases/sofia/history/stats', { method: 'GET' });
    return asRecord(response.data);
  }

  async createAuditLog(payload: Record<string, unknown>): Promise<UnknownRecord> {
    const response = await sicopAuthClient.requestWithAuth('/auth/audit/logs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return asRecord(response.data);
  }

  async getAuditLogs(query?: Record<string, unknown>): Promise<UnknownRecord[]> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query || {})) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      params.set(key, String(value));
    }
    const endpoint = params.toString().length > 0
      ? `/auth/audit/logs?${params.toString()}`
      : '/auth/audit/logs';
    const response = await sicopAuthClient.requestWithAuth(endpoint, { method: 'GET' });
    return asList(response.data);
  }
}

export const sicopHistoryClient = new SicopHistoryClient();

export default sicopHistoryClient;
