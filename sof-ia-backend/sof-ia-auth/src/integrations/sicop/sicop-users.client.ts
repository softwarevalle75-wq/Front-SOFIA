import sicopAuthClient from './sicop-auth.client';
import { SicopIntegrationError, SicopUser, SicopUsersResponse } from './sicop.types';

export class SicopUsersClient {
  private extractUsers(payload: SicopUsersResponse | SicopUser[]): SicopUser[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.users)) {
      return payload.users;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    throw new SicopIntegrationError('SICOP devolvió una respuesta de usuarios inválida', 502, 'SICOP_INVALID_USERS_PAYLOAD');
  }

  private extractUser(payload: SicopUsersResponse | SicopUser): SicopUser {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      if ((payload as SicopUsersResponse).user && typeof (payload as SicopUsersResponse).user === 'object') {
        return (payload as SicopUsersResponse).user as SicopUser;
      }

      if ((payload as SicopUsersResponse).data && !Array.isArray((payload as SicopUsersResponse).data)) {
        return (payload as SicopUsersResponse).data as unknown as SicopUser;
      }

      return payload as SicopUser;
    }

    throw new SicopIntegrationError('SICOP devolvió un usuario inválido', 502, 'SICOP_INVALID_USER_PAYLOAD');
  }

  async getUsers(): Promise<SicopUser[]> {
    const response = await sicopAuthClient.requestWithAuth<SicopUsersResponse | SicopUser[]>('/auth/users', {
      method: 'GET',
    });

    return this.extractUsers(response.data);
  }

  async getUserById(id: string): Promise<SicopUser> {
    const response = await sicopAuthClient.requestWithAuth<SicopUsersResponse | SicopUser>(`/auth/users/${id}`, {
      method: 'GET',
    });

    return this.extractUser(response.data);
  }

  async createUser(payload: Record<string, unknown>): Promise<SicopUser> {
    const response = await sicopAuthClient.requestWithAuth<SicopUsersResponse | SicopUser>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return this.extractUser(response.data);
  }

  async updateUser(id: string, payload: Record<string, unknown>): Promise<SicopUser> {
    const response = await sicopAuthClient.requestWithAuth<SicopUsersResponse | SicopUser>(`/auth/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    return this.extractUser(response.data);
  }

  async deleteUser(id: string): Promise<void> {
    await sicopAuthClient.requestWithAuth<unknown>(`/auth/users/${id}`, {
      method: 'DELETE',
    });
  }
}

export const sicopUsersClient = new SicopUsersClient();

export default sicopUsersClient;
