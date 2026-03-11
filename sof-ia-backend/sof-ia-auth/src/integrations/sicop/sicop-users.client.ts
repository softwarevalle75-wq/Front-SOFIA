import sicopAuthClient from './sicop-auth.client';
import { SicopIntegrationError, SicopUser, SicopUsersResponse } from './sicop.types';

export class SicopUsersClient {
  async getUsers(): Promise<SicopUser[]> {
    const response = await sicopAuthClient.requestWithAuth<SicopUsersResponse | SicopUser[]>('/auth/users', {
      method: 'GET',
    });

    const payload = response.data;
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
}

export const sicopUsersClient = new SicopUsersClient();

export default sicopUsersClient;
