import { PrismaClient, Modalidad, EstadoCita } from '@prisma/client';

const prisma = new PrismaClient();

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

export const citaService = {
  async getAll(filtros?: {
    estudianteId?: string;
    estado?: EstadoCita;
    modalidad?: Modalidad;
  }) {
    const where: any = {};
    
    if (filtros?.estudianteId) {
      where.estudianteId = filtros.estudianteId;
    }
    if (filtros?.estado) {
      where.estado = filtros.estado;
    }
    if (filtros?.modalidad) {
      where.modalidad = filtros.modalidad;
    }

    return await prisma.cita.findMany({
      where,
      include: {
        estudiante: true,
      },
      orderBy: { fecha: 'desc' },
    });
  },

  async getById(id: string) {
    return await prisma.cita.findUnique({
      where: { id },
      include: {
        estudiante: true,
      },
    });
  },

  async create(data: {
    estudianteId: string;
    fecha: Date;
    hora: string;
    modalidad: Modalidad;
    motivo?: string;
    usuarioNombre?: string;
    usuarioTipoDocumento?: string;
    usuarioNumeroDocumento?: string;
    usuarioCorreo?: string;
    usuarioTelefono?: string;
  }) {
    return await prisma.cita.create({
      data: {
        estudianteId: data.estudianteId,
        fecha: data.fecha,
        hora: data.hora,
        modalidad: data.modalidad,
        motivo: data.motivo,
        estado: 'AGENDADA',
        usuarioNombre: data.usuarioNombre,
        usuarioTipoDocumento: data.usuarioTipoDocumento,
        usuarioNumeroDocumento: data.usuarioNumeroDocumento,
        usuarioCorreo: data.usuarioCorreo,
        usuarioTelefono: data.usuarioTelefono,
      },
      include: {
        estudiante: true,
      },
    });
  },

  async update(id: string, data: Partial<{
    fecha: Date;
    hora: string;
    modalidad: Modalidad;
    motivo: string;
    estado: EstadoCita;
  }>) {
    return await prisma.cita.update({
      where: { id },
      data,
      include: {
        estudiante: true,
      },
    });
  },

  async delete(id: string) {
    return await prisma.cita.delete({
      where: { id },
    });
  },

  async cancelar(id: string, motivo?: string) {
    return await prisma.cita.update({
      where: { id },
      data: {
        estado: 'CANCELADA',
        motivo: motivo || 'Cancelado por el administrador',
      },
      include: {
        estudiante: true,
      },
    });
  },

  async reprogramar(id: string, nuevaFecha: Date, nuevaHora: string) {
    return await prisma.cita.update({
      where: { id },
      data: {
        fecha: nuevaFecha,
        hora: nuevaHora,
        motivo: `Reprogramado: fecha anterior modificada`,
      },
      include: {
        estudiante: true,
      },
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
};

export default citaService;
