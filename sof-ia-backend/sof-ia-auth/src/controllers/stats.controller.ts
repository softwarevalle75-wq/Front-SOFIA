import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  ChatbotMessageItem,
  isConsultationDeleted,
  segmentConsultationsByMarkers,
} from '../utils/chatbot-consultation.utils';

const prisma = new PrismaClient();

type ChatbotAppointmentAggregate = {
  total: number;
  agendadas: number;
  canceladas: number;
  presencial: number;
  virtual: number;
};

export const statsController = {
  async getDashboardStats(req: Request, res: Response) {
    try {
      const { periodo = 'month', origenCitas } = req.query;
      
      const now = new Date();
      let fechaInicio: Date;
      
      switch (periodo) {
        case 'week':
          fechaInicio = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          fechaInicio = new Date(now.getFullYear(), 0, 1);
          break;
        default: // month
          fechaInicio = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const [
        totalEstudiantes,
        estudiantesActivos,
        estudiantesNuevos,
        totalCitas,
        citasAgendadas,
        citasCompletadas,
        citasCanceladas,
        totalConversaciones,
        metricasMensuales,
        chatbotAppointments,
        chatbotConsultas
      ] = await Promise.all([
        prisma.estudiante.count(),
        prisma.estudiante.count({ where: { estado: 'ACTIVO' } }),
        prisma.estudiante.count({ where: { creadoEn: { gte: fechaInicio } } }),
        prisma.cita.count(),
        prisma.cita.count({ where: { estado: 'AGENDADA' } }),
        prisma.cita.count({ where: { estado: 'COMPLETIDA' } }),
        prisma.cita.count({ where: { estado: 'CANCELADA' } }),
        prisma.conversacion.count({ where: { createdAt: { gte: fechaInicio } } }),
        prisma.metricaMensual.findFirst({
          orderBy: [
            { anio: 'desc' },
            { mes: 'desc' }
          ]
        }),
        fetchChatbotAppointmentStats(),
        fetchChatbotConsultationCount(),
      ]);

      const chatbotTotal = Number(chatbotAppointments.total || 0);
      const chatbotAgendadas = Number(chatbotAppointments.agendadas || 0);
      const chatbotCanceladas = Number(chatbotAppointments.canceladas || 0);
      const chatbotPresencial = Number(chatbotAppointments.presencial || 0);
      const chatbotVirtual = Number(chatbotAppointments.virtual || 0);
      const chatbotConsultasRealizadas = Number(chatbotConsultas || 0);
      const source = String(origenCitas || '').toLowerCase();
      const chatbotOnly = source === 'chatbot';
      const sistemaOnly = source === 'sistema';

      const totalCitasAjustado = chatbotOnly
        ? chatbotTotal
        : sistemaOnly
          ? totalCitas
          : totalCitas + chatbotTotal;

      const citasAgendadasAjustado = chatbotOnly
        ? chatbotAgendadas
        : sistemaOnly
          ? citasAgendadas
          : citasAgendadas + chatbotAgendadas;

      const citasCanceladasAjustado = chatbotOnly
        ? chatbotCanceladas
        : sistemaOnly
          ? citasCanceladas
          : citasCanceladas + chatbotCanceladas;

      const citasCompletadasAjustado = chatbotOnly ? 0 : citasCompletadas;
      const consultasRealizadasAjustado = chatbotOnly
        ? chatbotConsultasRealizadas
        : sistemaOnly
          ? citasCompletadas
          : citasCompletadas + chatbotConsultasRealizadas;

      const todasCalificaciones = chatbotOnly
        ? (await fetchChatbotSurveyEntries()).map((x) => x.calificacion)
        : (await prisma.encuestaSatisfaccion.findMany({
          where: { respondida: true },
          select: { calificacion: true },
        })).map((x: { calificacion: number }) => x.calificacion);
      const satisfaccionPromedio = todasCalificaciones.length > 0
        ? Number((todasCalificaciones.reduce((acc, cur) => acc + cur, 0) / todasCalificaciones.length).toFixed(1))
        : 0;

      const citasPresencialAgendadas = await prisma.cita.count({
        where: { estado: 'AGENDADA', modalidad: 'PRESENCIAL' },
      });

      const citasVirtualAgendadas = await prisma.cita.count({
        where: { estado: 'AGENDADA', modalidad: 'VIRTUAL' },
      });

      // Datos para gráficos
      const usageData = await getUsageData(periodo as string);
      const growthData = await getGrowthData(periodo as string);
      const satisfactionData = await getSatisfactionData(chatbotOnly);

      res.json({
        success: true,
        data: {
          totalUsers: totalEstudiantes,
          activeUsers: estudiantesActivos,
          totalConsultations: consultasRealizadasAjustado,
          pendingAppointments: citasAgendadasAjustado,
          cancelledAppointments: citasCanceladasAjustado,
          activityChange: totalEstudiantes > 0 ? (estudiantesNuevos / totalEstudiantes) * 100 : 0,
          appointmentsChange: 0,
          satisfactionRate: satisfaccionPromedio,
          retentionRate: totalCitasAjustado > 0 ? (citasCompletadasAjustado / totalCitasAjustado) * 100 : 0,
          newUsersThisMonth: estudiantesNuevos,
          modalityData: [
            {
              name: 'Presencial',
              value: chatbotOnly
                ? chatbotPresencial
                : sistemaOnly
                  ? citasPresencialAgendadas
                  : citasPresencialAgendadas + chatbotPresencial,
              color: '#1A1F71',
            },
            {
              name: 'Virtual',
              value: chatbotOnly
                ? chatbotVirtual
                : sistemaOnly
                  ? citasVirtualAgendadas
                  : citasVirtualAgendadas + chatbotVirtual,
              color: '#FFCD00',
            }
          ],
          usageData,
          growthData,
          satisfactionData
        }
      });
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      res.status(500).json({ success: false, message: 'Error al obtener estadísticas del dashboard' });
    }
  },

  async getSatisfaccionStats(req: Request, res: Response) {
    try {
      const { origen } = req.query;
      const chatbotOnly = String(origen || '').toLowerCase() === 'chatbot';

      const combined = chatbotOnly
        ? await fetchChatbotSurveyEntries()
        : (await prisma.encuestaSatisfaccion.findMany({
          where: { respondida: true },
          include: {
            estudiante: {
              select: { nombre: true },
            },
          },
        })).map((e) => ({
          calificacion: e.calificacion,
          comentario: e.comentario,
          usuario: e.estudiante?.nombre || 'Anónimo',
          createdAt: e.createdAt,
        }));

      const totalEncuestas = combined.length;
      const distribucion: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      combined.forEach((item) => {
        if (item.calificacion >= 1 && item.calificacion <= 5) {
          distribucion[item.calificacion] += 1;
        }
      });

      const calificacionPromedio = totalEncuestas > 0
        ? Number((combined.reduce((acc, cur) => acc + cur.calificacion, 0) / totalEncuestas).toFixed(1))
        : 0;

      const ultimosComentarios = combined
        .filter((x) => x.comentario)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      res.json({
        success: true,
        data: {
          calificacionPromedio,
          totalEncuestas,
          distribucion,
          comentarios: ultimosComentarios.map(e => ({
            usuario: e.usuario,
            calificacion: e.calificacion,
            comentario: e.comentario
          }))
        }
      });
    } catch (error) {
      console.error('Error getting satisfaccion stats:', error);
      res.status(500).json({ success: false, message: 'Error al obtener estadísticas de satisfacción' });
    }
  },

  async getConversacionesStats(req: Request, res: Response) {
    try {
      const now = new Date();
      const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const total = await prisma.conversacion.count();
      const esteMes = await prisma.conversacion.count({ where: { createdAt: { gte: inicioMes } } });
      
      const porCanal = await prisma.conversacion.groupBy({
        by: ['canal'],
        _count: true
      });

      const porConsultorio = await prisma.conversacion.groupBy({
        by: ['consultorio'],
        _count: true
      });

      res.json({
        success: true,
        data: {
          total,
          esteMes,
          porCanal: porCanal.map(p => ({ canal: p.canal, count: p._count })),
          porConsultorio: porConsultorio.map(p => ({ consultorio: p.consultorio, count: p._count }))
        }
      });
    } catch (error) {
      console.error('Error getting conversaciones stats:', error);
      res.status(500).json({ success: false, message: 'Error al obtener estadísticas de conversaciones' });
    }
  }
};

async function getUsageData(periodo: string) {
  const now = new Date();
  const data = [];
  let dataPoints: number;

  switch (periodo) {
    case 'week': dataPoints = 7; break;
    case 'year': dataPoints = 12; break;
    default: dataPoints = 30;
  }

  for (let i = dataPoints - 1; i >= 0; i--) {
    const date = new Date(now);
    if (periodo === 'year') {
      date.setMonth(date.getMonth() - i);
    } else {
      date.setDate(date.getDate() - i);
    }
    
    const fechaInicio = new Date(date);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(date);
    fechaFin.setHours(23, 59, 59, 999);

    const countSistema = await prisma.conversacion.count({
      where: { createdAt: { gte: fechaInicio, lte: fechaFin } }
    });

    let countChatbot = 0;
    try {
      const chatbotRows = await prisma.$queryRawUnsafe<Array<{ total: number }>>(
        `
        SELECT COUNT(*)::int AS total
        FROM "Conversation" c
        WHERE c."createdAt" >= $1::timestamptz
          AND c."createdAt" <= $2::timestamptz
        `,
        fechaInicio.toISOString(),
        fechaFin.toISOString(),
      );
      countChatbot = Number(chatbotRows[0]?.total || 0);
    } catch {
      countChatbot = 0;
    }

    data.push({
      date: fechaInicio.toISOString().split('T')[0],
      value: countSistema + countChatbot
    });
  }

  return data;
}

async function getGrowthData(periodo: string) {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const now = new Date();
  const data = [];

  for (let i = 11; i >= 0; i--) {
    const fecha = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const fechaFin = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const estudiantesNuevos = await prisma.estudiante.count({
      where: { creadoEn: { gte: fecha, lte: fechaFin } }
    });

    const usuariosNuevos = await prisma.usuario.count({
      where: { creadoEn: { gte: fecha, lte: fechaFin } }
    });

    data.push({
      name: months[fecha.getMonth()],
      value: estudiantesNuevos + usuariosNuevos
    });
  }

  return data;
}

async function fetchChatbotConsultationCount(): Promise<number> {
  const conversationRows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    contextData: Record<string, unknown> | null;
  }>>(
    `
    SELECT
      c.id,
      cc.data AS "contextData"
    FROM "Conversation" c
    LEFT JOIN LATERAL (
      SELECT ctx.data
      FROM "ConversationContext" ctx
      WHERE ctx."conversationId" = c.id
      ORDER BY ctx.version DESC
      LIMIT 1
    ) cc ON true
    `,
  );

  const conversationIds = conversationRows.map((row) => row.id).filter(Boolean);
  if (conversationIds.length === 0) return 0;

  const placeholders = conversationIds.map((_id, index) => `$${index + 1}`).join(', ');
  const messageRows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    conversationId: string;
    direction: 'IN' | 'OUT';
    text: string;
    createdAt: Date | string;
  }>>(
    `
    SELECT
      m.id,
      m."conversationId" AS "conversationId",
      m."direction" AS "direction",
      COALESCE(m.text, '') AS text,
      m."createdAt" AS "createdAt"
    FROM "Message" m
    WHERE m."conversationId" IN (${placeholders})
    ORDER BY m."createdAt" ASC
    `,
    ...conversationIds,
  );

  const messagesByConversation = new Map<string, ChatbotMessageItem[]>();
  for (const message of messageRows) {
    const list = messagesByConversation.get(message.conversationId) || [];
    list.push(message);
    messagesByConversation.set(message.conversationId, list);
  }

  let total = 0;
  for (const row of conversationRows) {
    const messages = messagesByConversation.get(row.id) || [];
    const segments = segmentConsultationsByMarkers({
      conversationId: row.id,
      messages,
    });

    total += segments.filter((segment) => !isConsultationDeleted(row.contextData, segment.id)).length;
  }

  return total;
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

async function fetchChatbotAppointmentStats(): Promise<ChatbotAppointmentAggregate> {
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

type ChatbotSurveyEntry = {
  calificacion: number;
  comentario: string | null;
  usuario: string;
  createdAt: Date;
};

async function fetchChatbotSurveyEntries(): Promise<ChatbotSurveyEntry[]> {
  const rowsFromDb = await prisma.encuestaSatisfaccion.findMany({
    where: { respondida: true, fuente: 'chatbot' },
    orderBy: { createdAt: 'desc' },
  });

  if (rowsFromDb.length > 0) {
    return rowsFromDb.map((row) => ({
      calificacion: row.calificacion,
      comentario: row.comentario,
      usuario: 'Usuario chatbot',
      createdAt: row.createdAt,
    }));
  }

  const rows = await prisma.$queryRawUnsafe<Array<{ ratingText: string | null; commentText: string | null; createdAtText: string | null; usuario: string | null }>>(
    `
    SELECT
      (cc.data -> 'profile' -> 'survey' ->> 'rating') AS "ratingText",
      NULLIF(cc.data -> 'profile' -> 'survey' ->> 'comment', '') AS "commentText",
      COALESCE(cc.data -> 'profile' -> 'survey' ->> 'createdAt', cc."createdAt"::text) AS "createdAtText",
      COALESCE(ct."displayName", ct."externalId", 'Usuario chatbot') AS usuario
    FROM "Conversation" c
    LEFT JOIN "Contact" ct ON ct.id = c."contactId"
    JOIN LATERAL (
      SELECT ctx.data, ctx."createdAt"
      FROM "ConversationContext" ctx
      WHERE ctx."conversationId" = c.id
        AND (ctx.data -> 'profile' -> 'survey' ->> 'rating') IS NOT NULL
      ORDER BY ctx.version DESC
      LIMIT 1
    ) cc ON true
    `,
  );

  return rows
    .map((row) => {
      const rating = Number.parseInt(String(row.ratingText || ''), 10);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;
      const createdAt = row.createdAtText ? new Date(row.createdAtText) : new Date();
      return {
        calificacion: rating,
        comentario: row.commentText || null,
        usuario: row.usuario || 'Usuario chatbot',
        createdAt,
      } as ChatbotSurveyEntry;
    })
    .filter((item): item is ChatbotSurveyEntry => Boolean(item));
}

async function getSatisfactionData(chatbotOnly = false) {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
  const data = [];
  const chatbotEntries = chatbotOnly ? await fetchChatbotSurveyEntries() : [];

  for (let i = 0; i < 6; i++) {
    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() - (5 - i));
    const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0, 23, 59, 59);

    const encuestasDb = await prisma.encuestaSatisfaccion.findMany({
      where: { createdAt: { gte: inicio, lte: fin } },
      select: { calificacion: true },
    });

    const encuestasChatbot = chatbotEntries
      .filter((item) => item.createdAt >= inicio && item.createdAt <= fin)
      .map((item) => item.calificacion);

    const ratings = [
      ...(chatbotOnly ? [] : encuestasDb.map((e) => e.calificacion)),
      ...encuestasChatbot,
    ];

    const rating = ratings.length > 0
      ? Number((ratings.reduce((acc, cur) => acc + cur, 0) / ratings.length).toFixed(1))
      : 0;

    data.push({
      name: months[i],
      rating,
    });
  }

  return data;
}
