import { sicopAppointmentsClient } from '../integrations/sicop/sicop-appointments.client';
import { mapSicopAppointmentToSofiaCita, mapSofiaCitaToSicopPayload } from '../integrations/sicop/sicop-mappers';
import { SicopIntegrationError } from '../integrations/sicop/sicop.types';

type EstadoCita = 'AGENDADA' | 'CANCELADA' | 'COMPLETIDA';
type Modalidad = 'PRESENCIAL' | 'VIRTUAL';

const BOGOTA_OFFSET = '-05:00';

function buildHalfHourSlots(startHour: number, endHourInclusive: number): string[] {
  const slots: string[] = [];
  for (let hour = startHour; hour <= endHourInclusive; hour += 1) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
    if (hour < endHourInclusive) {
      slots.push(`${String(hour).padStart(2, '0')}:30`);
    }
  }
  return slots;
}

const MODALIDAD_SLOTS: Record<Modalidad, string[]> = {
  PRESENCIAL: buildHalfHourSlots(13, 17),
  VIRTUAL: buildHalfHourSlots(8, 17),
};

class CitaServiceError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'CitaServiceError';
  }
}

function normalizeHora(hora: string): string {
  const raw = String(hora || '').trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (!match) {
    throw new CitaServiceError('INVALID_HOUR', 'La hora no tiene un formato válido (HH:MM).');
  }

  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || hh < 0 || hh > 23 || !Number.isFinite(mm) || mm < 0 || mm > 59) {
    throw new CitaServiceError('INVALID_HOUR', 'La hora no tiene un formato válido (HH:MM).');
  }

  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function datePartInBogota(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new CitaServiceError('INVALID_DATE', 'La fecha no es válida.');
  }

  return `${year}-${month}-${day}`;
}

function resolveDateKey(fecha: Date | string): string {
  if (typeof fecha === 'string') {
    const trimmed = fecha.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new CitaServiceError('INVALID_DATE', 'La fecha no es válida. Usa formato YYYY-MM-DD.');
    }
    return datePartInBogota(parsed);
  }

  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
    throw new CitaServiceError('INVALID_DATE', 'La fecha no es válida.');
  }

  return datePartInBogota(fecha);
}

function buildDateTimeIso(fecha: Date | string, hora: string): string {
  const dayKey = resolveDateKey(fecha);
  const normalizedHour = normalizeHora(hora);
  const candidate = `${dayKey}T${normalizedHour}:00${BOGOTA_OFFSET}`;
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    throw new CitaServiceError('INVALID_DATE', 'No fue posible construir fecha y hora de cita.');
  }
  return candidate;
}

function mapSicopError(error: SicopIntegrationError): CitaServiceError {
  if (error.statusCode === 401 || error.statusCode === 403) {
    return new CitaServiceError('SICOP_UNAUTHORIZED', 'No autorizado para operar citas en SICOP.');
  }
  if (error.statusCode === 404) {
    return new CitaServiceError('NOT_FOUND', 'Cita no encontrada en SICOP.');
  }
  if (error.statusCode === 409) {
    return new CitaServiceError('SLOT_NOT_AVAILABLE', 'El horario seleccionado no está disponible.');
  }
  return new CitaServiceError('SICOP_UNAVAILABLE', 'No fue posible consultar citas en SICOP.');
}

function ensureCitaShape(raw: Record<string, any>): Record<string, any> {
  return {
    ...raw,
    estudianteId: raw.estudianteId || raw.studentId || null,
    estudiante: {
      id: raw.estudiante?.id || raw.estudianteId || raw.studentId || 'sicop-unassigned',
      nombre: raw.estudiante?.nombre || raw.usuarioNombre || 'Estudiante',
      correo: raw.estudiante?.correo || raw.usuarioCorreo || null,
    },
  };
}

function normalizeEstadoInput(value: unknown): EstadoCita {
  const raw = String(value || 'AGENDADA').toUpperCase();
  if (raw === 'CANCELADA') return 'CANCELADA';
  if (raw === 'COMPLETIDA') return 'COMPLETIDA';
  return 'AGENDADA';
}

export const citaService = {
  async getAll(filtros?: {
    estudianteId?: string;
    estado?: EstadoCita | string;
    modalidad?: Modalidad | string;
    sourceSystem?: string;
    origen?: string;
    from?: string;
    to?: string;
    updatedSince?: string;
  }) {
    try {
      const citas = await sicopAppointmentsClient.getAppointments({
        estado: filtros?.estado,
        modalidad: filtros?.modalidad,
        sourceSystem: filtros?.sourceSystem,
        origen: filtros?.origen,
        from: filtros?.from,
        to: filtros?.to,
        updatedSince: filtros?.updatedSince,
        fetchAllPages: false,
      });

      return citas
        .map((cita) => ensureCitaShape(mapSicopAppointmentToSofiaCita(cita) as Record<string, any>))
        .filter((cita) => {
          if (filtros?.estudianteId && String(cita.estudianteId) !== String(filtros.estudianteId)) return false;
          if (filtros?.estado && String(cita.estado || '').toUpperCase() !== String(filtros.estado).toUpperCase()) return false;
          if (filtros?.modalidad && String(cita.modalidad || '').toUpperCase() !== String(filtros.modalidad).toUpperCase()) return false;
          return true;
        })
        .sort((a, b) => new Date(String(b.actualizadoEn || b.creadoEn || 0)).getTime() - new Date(String(a.actualizadoEn || a.creadoEn || 0)).getTime());
    } catch (error) {
      if (error instanceof SicopIntegrationError) {
        throw mapSicopError(error);
      }
      throw error;
    }
  },

  async getById(id: string) {
    try {
      const cita = await sicopAppointmentsClient.getAppointmentById(id);
      return ensureCitaShape(mapSicopAppointmentToSofiaCita(cita) as Record<string, any>);
    } catch (error) {
      if (error instanceof SicopIntegrationError && error.statusCode === 404) {
        return null;
      }
      if (error instanceof SicopIntegrationError) {
        throw mapSicopError(error);
      }
      throw error;
    }
  },

  async getDisponibilidad(fecha: Date | string, modalidad: Modalidad | string): Promise<{
    fechaDisponible: boolean;
    horasDisponibles: string[];
    motivoIndisponibilidad?: string;
  }> {
    const mode = String(modalidad || '').toUpperCase();
    if (mode !== 'PRESENCIAL' && mode !== 'VIRTUAL') {
      throw new CitaServiceError('INVALID_MODE', 'La modalidad debe ser PRESENCIAL o VIRTUAL.');
    }

    const dayKey = resolveDateKey(fecha);
    const citas = await this.getAll({
      estado: 'AGENDADA',
      modalidad: mode,
      from: dayKey,
      to: dayKey,
      sourceSystem: 'SOFIA',
    });

    const horasOcupadas = new Set(citas.map((cita) => normalizeHora(String(cita.hora || ''))));
    const horasDisponibles = MODALIDAD_SLOTS[mode as Modalidad].filter((slot) => !horasOcupadas.has(slot));

    return {
      fechaDisponible: horasDisponibles.length > 0,
      horasDisponibles,
      ...(horasDisponibles.length === 0 ? { motivoIndisponibilidad: 'No hay cupos disponibles para esa fecha.' } : {}),
    };
  },

  async create(data: {
    fecha: Date | string;
    hora: string;
    modalidad: Modalidad | string;
    motivo?: string;
    estudianteId?: string;
    usuarioNombre?: string;
    usuarioTipoDocumento?: string;
    usuarioNumeroDocumento?: string;
    usuarioCorreo?: string;
    usuarioTelefono?: string;
    conversacionId?: string;
    enlaceReunion?: string;
  }) {
    try {
      const fechaHoraISO = buildDateTimeIso(data.fecha, data.hora);
      const payload = mapSofiaCitaToSicopPayload({
        ...data,
        fecha: fechaHoraISO,
        hora: normalizeHora(data.hora),
        estado: 'AGENDADA',
      });

      const created = await sicopAppointmentsClient.createAppointment(payload);
      return ensureCitaShape(mapSicopAppointmentToSofiaCita(created) as Record<string, any>);
    } catch (error) {
      if (error instanceof SicopIntegrationError) {
        throw mapSicopError(error);
      }
      throw error;
    }
  },

  async update(id: string, data: Partial<{
    fecha: Date | string;
    hora: string;
    modalidad: Modalidad | string;
    motivo: string;
    estado: EstadoCita | string;
    estudianteId: string;
    usuarioNombre: string;
    usuarioTipoDocumento: string;
    usuarioNumeroDocumento: string;
    usuarioCorreo: string;
    usuarioTelefono: string;
  }>) {
    try {
      const payload: Record<string, unknown> = {};
      if (data.fecha !== undefined || data.hora !== undefined) {
        const fechaBase = data.fecha ?? new Date().toISOString();
        const horaBase = data.hora ?? '09:00';
        payload.fecha = buildDateTimeIso(fechaBase, horaBase);
        payload.hora = normalizeHora(horaBase);
      }

      if (data.modalidad !== undefined) payload.modalidad = String(data.modalidad).toUpperCase();
      if (data.motivo !== undefined) payload.motivo = data.motivo;
      if (data.estado !== undefined) payload.estado = normalizeEstadoInput(data.estado);
      if (data.estudianteId !== undefined) payload.estudianteId = data.estudianteId;
      if (data.usuarioNombre !== undefined) payload.usuarioNombre = data.usuarioNombre;
      if (data.usuarioTipoDocumento !== undefined) payload.usuarioTipoDocumento = data.usuarioTipoDocumento;
      if (data.usuarioNumeroDocumento !== undefined) payload.usuarioNumeroDocumento = data.usuarioNumeroDocumento;
      if (data.usuarioCorreo !== undefined) payload.usuarioCorreo = data.usuarioCorreo;
      if (data.usuarioTelefono !== undefined) payload.usuarioTelefono = data.usuarioTelefono;

      const updated = await sicopAppointmentsClient.updateAppointment(id, payload);
      return ensureCitaShape(mapSicopAppointmentToSofiaCita(updated) as Record<string, any>);
    } catch (error) {
      if (error instanceof SicopIntegrationError) {
        throw mapSicopError(error);
      }
      throw error;
    }
  },

  async delete(id: string) {
    try {
      await sicopAppointmentsClient.deleteAppointment(id);
    } catch (error) {
      if (error instanceof SicopIntegrationError) {
        throw mapSicopError(error);
      }
      throw error;
    }
  },

  async cancelar(id: string, motivo?: string) {
    return this.update(id, {
      estado: 'CANCELADA',
      motivo: motivo || 'Cancelada desde SOFIA',
    });
  },

  async reprogramar(id: string, nuevaFecha: Date | string, nuevaHora: string) {
    return this.update(id, {
      fecha: nuevaFecha,
      hora: nuevaHora,
      estado: 'AGENDADA',
    });
  },

  async getStats() {
    try {
      return await sicopAppointmentsClient.getAppointmentsStats({ sourceSystem: 'SOFIA' });
    } catch (error) {
      if (error instanceof SicopIntegrationError) {
        throw mapSicopError(error);
      }
      throw error;
    }
  },

  isServiceError(error: unknown): error is CitaServiceError {
    return error instanceof CitaServiceError;
  },
};

export default citaService;
