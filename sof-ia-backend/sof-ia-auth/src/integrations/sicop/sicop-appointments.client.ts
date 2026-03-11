import sicopAuthClient from './sicop-auth.client';
import {
  SicopAppointment,
  SicopAppointmentFilters,
  SicopAppointmentsResponse,
  SicopIntegrationError,
} from './sicop.types';

const PAGE_LIMIT = 100;

function asBooleanHeader(value: string | undefined): boolean {
  return String(value || '').toLowerCase() === 'true';
}

function asNumberHeader(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeDate(value?: string): string | undefined {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  return raw;
}

function mapEstado(value?: string): string | undefined {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return undefined;
  const map: Record<string, string> = {
    AGENDADA: 'AGENDADA',
    CANCELADA: 'CANCELADA',
    COMPLETIDA: 'COMPLETADA',
    COMPLETADA: 'COMPLETADA',
  };
  return map[raw] || raw;
}

function mapOrigenToSourceSystem(value?: string): string {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'SOFIA';
  if (raw === 'sistema' || raw === 'sofia') return 'SOFIA';
  if (raw === 'chatbot') return 'CHATBOT';
  return raw.toUpperCase();
}

function buildQueryParams(filters: SicopAppointmentFilters, offset: number): URLSearchParams {
  const params = new URLSearchParams();
  params.set('limit', String(filters.limit || PAGE_LIMIT));
  params.set('offset', String(offset));
  params.set('sourceSystem', mapOrigenToSourceSystem(filters.sourceSystem || filters.origen));

  const estado = mapEstado(filters.estado);
  if (estado) params.set('estado', estado);

  if (filters.modalidad) {
    params.set('modalidad', String(filters.modalidad).toUpperCase());
  }

  const from = normalizeDate(filters.from);
  const to = normalizeDate(filters.to);
  const updatedSince = normalizeDate(filters.updatedSince);

  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (updatedSince) params.set('updatedSince', updatedSince);

  return params;
}

export class SicopAppointmentsClient {
  private extractAppointments(payload: SicopAppointmentsResponse | SicopAppointment[]): SicopAppointment[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.appointments)) {
      return payload.appointments;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    throw new SicopIntegrationError(
      'SICOP devolvió una respuesta de citas inválida',
      502,
      'SICOP_INVALID_APPOINTMENTS_PAYLOAD',
    );
  }

  private async fetchPage(
    filters: SicopAppointmentFilters,
    offset: number,
  ): Promise<{ appointments: SicopAppointment[]; hasMore: boolean; nextOffset: number }> {
    const query = buildQueryParams(filters, offset);
    const response = await sicopAuthClient.requestWithAuth<SicopAppointmentsResponse | SicopAppointment[]>(`/appointments?${query.toString()}`, {
      method: 'GET',
    });

    const appointments = this.extractAppointments(response.data);
    const currentOffset = asNumberHeader(response.headers['x-pagination-offset'], offset);
    const currentLimit = asNumberHeader(response.headers['x-pagination-limit'], filters.limit || PAGE_LIMIT);
    const hasMore = asBooleanHeader(response.headers['x-pagination-has-more']);
    return {
      appointments,
      hasMore,
      nextOffset: currentOffset + currentLimit,
    };
  }

  async getAppointments(filters: SicopAppointmentFilters = {}): Promise<SicopAppointment[]> {
    const allAppointments: SicopAppointment[] = [];
    const pageSize = filters.limit || PAGE_LIMIT;
    let offset = filters.offset || 0;

    while (true) {
      const page = await this.fetchPage({ ...filters, limit: pageSize }, offset);
      allAppointments.push(...page.appointments);
      if (!page.hasMore) {
        break;
      }
      offset = page.nextOffset;
    }

    return allAppointments;
  }

  async createAppointment(payload: Record<string, unknown>): Promise<SicopAppointment> {
    const response = await sicopAuthClient.requestWithAuth<SicopAppointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  }

  async updateAppointment(id: string, payload: Record<string, unknown>): Promise<SicopAppointment> {
    const response = await sicopAuthClient.requestWithAuth<SicopAppointment>(`/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  }

  async deleteAppointment(id: string): Promise<void> {
    await sicopAuthClient.requestWithAuth<unknown>(`/appointments/${id}`, {
      method: 'DELETE',
    });
  }
}

export const sicopAppointmentsClient = new SicopAppointmentsClient();

export default sicopAppointmentsClient;
