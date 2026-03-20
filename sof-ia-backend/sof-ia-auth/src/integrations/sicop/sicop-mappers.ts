import { SicopAppointment, SicopAuthUser, SicopUser } from './sicop.types';

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

function normalizeRol(value: unknown): 'ADMIN_CONSULTORIO' | 'ESTUDIANTE' | 'USUARIO' {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('admin') || raw.includes('administrativo')) return 'ADMIN_CONSULTORIO';
  if (raw.includes('estudiante') || raw.includes('student')) return 'ESTUDIANTE';
  return 'USUARIO';
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

function toIsoOrNow(value: unknown): string {
  const parsed = new Date(String(value || ''));
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function mapSicopAuthUserToSofiaAuthUser(raw: SicopAuthUser): {
  id: string;
  nombreCompleto: string;
  correo: string;
  rol: 'ADMIN_CONSULTORIO' | 'ESTUDIANTE' | 'USUARIO';
  primerIngreso: boolean;
} {
  const email = String(raw.email || '').trim();
  return {
    id: String(raw.id || email || 'sicop-user'),
    nombreCompleto: String(raw.fullName || raw.name || 'Usuario SICOP'),
    correo: email,
    rol: normalizeRol(raw.role),
    primerIngreso: Boolean(raw.primerIngreso ?? raw.firstLogin ?? false),
  };
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

export function mapSofiaStudentInputToSicopPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const correo = toStringOrNull(raw.correo);
  return {
    name: toStringOrNull(raw.nombre) || 'Estudiante SOFIA',
    fullName: toStringOrNull(raw.nombre) || 'Estudiante SOFIA',
    email: correo,
    phone: toStringOrNull(raw.telefono),
    area: toStringOrNull(raw.programa),
    modality: String(raw.modalidad || 'PRESENCIAL').toUpperCase(),
    status: String(raw.estado || 'ACTIVO').toUpperCase(),
    role: 'estudiante',
    document: toStringOrNull(raw.documento),
    metadata: {
      sourceSystem: 'SOFIA',
      estadoCuenta: toStringOrNull(raw.estadoCuenta),
      accesoCitas: raw.accesoCitas,
      acudimientos: raw.acudimientos,
      fechaInicio: raw.fechaInicio || null,
    },
  };
}

export function mapSofiaCitaToSicopPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const fechaHora = toStringOrNull(raw.fechaHora || raw.fecha || raw.date);
  const asunto = toStringOrNull(raw.asunto) || toStringOrNull(raw.motivo) || 'Cita SOFIA';

  return {
    fecha: fechaHora,
    date: fechaHora,
    fechaHora,
    hora: toStringOrNull(raw.hora),
    time: toStringOrNull(raw.hora),
    asunto,
    subject: asunto,
    modalidad: String(raw.modalidad || 'PRESENCIAL').toUpperCase(),
    mode: String(raw.modalidad || 'PRESENCIAL').toUpperCase(),
    motivo: toStringOrNull(raw.motivo),
    reason: toStringOrNull(raw.motivo),
    estado: String(raw.estado || 'AGENDADA').toUpperCase(),
    status: String(raw.estado || 'AGENDADA').toUpperCase(),
    estudianteId: toStringOrNull(raw.estudianteId),
    studentId: toStringOrNull(raw.estudianteId),
    usuarioNombre: toStringOrNull(raw.usuarioNombre),
    usuarioTipoDocumento: toStringOrNull(raw.usuarioTipoDocumento),
    usuarioNumeroDocumento: toStringOrNull(raw.usuarioNumeroDocumento),
    usuarioCorreo: toStringOrNull(raw.usuarioCorreo),
    usuarioTelefono: toStringOrNull(raw.usuarioTelefono),
    conversacionId: toStringOrNull(raw.conversacionId),
    enlaceReunion: toStringOrNull(raw.enlaceReunion),
    sourceSystem: 'SOFIA',
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
    fecha: toIsoOrNow(fecha),
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
    creadoEn: toIsoOrNow(raw.createdAt || raw.created_at || fecha),
    actualizadoEn: toIsoOrNow(raw.updatedAt || raw.updated_at || fecha),
    estudiante: {
      id: estudianteId,
      nombre: String(estudiante.name || estudiante.fullName || 'Estudiante'),
      correo: toStringOrNull(estudiante.email),
    },
  };
}
