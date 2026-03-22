import sicopAuthClient from './sicop-auth.client';
import {
  SicopAppointment,
  SicopAppointmentFilters,
  SicopAppointmentsStats,
  SicopAppointmentsResponse,
  SicopIntegrationError,
} from './sicop.types';

const PAGE_LIMIT = 100;
const MAX_PAGES = 3;

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

function asRecord(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return null;
}

function pickNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = toNumber(source[key]);
    if (value !== null) return value;
  }
  return null;
}

function pickNestedNumber(source: Record<string, unknown>, nestedKey: string, keys: string[]): number | null {
  const nested = asRecord(source[nestedKey]);
  return pickNumber(nested, keys);
}

function normalizeStatsPayload(payload: unknown): SicopAppointmentsStats {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const source = Object.keys(data).length > 0 ? data : root;

  const agendadas =
    pickNumber(source, ['agendadas', 'scheduled', 'scheduledCount'])
    ?? pickNestedNumber(source, 'byStatus', ['AGENDADA'])
    ?? 0;

  const canceladas =
    pickNumber(source, ['canceladas', 'canceled', 'cancelled', 'cancelledCount'])
    ?? pickNestedNumber(source, 'byStatus', ['CANCELADA'])
    ?? 0;

  const completadas =
    pickNumber(source, ['completadas', 'completed', 'completedCount'])
    ?? pickNestedNumber(source, 'byStatus', ['COMPLETADA', 'COMPLETIDA'])
    ?? 0;

  const presencial =
    pickNumber(source, ['presencial', 'inPerson', 'in_person'])
    ?? pickNestedNumber(source, 'byMode', ['PRESENCIAL'])
    ?? 0;

  const virtual =
    pickNumber(source, ['virtual', 'online'])
    ?? pickNestedNumber(source, 'byMode', ['VIRTUAL'])
    ?? 0;

  const total =
    pickNumber(source, ['total', 'totalAppointments', 'totalCitas', 'count'])
    ?? (agendadas + canceladas + completadas);

  return {
    total,
    agendadas,
    canceladas,
    completadas,
    presencial,
    virtual,
  };
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

  private extractAppointment(payload: SicopAppointmentsResponse | SicopAppointment): SicopAppointment {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      if ((payload as SicopAppointmentsResponse).appointment && typeof (payload as SicopAppointmentsResponse).appointment === 'object') {
        return (payload as SicopAppointmentsResponse).appointment as SicopAppointment;
      }

      if ((payload as SicopAppointmentsResponse).data && !Array.isArray((payload as SicopAppointmentsResponse).data)) {
        return (payload as SicopAppointmentsResponse).data as unknown as SicopAppointment;
      }

      return payload as SicopAppointment;
    }

    throw new SicopIntegrationError('SICOP devolvió una cita inválida', 502, 'SICOP_INVALID_APPOINTMENT_PAYLOAD');
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
    const fetchAllPages = filters.fetchAllPages === true;
    let pagesFetched = 0;

    while (true) {
      const page = await this.fetchPage({ ...filters, limit: pageSize }, offset);
      allAppointments.push(...page.appointments);
      pagesFetched += 1;

      if (!fetchAllPages || !page.hasMore || pagesFetched >= MAX_PAGES) {
        break;
      }

      offset = page.nextOffset;
    }

    return allAppointments;
  }

  async getAppointmentsStats(filters: Pick<SicopAppointmentFilters, 'sourceSystem' | 'origen' | 'from' | 'to'> = {}): Promise<SicopAppointmentsStats> {
    const params = new URLSearchParams();
    params.set('sourceSystem', mapOrigenToSourceSystem(filters.sourceSystem || filters.origen));

    const from = normalizeDate(filters.from);
    const to = normalizeDate(filters.to);
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    const response = await sicopAuthClient.requestWithAuth<Record<string, unknown>>(`/appointments/stats?${params.toString()}`, {
      method: 'GET',
    });

    return normalizeStatsPayload(response.data);
  }

  async createAppointment(payload: Record<string, unknown>): Promise<SicopAppointment> {
    const response = await sicopAuthClient.requestWithAuth<SicopAppointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return this.extractAppointment(response.data as SicopAppointmentsResponse | SicopAppointment);
  }

  async updateAppointment(id: string, payload: Record<string, unknown>): Promise<SicopAppointment> {
    const response = await sicopAuthClient.requestWithAuth<SicopAppointment>(`/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return this.extractAppointment(response.data as SicopAppointmentsResponse | SicopAppointment);
  }

  async getAppointmentById(id: string): Promise<SicopAppointment> {
    const response = await sicopAuthClient.requestWithAuth<SicopAppointmentsResponse | SicopAppointment>(`/appointments/${id}`, {
      method: 'GET',
    });
    return this.extractAppointment(response.data);
  }

  async deleteAppointment(id: string): Promise<void> {
    await sicopAuthClient.requestWithAuth<unknown>(`/appointments/${id}`, {
      method: 'DELETE',
    });
  }
}

export const sicopAppointmentsClient = new SicopAppointmentsClient();

export default sicopAppointmentsClient;
