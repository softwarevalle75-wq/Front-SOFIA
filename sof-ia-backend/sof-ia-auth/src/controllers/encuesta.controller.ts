import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const encuestaController = {
  async getAll(req: Request, res: Response) {
    try {
      const { page = 1, pageSize = 10 } = req.query;
      
      const skip = (Number(page) - 1) * Number(pageSize);
      
      const [encuestas, total] = await Promise.all([
        prisma.encuestaSatisfaccion.findMany({
          include: {
            estudiante: {
              select: { id: true, nombre: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(pageSize)
        }),
        prisma.encuestaSatisfaccion.count()
      ]);

      res.json({
        success: true,
        data: encuestas,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize))
        }
      });
    } catch (error) {
      console.error('Error getting encuestas:', error);
      res.status(500).json({ success: false, message: 'Error al obtener encuestas' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { estudianteId, conversacionId, calificacion, comentario, fuente } = req.body;
      
      const encuesta = await prisma.encuestaSatisfaccion.create({
        data: {
          estudianteId,
          conversacionId,
          calificacion,
          comentario,
          fuente: fuente || 'whatsapp',
          respondida: true
        }
      });

      // Actualizar métricas mensuales
      const now = new Date();
      await actualizarMetricasMensuales(now.getFullYear(), now.getMonth() + 1);

      res.status(201).json({ success: true, data: encuesta });
    } catch (error) {
      console.error('Error creating encuesta:', error);
      res.status(500).json({ success: false, message: 'Error al crear encuesta' });
    }
  },

  async getStats(req: Request, res: Response) {
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
          id: e.id,
          estudiante: e.estudiante?.nombre || 'Anónimo',
          calificacion: e.calificacion,
          comentario: e.comentario,
          createdAt: e.createdAt,
        }));

      const totalEncuestas = combined.length;
      const distribucion: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      combined.forEach((d) => {
        if (d.calificacion >= 1 && d.calificacion <= 5) {
          distribucion[d.calificacion] += 1;
        }
      });

      const calificacionPromedio = totalEncuestas > 0
        ? Number((combined.reduce((acc, cur) => acc + cur.calificacion, 0) / totalEncuestas).toFixed(1))
        : 0;

      const ultimasEncuestas = combined
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      res.json({
        success: true,
        data: {
          calificacionPromedio,
          totalEncuestas,
          distribucion,
          comentarios: ultimasEncuestas
            .filter((e) => e.comentario)
            .map((e) => ({
              usuario: e.estudiante,
              calificacion: e.calificacion,
              comentario: e.comentario,
            })),
          ultimasEncuestas: ultimasEncuestas.map(e => ({
            id: e.id,
            estudiante: e.estudiante,
            calificacion: e.calificacion,
            comentario: e.comentario,
            createdAt: e.createdAt
          }))
        }
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
  }
};

async function actualizarMetricasMensuales(anio: number, mes: number) {
  const inicioMes = new Date(anio, mes - 1, 1);
  const finMes = new Date(anio, mes, 0, 23, 59, 59);

  const [totalEncuestas, avgSatisfaccion] = await Promise.all([
    prisma.encuestaSatisfaccion.count({
      where: {
        createdAt: { gte: inicioMes, lte: finMes }
      }
    }),
    prisma.encuestaSatisfaccion.aggregate({
      where: {
        createdAt: { gte: inicioMes, lte: finMes }
      },
      _avg: { calificacion: true }
    })
  ]);

  await prisma.metricaMensual.upsert({
    where: { anio_mes: { anio, mes } },
    update: {
      totalEncuestas,
      promedioSatisfaccion: avgSatisfaccion._avg.calificacion || 0
    },
    create: {
      anio,
      mes,
      totalEncuestas,
      promedioSatisfaccion: avgSatisfaccion._avg.calificacion || 0
    }
  });
}

type ChatbotSurveyEntry = {
  id: string;
  estudiante: string;
  calificacion: number;
  comentario: string | null;
  createdAt: Date;
};

async function fetchChatbotSurveyEntries(): Promise<ChatbotSurveyEntry[]> {
  const rowsFromDb = await prisma.encuestaSatisfaccion.findMany({
    where: { respondida: true, fuente: 'chatbot' },
    orderBy: { createdAt: 'desc' },
  });

  if (rowsFromDb.length > 0) {
    return rowsFromDb.map((row) => ({
      id: row.id,
      estudiante: 'Usuario chatbot',
      calificacion: row.calificacion,
      comentario: row.comentario,
      createdAt: row.createdAt,
    }));
  }

  const rows = await prisma.$queryRawUnsafe<Array<{ conversationId: string; ratingText: string | null; commentText: string | null; createdAtText: string | null; usuario: string | null }>>(
    `
    SELECT
      c.id AS "conversationId",
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
      const calificacion = Number.parseInt(String(row.ratingText || ''), 10);
      if (!Number.isFinite(calificacion) || calificacion < 1 || calificacion > 5) return null;
      return {
        id: `chatbot-${row.conversationId}`,
        estudiante: row.usuario || 'Usuario chatbot',
        calificacion,
        comentario: row.commentText || null,
        createdAt: row.createdAtText ? new Date(row.createdAtText) : new Date(),
      } as ChatbotSurveyEntry;
    })
    .filter((item): item is ChatbotSurveyEntry => Boolean(item));
}
