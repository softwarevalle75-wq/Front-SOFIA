import { EstadoCita, Modalidad, Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BOGOTA_TZ_OFFSET = '-05:00';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const MODALIDAD_SLOTS: Record<Modalidad, string[]> = {
  PRESENCIAL: ['13:00', '14:00', '15:00', '16:00', '17:00'],
  VIRTUAL: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
};

class CitaServiceError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'CitaServiceError';
  }
}

type ChatbotStoredAppointment = {
  mode: 'presencial' | 'virtual';
  status: 'agendada' | 'cancelada';
  day: string;
  hour24: number;
  updatedAt: string;
};

function parseChatbotAppointmentsFromProfile(profile: any): ChatbotStoredAppointment[] {
  const fromList = Array.isArray(profile?.lastAppointments) ? profile.lastAppointments : [];
  const fromLast = profile?.lastAppointment ? [profile.lastAppointment] : [];
  const source = [...fromList, ...fromLast];

  const parsed = source
    .map((item: any) => {
      const mode = String(item?.mode || '').toLowerCase();
      const status = String(item?.status || 'agendada').toLowerCase();
      const day = String(item?.day || '').toLowerCase();
      const hour24 = typeof item?.hour24 === 'number' ? item.hour24 : Number.NaN;
      const updatedAt = typeof item?.updatedAt === 'string' ? item.updatedAt : '';

      const validMode = mode === 'presencial' || mode === 'virtual';
      const validStatus = status === 'agendada' || status === 'cancelada';
      const validDay = ['lunes', 'martes', 'miercoles', 'miércoles', 'jueves', 'viernes'].includes(day);
      const validHour = Number.isFinite(hour24) && hour24 >= 0 && hour24 <= 23;
      if (!validMode || !validStatus || !validDay || !validHour || !updatedAt) return null;

      return {
        mode,
        status,
        day,
        hour24,
        updatedAt,
      } as ChatbotStoredAppointment;
    })
    .filter((item: ChatbotStoredAppointment | null): item is ChatbotStoredAppointment => Boolean(item));

  const dedup = new Map<string, ChatbotStoredAppointment>();
  for (const item of parsed) {
    const key = `${item.updatedAt}|${item.day}|${item.hour24}|${item.mode}|${item.status}`;
    if (!dedup.has(key)) dedup.set(key, item);
  }

  return Array.from(dedup.values());
}

async function fetchChatbotAppointmentStats() {
  const rows = await prisma.$queryRawUnsafe<Array<{ conversationId: string; contextData: any }>>(
    `
    SELECT
      c.id AS "conversationId",
      ctx.data AS "contextData"
    FROM "Conversation" c
    JOIN "ConversationContext" ctx ON ctx."conversationId" = c.id
    WHERE
      (ctx.data -> 'profile' -> 'lastAppointment') IS NOT NULL
      OR jsonb_typeof(ctx.data -> 'profile' -> 'lastAppointments') = 'array'
    `,
  );

  const unique = new Map<string, ChatbotStoredAppointment>();
  for (const row of rows) {
    const profile = row.contextData?.profile || {};
    const appointments = parseChatbotAppointmentsFromProfile(profile);
    for (const item of appointments) {
      const key = `${row.conversationId}|${item.updatedAt}|${item.day}|${item.hour24}|${item.mode}|${item.status}`;
      if (!unique.has(key)) unique.set(key, item);
    }
  }

  const all = Array.from(unique.values());
  const agendadas = all.filter((x) => x.status === 'agendada');

  return {
    total: all.length,
    agendadas: agendadas.length,
    canceladas: all.filter((x) => x.status === 'cancelada').length,
    presencial: agendadas.filter((x) => x.mode === 'presencial').length,
    virtual: agendadas.filter((x) => x.mode === 'virtual').length,
  };
}

function normalizeHora(hora: string): string {
  const trimmed = String(hora || '').trim();
  const match = /^(\d{1,2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) throw new CitaServiceError('INVALID_HOUR', 'La hora no tiene un formato válido (HH:00).');

  const hh = Number(match[1]);
  const mm = Number(match[2] ?? '0');
  if (!Number.isInteger(hh) || hh < 0 || hh > 23 || mm !== 0) {
    throw new CitaServiceError('INVALID_HOUR', 'La hora no tiene un formato válido (HH:00).');
  }

  return `${String(hh).padStart(2, '0')}:00`;
}

function formatDateInBogota(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((item) => item.type === 'year')?.value;
  const month = parts.find((item) => item.type === 'month')?.value;
  const day = parts.find((item) => item.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new CitaServiceError('INVALID_DATE', 'No fue posible interpretar la fecha de la cita.');
  }

  return `${year}-${month}-${day}`;
}

function resolveDateKey(fecha: Date | string): string {
  if (typeof fecha === 'string') {
    const normalized = fecha.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      throw new CitaServiceError('INVALID_DATE', 'La fecha no es válida. Usa formato YYYY-MM-DD.');
    }
    return formatDateInBogota(parsed);
  }

  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
    throw new CitaServiceError('INVALID_DATE', 'La fecha no es válida.');
  }
  return formatDateInBogota(fecha);
}

function buildDayRange(fecha: Date | string): { dayKey: string; start: Date; end: Date; dayOfWeek: number } {
  const dayKey = resolveDateKey(fecha);
  const start = new Date(`${dayKey}T00:00:00${BOGOTA_TZ_OFFSET}`);
  const end = new Date(start.getTime() + ONE_DAY_MS);

  if (Number.isNaN(start.getTime())) {
    throw new CitaServiceError('INVALID_DATE', 'La fecha no es válida.');
  }

  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'America/Bogota',
  }).format(start);

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = weekdayMap[weekday] ?? 0;

  return { dayKey, start, end, dayOfWeek };
}

function getSlotLockKey(dayKey: string, hora: string, modalidad: Modalidad): number {
  const raw = `${dayKey}|${hora}|${modalidad}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(hash || 1);
}

async function getOccupiedHours(params: {
  tx: PrismaClient | Prisma.TransactionClient;
  start: Date;
  end: Date;
  modalidad: Modalidad;
  excludeCitaId?: string;
}): Promise<string[]> {
  const citas = await params.tx.cita.findMany({
    where: {
      fecha: {
        gte: params.start,
        lt: params.end,
      },
      modalidad: params.modalidad,
      estado: 'AGENDADA',
      ...(params.excludeCitaId ? { id: { not: params.excludeCitaId } } : {}),
    },
    select: { hora: true },
  });

  return Array.from(new Set(citas.map((item) => normalizeHora(item.hora))));
}

async function getEligibleStudents(params: {
  tx: PrismaClient | Prisma.TransactionClient;
  modalidad: Modalidad;
  occupiedStudentIds: string[];
}) {
  return params.tx.estudiante.findMany({
    where: {
      modalidad: params.modalidad,
      estado: 'ACTIVO',
      accesoCitas: true,
      ...(params.occupiedStudentIds.length > 0 ? { id: { notIn: params.occupiedStudentIds } } : {}),
    },
    select: {
      id: true,
    },
  });
}

export const citaService = {
  async getAll(filtros?: {
    estudianteId?: string;
    estado?: EstadoCita;
    modalidad?: Modalidad;
  }) {
    const where: any = {};

    if (filtros?.estudianteId) where.estudianteId = filtros.estudianteId;
    if (filtros?.estado) where.estado = filtros.estado;
    if (filtros?.modalidad) where.modalidad = filtros.modalidad;

    return prisma.cita.findMany({
      where,
      include: { estudiante: true },
      orderBy: { fecha: 'desc' },
    });
  },

  async getById(id: string) {
    return prisma.cita.findUnique({
      where: { id },
      include: { estudiante: true },
    });
  },

  async getDisponibilidad(fecha: Date | string, modalidad: Modalidad): Promise<{
    fechaDisponible: boolean;
    horasDisponibles: string[];
    motivoIndisponibilidad?: string;
  }> {
    const range = buildDayRange(fecha);
    if (range.dayOfWeek === 0 || range.dayOfWeek === 6) {
      return {
        fechaDisponible: false,
        horasDisponibles: [],
        motivoIndisponibilidad: 'No se atiende fines de semana.',
      };
    }

    const slots = MODALIDAD_SLOTS[modalidad] ?? [];
    if (slots.length === 0) {
      return {
        fechaDisponible: false,
        horasDisponibles: [],
        motivoIndisponibilidad: 'No hay jornada configurada para la modalidad seleccionada.',
      };
    }

    const occupied = await getOccupiedHours({
      tx: prisma,
      start: range.start,
      end: range.end,
      modalidad,
    });

    const occupiedSet = new Set(occupied);
    const horasDisponibles = slots.filter((slot) => !occupiedSet.has(slot));

    return {
      fechaDisponible: horasDisponibles.length > 0,
      horasDisponibles,
      ...(horasDisponibles.length === 0 ? { motivoIndisponibilidad: 'No hay cupos disponibles para esa fecha.' } : {}),
    };
  },

  async create(data: {
    fecha: Date | string;
    hora: string;
    modalidad: Modalidad;
    motivo?: string;
    usuarioNombre?: string;
    usuarioTipoDocumento?: string;
    usuarioNumeroDocumento?: string;
    usuarioCorreo?: string;
    usuarioTelefono?: string;
  }) {
    const normalizedHora = normalizeHora(data.hora);
    const range = buildDayRange(data.fecha);
    if (range.dayOfWeek === 0 || range.dayOfWeek === 6) {
      throw new CitaServiceError('INVALID_DATE', 'No se pueden agendar citas los fines de semana.');
    }

    return prisma.$transaction(async (tx) => {
      const lockKey = getSlotLockKey(range.dayKey, normalizedHora, data.modalidad);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

      const slots = MODALIDAD_SLOTS[data.modalidad] ?? [];
      const occupiedHours = await getOccupiedHours({
        tx,
        start: range.start,
        end: range.end,
        modalidad: data.modalidad,
      });
      const occupiedHourSet = new Set(occupiedHours);
      const availableHours = slots.filter((slot) => !occupiedHourSet.has(slot));

      if (!availableHours.includes(normalizedHora)) {
        throw new CitaServiceError('SLOT_NOT_AVAILABLE', 'La hora seleccionada no está disponible.');
      }

      const occupiedAtSlot = await tx.cita.findMany({
        where: {
          fecha: {
            gte: range.start,
            lt: range.end,
          },
          modalidad: data.modalidad,
          hora: normalizedHora,
          estado: 'AGENDADA',
        },
        select: { estudianteId: true },
      });

      const eligibleStudents = await getEligibleStudents({
        tx,
        modalidad: data.modalidad,
        occupiedStudentIds: occupiedAtSlot.map((item) => item.estudianteId),
      });

      if (eligibleStudents.length === 0) {
        throw new CitaServiceError(
          'NO_ELIGIBLE_STUDENTS',
          `No hay estudiantes elegibles en modalidad ${data.modalidad.toLowerCase()} para este horario.`,
        );
      }

      const picked = eligibleStudents[Math.floor(Math.random() * eligibleStudents.length)];

      return tx.cita.create({
        data: {
          estudianteId: picked.id,
          fecha: range.start,
          hora: normalizedHora,
          modalidad: data.modalidad,
          motivo: data.motivo,
          estado: 'AGENDADA',
          usuarioNombre: data.usuarioNombre,
          usuarioTipoDocumento: data.usuarioTipoDocumento,
          usuarioNumeroDocumento: data.usuarioNumeroDocumento,
          usuarioCorreo: data.usuarioCorreo,
          usuarioTelefono: data.usuarioTelefono,
        },
        include: { estudiante: true },
      });
    });
  },

  async update(id: string, data: Partial<{
    fecha: Date;
    hora: string;
    modalidad: Modalidad;
    motivo: string;
    estado: EstadoCita;
  }>) {
    return prisma.cita.update({
      where: { id },
      data,
      include: { estudiante: true },
    });
  },

  async delete(id: string) {
    return prisma.cita.delete({ where: { id } });
  },

  async cancelar(id: string, motivo?: string) {
    return prisma.cita.update({
      where: { id },
      data: {
        estado: 'CANCELADA',
        motivo: motivo || 'Cancelado por el administrador',
      },
      include: { estudiante: true },
    });
  },

  async reprogramar(id: string, nuevaFecha: Date | string, nuevaHora: string) {
    const citaActual = await prisma.cita.findUnique({ where: { id } });
    if (!citaActual) {
      throw new CitaServiceError('NOT_FOUND', 'Cita no encontrada.');
    }

    const normalizedHora = normalizeHora(nuevaHora);
    const range = buildDayRange(nuevaFecha);
    if (range.dayOfWeek === 0 || range.dayOfWeek === 6) {
      throw new CitaServiceError('INVALID_DATE', 'No se pueden agendar citas los fines de semana.');
    }

    return prisma.$transaction(async (tx) => {
      const lockKey = getSlotLockKey(range.dayKey, normalizedHora, citaActual.modalidad);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

      const slots = MODALIDAD_SLOTS[citaActual.modalidad] ?? [];
      const occupiedHours = await getOccupiedHours({
        tx,
        start: range.start,
        end: range.end,
        modalidad: citaActual.modalidad,
        excludeCitaId: id,
      });
      const occupiedHourSet = new Set(occupiedHours);
      const availableHours = slots.filter((slot) => !occupiedHourSet.has(slot));

      if (!availableHours.includes(normalizedHora)) {
        throw new CitaServiceError('SLOT_NOT_AVAILABLE', 'La nueva hora seleccionada no está disponible.');
      }

      return tx.cita.update({
        where: { id },
        data: {
          fecha: range.start,
          hora: normalizedHora,
          motivo: 'Reprogramado: fecha anterior modificada',
        },
        include: { estudiante: true },
      });
    });
  },

  async getStats() {
    const total = await prisma.cita.count();
    const agendadas = await prisma.cita.count({ where: { estado: 'AGENDADA' } });
    const canceladas = await prisma.cita.count({ where: { estado: 'CANCELADA' } });
    const completadas = await prisma.cita.count({ where: { estado: 'COMPLETIDA' } });

    const presencial = await prisma.cita.count({ where: { modalidad: 'PRESENCIAL' } });
    const virtual = await prisma.cita.count({ where: { modalidad: 'VIRTUAL' } });

    const chatbotStats = await fetchChatbotAppointmentStats();
    const chatbotTotal = Number(chatbotStats.total || 0);
    const chatbotAgendadas = Number(chatbotStats.agendadas || 0);
    const chatbotCanceladas = Number(chatbotStats.canceladas || 0);
    const chatbotPresencial = Number(chatbotStats.presencial || 0);
    const chatbotVirtual = Number(chatbotStats.virtual || 0);

    return {
      total: total + chatbotTotal,
      agendadas: agendadas + chatbotAgendadas,
      canceladas: canceladas + chatbotCanceladas,
      completadas,
      presencial: presencial + chatbotPresencial,
      virtual: virtual + chatbotVirtual,
    };
  },

  isServiceError(error: unknown): error is CitaServiceError {
    return error instanceof CitaServiceError;
  },
};

export default citaService;
