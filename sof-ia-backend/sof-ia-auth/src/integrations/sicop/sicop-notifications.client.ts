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
  if (Array.isArray(root.notifications)) return root.notifications as UnknownRecord[];
  return [];
}

export class SicopNotificationsClient {
  async list(query?: Record<string, unknown>): Promise<{ data: UnknownRecord[]; pagination?: UnknownRecord }> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query || {})) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      params.set(key, String(value));
    }
    const endpoint = params.toString().length > 0
      ? `/cases/sofia/notifications?${params.toString()}`
      : '/cases/sofia/notifications';
    const response = await sicopAuthClient.requestWithAuth(endpoint, { method: 'GET' });
    const root = asRecord(response.data);
    const pagination = asRecord(root.pagination);
    return {
      data: asList(response.data),
      pagination: Object.keys(pagination).length > 0 ? pagination : undefined,
    };
  }

  async countUnread(): Promise<number> {
    const response = await sicopAuthClient.requestWithAuth('/cases/sofia/notifications/count', { method: 'GET' });
    const root = asRecord(response.data);
    if (typeof root.count === 'number') return root.count;
    const data = asRecord(root.data);
    return typeof data.count === 'number' ? data.count : 0;
  }

  async create(payload: Record<string, unknown>): Promise<UnknownRecord> {
    const response = await sicopAuthClient.requestWithAuth('/cases/sofia/notifications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return asRecord(response.data);
  }

  async markRead(id: string): Promise<UnknownRecord> {
    const response = await sicopAuthClient.requestWithAuth(`/cases/sofia/notifications/${id}/read`, {
      method: 'PUT',
    });
    return asRecord(response.data);
  }

  async markAllRead(): Promise<void> {
    await sicopAuthClient.requestWithAuth('/cases/sofia/notifications/read-all', {
      method: 'PUT',
    });
  }

  async delete(id: string): Promise<void> {
    await sicopAuthClient.requestWithAuth(`/cases/sofia/notifications/${id}`, {
      method: 'DELETE',
    });
  }
}

export const sicopNotificationsClient = new SicopNotificationsClient();

export default sicopNotificationsClient;
