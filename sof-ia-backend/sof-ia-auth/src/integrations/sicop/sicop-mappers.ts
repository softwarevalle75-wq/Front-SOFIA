import { SicopAppointment, SicopUser } from './sicop.types';

function normalizeModalidad(value: unknown): 'PRESENCIAL' | 'VIRTUAL' {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('virtual') || raw === 'remote' || raw === 'online') {
    return 'VIRTUAL';
  }
  return 'PRESENCIAL';
}

function normalizeEstado(value: unknown): 'ACTIVO' | 'INACTIVO' {
  const raw = String(value || '').toLowerCase();
  if (['inactive', 'inactivo', 'disabled', 'suspended'].includes(raw)) {
    return 'INACTIVO';
  }
  return 'ACTIVO';
}

function normalizeCitaEstado(value: unknown): 'AGENDADA' | 'CANCELADA' | 'COMPLETIDA' {
  const raw = String(value || '').toLowerCase();
  if (['cancelada', 'cancelled', 'canceled'].includes(raw)) return 'CANCELADA';
  if (['completada', 'completed', 'done', 'finalizada'].includes(raw)) return 'COMPLETIDA';
  return 'AGENDADA';
}

function extractDateAndHour(raw: SicopAppointment): { fecha: string; hora: string } {
  const rawHora = String(
    raw.hora ||
      raw.time ||
      raw.startTime ||
      raw.appointmentTime ||
      '',
  ).trim();

  const rawFecha =
    raw.fecha ||
    raw.date ||
    raw.startDate ||
    raw.startAt ||
    raw.startsAt ||
    raw.appointmentDate ||
    raw.createdAt ||
    new Date().toISOString();

  const parsed = new Date(String(rawFecha));
  const fechaIso = Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();

  const fecha = fechaIso;
  const hora = /^\d{1,2}:\d{2}$/.test(rawHora)
    ? rawHora
    : `${String(parsed.getUTCHours()).padStart(2, '0')}:${String(parsed.getUTCMinutes()).padStart(2, '0')}`;

  return { fecha, hora };
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const parsed = String(value).trim();
  return parsed || null;
}

export function mapSicopUserToSofiaStudent(raw: SicopUser): Record<string, unknown> {
  const estado = normalizeEstado(raw.estado || raw.status);
  const documento =
    String(raw.documento || raw.document || raw.id || '').trim() ||
    `sicop-${String(raw.email || 'sin-documento').trim()}`;

  return {
    id: String(raw.id || documento),
    documento,
    nombre: String(raw.name || raw.fullName || 'Sin nombre'),
    correo: toStringOrNull(raw.email),
    telefono: toStringOrNull(raw.telefono || raw.phone),
    programa: toStringOrNull(raw.area),
    modalidad: normalizeModalidad(raw.modalidad || raw.modality),
    estado,
    estadoCuenta: estado === 'ACTIVO' ? 'Activo' : 'Inactivo',
    accesoCitas: estado === 'ACTIVO',
    acudimientos: false,
    fechaInicio: null,
    creadoEn: raw.createdAt || new Date().toISOString(),
    actualizadoEn: raw.updatedAt || new Date().toISOString(),
  };
}

export function mapSicopAppointmentToSofiaCita(raw: SicopAppointment): Record<string, unknown> {
  const estudiante =
    (raw.estudiante as Record<string, unknown> | undefined) ||
    (raw.student as Record<string, unknown> | undefined) ||
    (raw.user as Record<string, unknown> | undefined) ||
    {};

  const { fecha, hora } = extractDateAndHour(raw);

  const estado = normalizeCitaEstado(raw.estado || raw.status);
  const modalidad = normalizeModalidad(raw.modalidad || raw.mode || raw.channel);

  const estudianteId = String(
    raw.estudianteId ||
      raw.studentId ||
      raw.userId ||
      estudiante.id ||
      'sicop-unassigned',
  );

  return {
    id: String(raw.id || `${estudianteId}-${fecha}-${hora}`),
    estudianteId,
    fecha,
    hora,
    modalidad,
    motivo: String(raw.motivo || raw.reason || raw.subject || ''),
    estado,
    usuarioNombre: toStringOrNull(raw.usuarioNombre || raw.requestedBy),
    usuarioTipoDocumento: toStringOrNull(raw.usuarioTipoDocumento),
    usuarioNumeroDocumento: toStringOrNull(raw.usuarioNumeroDocumento),
    usuarioCorreo: toStringOrNull(raw.usuarioCorreo),
    usuarioTelefono: toStringOrNull(raw.usuarioTelefono),
    enlaceReunion: toStringOrNull(raw.enlaceReunion || raw.meetingLink),
    creadoEn: raw.createdAt || fecha,
    actualizadoEn: raw.updatedAt || fecha,
    estudiante: {
      id: estudianteId,
      nombre: String(estudiante.name || estudiante.fullName || 'Estudiante'),
      correo: toStringOrNull(estudiante.email),
    },
  };
}
