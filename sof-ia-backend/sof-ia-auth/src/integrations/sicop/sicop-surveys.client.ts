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
  if (Array.isArray(root.surveys)) return root.surveys as UnknownRecord[];
  return [];
}

export class SicopSurveysClient {
  async list(query?: Record<string, unknown>): Promise<{ data: UnknownRecord[]; pagination?: UnknownRecord }> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query || {})) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      params.set(key, String(value));
    }
    const endpoint = params.toString().length > 0
      ? `/cases/sofia/chatbot/surveys?${params.toString()}`
      : '/cases/sofia/chatbot/surveys';

    const response = await sicopAuthClient.requestWithAuth(endpoint, { method: 'GET' });
    const root = asRecord(response.data);
    const pagination = asRecord(root.pagination);
    return {
      data: asList(response.data),
      pagination: Object.keys(pagination).length > 0 ? pagination : undefined,
    };
  }

  async create(payload: Record<string, unknown>): Promise<UnknownRecord> {
    const response = await sicopAuthClient.requestWithAuth('/cases/sofia/chatbot/surveys', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return asRecord(response.data);
  }

  async getStats(query?: Record<string, unknown>): Promise<UnknownRecord> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query || {})) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      params.set(key, String(value));
    }
    const endpoint = params.toString().length > 0
      ? `/cases/sofia/chatbot/surveys/stats?${params.toString()}`
      : '/cases/sofia/chatbot/surveys/stats';
    const response = await sicopAuthClient.requestWithAuth(endpoint, { method: 'GET' });
    return asRecord(response.data);
  }
}

export const sicopSurveysClient = new SicopSurveysClient();

export default sicopSurveysClient;
