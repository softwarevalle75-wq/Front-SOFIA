import sicopAuthClient from './sicop-auth.client';
import { SicopIntegrationError, SicopUser, SicopUserFilters, SicopUsersResponse } from './sicop.types';

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

  async getUsers(filters?: SicopUserFilters): Promise<SicopUser[]> {
    const query = new URLSearchParams();
    if (filters?.role) query.set('role', String(filters.role));
    if (filters?.sourceSystem) query.set('sourceSystem', String(filters.sourceSystem));
    const path = query.toString().length > 0 ? `/auth/users?${query.toString()}` : '/auth/users';

    const response = await sicopAuthClient.requestWithAuth<SicopUsersResponse | SicopUser[]>(path, {
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

  async upsertUser(payload: Record<string, unknown>): Promise<SicopUser> {
    const response = await sicopAuthClient.requestWithAuth<SicopUsersResponse | SicopUser>('/auth/users/upsert', {
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
