import sicopAuthClient from './sicop-auth.client';
import { SicopIntegrationError } from './sicop.types';

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
  const fromData = root.data;
  if (Array.isArray(fromData)) return fromData as UnknownRecord[];
  const fromConversations = root.conversations;
  if (Array.isArray(fromConversations)) return fromConversations as UnknownRecord[];
  return [];
}

function getPagination(payload: unknown): UnknownRecord | undefined {
  const root = asRecord(payload);
  const pagination = asRecord(root.pagination);
  return Object.keys(pagination).length > 0 ? pagination : undefined;
}

export class SicopConversationsClient {
  async getConversations(query?: Record<string, unknown>): Promise<{ data: UnknownRecord[]; pagination?: UnknownRecord }> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query || {})) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      params.set(key, String(value));
    }

    const endpoint = params.toString().length > 0
      ? `/cases/sofia/chatbot/conversations?${params.toString()}`
      : '/cases/sofia/chatbot/conversations';

    const response = await sicopAuthClient.requestWithAuth(endpoint, { method: 'GET' });
    return {
      data: asList(response.data),
      pagination: getPagination(response.data),
    };
  }

  async getConversationById(id: string): Promise<UnknownRecord | null> {
    const response = await sicopAuthClient.requestWithAuth(`/cases/sofia/chatbot/conversations/${id}`, {
      method: 'GET',
    });

    const root = asRecord(response.data);
    if (Object.keys(root).length === 0) return null;
    if (root.data && typeof root.data === 'object' && !Array.isArray(root.data)) return root.data as UnknownRecord;
    if (root.conversation && typeof root.conversation === 'object' && !Array.isArray(root.conversation)) return root.conversation as UnknownRecord;
    return root;
  }

  async getConversationMessages(id: string): Promise<UnknownRecord[]> {
    const response = await sicopAuthClient.requestWithAuth(`/cases/sofia/chatbot/conversations/${id}/messages`, {
      method: 'GET',
    });
    return asList(response.data);
  }

  async sendWebchatMessage(payload: Record<string, unknown>): Promise<UnknownRecord> {
    const response = await sicopAuthClient.requestWithAuth('/cases/sofia/chatbot/conversations/webchat/message', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return asRecord(response.data);
  }

  async createConversation(payload: Record<string, unknown>): Promise<UnknownRecord> {
    const response = await sicopAuthClient.requestWithAuth('/cases/sofia/chatbot/conversations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return asRecord(response.data);
  }

  async addMessage(id: string, payload: Record<string, unknown>): Promise<UnknownRecord> {
    const response = await sicopAuthClient.requestWithAuth(`/cases/sofia/chatbot/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return asRecord(response.data);
  }

  async updateConversation(id: string, payload: Record<string, unknown>): Promise<UnknownRecord> {
    const response = await sicopAuthClient.requestWithAuth(`/cases/sofia/chatbot/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return asRecord(response.data);
  }

  async updateSummary(id: string, payload: { resumen: string }): Promise<UnknownRecord> {
    const response = await sicopAuthClient.requestWithAuth(`/cases/sofia/chatbot/conversations/${id}/summary`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return asRecord(response.data);
  }

  async deleteConversation(id: string): Promise<void> {
    try {
      await sicopAuthClient.requestWithAuth(`/cases/sofia/chatbot/conversations/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      if (error instanceof SicopIntegrationError && error.statusCode === 404) return;
      throw error;
    }
  }
}

export const sicopConversationsClient = new SicopConversationsClient();

export default sicopConversationsClient;
