import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type OrchestratorResponseItem = {
  type?: string;
  text?: string;
  payload?: Record<string, unknown>;
};

type OrchestratorEnvelope = {
  success?: boolean;
  data?: {
    responses?: OrchestratorResponseItem[];
    conversationId?: string;
    contactId?: string;
    correlationId?: string;
  };
  message?: string;
};

function getOrchestratorBaseUrl(): string {
  return process.env.ORCHESTRATOR_SERVICE_URL || 'http://localhost:3021';
}

function getWebchatTenantId(): string {
  return process.env.WEBCHAT_TENANT_ID || 'tenant_ai_demo';
}

function normalizeExternalUserId(req: Request): string {
  const authUser = (req as Request & { user?: { userId?: string; email?: string } }).user;
  const body = req.body as { externalUserId?: unknown };
  const rawExternalId = typeof body.externalUserId === 'string' ? body.externalUserId.trim() : '';

  if (rawExternalId) return rawExternalId;
  if (authUser?.userId) return authUser.userId;
  if (authUser?.email) return authUser.email;

  const fallbackIp = req.ip || req.socket.remoteAddress || 'anonymous';
  return `web-${fallbackIp}`;
}

export const conversacionController = {
  async getAll(req: Request, res: Response) {
    try {
      const { page = 1, pageSize = 10, search, estado, canal, fechaInicio, fechaFin, origen } = req.query;

      if (origen === 'chatbot') {
        const whereClauses: string[] = ['1=1'];
        const whereParams: any[] = [];

        if (search) {
          const value = `%${String(search)}%`;
          whereParams.push(value, value, value);
          const base = whereParams.length - 2;
          whereClauses.push(`(
            COALESCE(ct."displayName", '') ILIKE $${base} OR
            COALESCE(ct."externalId", '') ILIKE $${base + 1} OR
            COALESCE(fm.text, '') ILIKE $${base + 2}
          )`);
        }

        if (canal) {
          const canalRaw = String(canal).toLowerCase();
          const canalValue = canalRaw === 'whatsapp' ? 'WHATSAPP' : canalRaw === 'web' ? 'WEBCHAT' : String(canal).toUpperCase();
          whereParams.push(canalValue);
          whereClauses.push(`c."channel" = $${whereParams.length}`);
        }

        if (estado) {
          const estadoRaw = String(estado).toLowerCase();
          if (estadoRaw === 'leido') {
            whereClauses.push(`c."status" = 'CLOSED'`);
          } else if (estadoRaw === 'no_leido') {
            whereClauses.push(`c."status" <> 'CLOSED'`);
          }
        }

        if (fechaInicio) {
          whereParams.push(new Date(String(fechaInicio)));
          whereClauses.push(`c."createdAt" >= $${whereParams.length}`);
        }

        if (fechaFin) {
          whereParams.push(new Date(String(fechaFin)));
          whereClauses.push(`c."createdAt" <= $${whereParams.length}`);
        }

        const skip = (Number(page) - 1) * Number(pageSize);
        const whereSql = whereClauses.join(' AND ');

        const totalResult = await prisma.$queryRawUnsafe<Array<{ total: number }>>(
          `
          SELECT COUNT(*)::int AS total
          FROM "Conversation" c
          LEFT JOIN "Contact" ct ON ct.id = c."contactId"
          LEFT JOIN LATERAL (
            SELECT m.text
            FROM "Message" m
            WHERE m."conversationId" = c.id
              AND m."direction" = 'IN'
            ORDER BY m."createdAt" ASC
            LIMIT 1
          ) fm ON true
          WHERE ${whereSql}
          `,
          ...whereParams,
        );

        const conversaciones = await prisma.$queryRawUnsafe<any[]>(
          `
          SELECT
            c.id,
            COALESCE(fm.text, 'Conversación de chatbot') AS "temaLegal",
            NULL::text AS consultorio,
            CASE WHEN c."status" = 'CLOSED' THEN 'leido' ELSE 'no_leido' END AS estado,
            CASE WHEN c."channel" = 'WHATSAPP' THEN 'whatsapp' ELSE 'web' END AS canal,
            fm.text AS "primerMensaje",
            NULL::text AS resumen,
            c."createdAt",
            json_build_object(
              'id', ct.id,
              'nombre', COALESCE(ct."displayName", ct."externalId", 'Usuario'),
              'documento', COALESCE(ct."externalId", '')
            ) AS estudiante
          FROM "Conversation" c
          LEFT JOIN "Contact" ct ON ct.id = c."contactId"
          LEFT JOIN LATERAL (
            SELECT m.text
            FROM "Message" m
            WHERE m."conversationId" = c.id
              AND m."direction" = 'IN'
            ORDER BY m."createdAt" ASC
            LIMIT 1
          ) fm ON true
          WHERE ${whereSql}
          ORDER BY c."createdAt" DESC
          LIMIT $${whereParams.length + 1}
          OFFSET $${whereParams.length + 2}
          `,
          ...whereParams,
          Number(pageSize),
          skip,
        );

        const total = Number(totalResult[0]?.total || 0);

        return res.json({
          success: true,
          data: conversaciones,
          pagination: {
            page: Number(page),
            pageSize: Number(pageSize),
            total,
            totalPages: Math.ceil(total / Number(pageSize)),
          },
        });
      }
      
      const where: any = {};
      
      if (search) {
        where.OR = [
          { temaLegal: { contains: search as string, mode: 'insensitive' } },
          { estudiante: { nombre: { contains: search as string, mode: 'insensitive' } } }
        ];
      }
      if (estado) where.estado = estado;
      if (canal) where.canal = canal;
      if (fechaInicio || fechaFin) {
        where.createdAt = {};
        if (fechaInicio) where.createdAt.gte = new Date(fechaInicio as string);
        if (fechaFin) where.createdAt.lte = new Date(fechaFin as string);
      }

      const skip = (Number(page) - 1) * Number(pageSize);
      
      const [conversaciones, total] = await Promise.all([
        prisma.conversacion.findMany({
          where,
          include: {
            estudiante: {
              select: { id: true, nombre: true, documento: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(pageSize)
        }),
        prisma.conversacion.count({ where })
      ]);

      res.json({
        success: true,
        data: conversaciones,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize))
        }
      });
    } catch (error) {
      console.error('Error getting conversaciones:', error);
      res.status(500).json({ success: false, message: 'Error al obtener conversaciones' });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { origen } = req.query;

      if (origen === 'chatbot') {
        const rows = await prisma.$queryRawUnsafe<any[]>(
          `
          SELECT
            c.id,
            COALESCE(fm.text, 'Conversacion de chatbot') AS "temaLegal",
            NULL::text AS consultorio,
            CASE WHEN c."status" = 'CLOSED' THEN 'leido' ELSE 'no_leido' END AS estado,
            CASE WHEN c."channel" = 'WHATSAPP' THEN 'whatsapp' ELSE 'web' END AS canal,
            fm.text AS "primerMensaje",
            COALESCE(
              NULLIF(cc.data ->> 'resumen', ''),
              NULLIF(cc.data ->> 'summary', ''),
              NULL
            ) AS resumen,
            c."createdAt",
            json_build_object(
              'id', ct.id,
              'nombre', COALESCE(ct."displayName", ct."externalId", 'Usuario'),
              'documento', COALESCE(ct."externalId", ''),
              'correo', NULL,
              'telefono', ct.phone
            ) AS estudiante
          FROM "Conversation" c
          LEFT JOIN "Contact" ct ON ct.id = c."contactId"
          LEFT JOIN LATERAL (
            SELECT m.text
            FROM "Message" m
            WHERE m."conversationId" = c.id
              AND m."direction" = 'IN'
            ORDER BY m."createdAt" ASC
            LIMIT 1
          ) fm ON true
          LEFT JOIN LATERAL (
            SELECT ctx.data
            FROM "ConversationContext" ctx
            WHERE ctx."conversationId" = c.id
            ORDER BY ctx.version DESC
            LIMIT 1
          ) cc ON true
          WHERE c.id = $1
          LIMIT 1
          `,
          id,
        );

        const conversacion = rows[0] || null;

        if (!conversacion) {
          return res.status(404).json({ success: false, message: 'Conversación no encontrada' });
        }

        const mensajes = await prisma.$queryRawUnsafe<any[]>(
          `
          SELECT
            m.id,
            CASE WHEN m."direction" = 'OUT' THEN 'ia' ELSE 'usuario' END AS tipo,
            COALESCE(m.text, '') AS contenido,
            m."createdAt"
          FROM "Message" m
          WHERE m."conversationId" = $1
          ORDER BY m."createdAt" ASC
          `,
          id,
        );

        return res.json({
          success: true,
          data: {
            ...conversacion,
            mensajes,
            asesoramiento: null,
            encuesta: null,
          },
        });
      }
      
      const conversacion = await prisma.conversacion.findUnique({
        where: { id },
        include: {
          estudiante: {
            select: { id: true, nombre: true, documento: true, correo: true, telefono: true }
          },
          mensajes: {
            orderBy: { createdAt: 'asc' }
          },
          asesoramiento: true,
          encuesta: true
        }
      });

      if (!conversacion) {
        return res.status(404).json({ success: false, message: 'Conversación no encontrada' });
      }

      res.json({ success: true, data: conversacion });
    } catch (error) {
      console.error('Error getting conversacion:', error);
      res.status(500).json({ success: false, message: 'Error al obtener conversación' });
    }
  },

  async getMensajes(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { origen } = req.query;

      if (origen === 'chatbot') {
        const mensajes = await prisma.$queryRawUnsafe<any[]>(
          `
          SELECT
            m.id,
            CASE WHEN m."direction" = 'OUT' THEN 'ia' ELSE 'usuario' END AS tipo,
            COALESCE(m.text, '') AS contenido,
            m."createdAt"
          FROM "Message" m
          WHERE m."conversationId" = $1
          ORDER BY m."createdAt" ASC
          `,
          id,
        );

        return res.json({ success: true, data: mensajes });
      }
      
      const mensajes = await prisma.mensaje.findMany({
        where: { conversacionId: id },
        orderBy: { createdAt: 'asc' }
      });

      res.json({ success: true, data: mensajes });
    } catch (error) {
      console.error('Error getting mensajes:', error);
      res.status(500).json({ success: false, message: 'Error al obtener mensajes' });
    }
  },

  async sendWebchatMessage(req: Request, res: Response) {
    try {
      const body = req.body as {
        message?: unknown;
        externalUserId?: unknown;
        displayName?: unknown;
        tenantId?: unknown;
      };

      const message = typeof body.message === 'string' ? body.message.trim() : '';
      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'El mensaje es obligatorio.',
        });
      }

      const externalUserId = normalizeExternalUserId(req);
      const tenantId = typeof body.tenantId === 'string' && body.tenantId.trim().length > 0
        ? body.tenantId.trim()
        : getWebchatTenantId();
      const displayName = typeof body.displayName === 'string' && body.displayName.trim().length > 0
        ? body.displayName.trim()
        : undefined;

      const orchestratorBaseUrl = getOrchestratorBaseUrl().replace(/\/$/, '');
      const orchestratorUrl = `${orchestratorBaseUrl}/v1/orchestrator/handle-message`;

      const orchestratorPayload = {
        tenantId,
        channel: 'webchat' as const,
        externalUserId,
        ...(displayName ? { displayName } : {}),
        message: {
          type: 'text' as const,
          text: message,
        },
      };

      const response = await fetch(orchestratorUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-correlation-id': `webchat-${Date.now()}`,
        },
        body: JSON.stringify(orchestratorPayload),
      });

      const payload = (await response.json()) as OrchestratorEnvelope;
      if (!response.ok || payload.success === false) {
        const errorMessage = payload.message || 'No fue posible procesar el mensaje en el orquestador.';
        return res.status(502).json({
          success: false,
          message: errorMessage,
        });
      }

      const responses = Array.isArray(payload.data?.responses) ? payload.data?.responses : [];
      const botMessages = responses
        .map((item) => (typeof item?.text === 'string' ? item.text.trim() : ''))
        .filter((item) => item.length > 0);

      return res.status(200).json({
        success: true,
        data: {
          externalUserId,
          conversationId: payload.data?.conversationId || null,
          correlationId: payload.data?.correlationId || null,
          responses,
          botMessages,
        },
      });
    } catch (error) {
      console.error('Error sending webchat message:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al enviar mensaje al chatbot web.',
      });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { estudianteId, temaLegal, consultorio, canal, primerMensaje } = req.body;
      
      const conversacion = await prisma.conversacion.create({
        data: {
          estudianteId,
          temaLegal: temaLegal || 'Consulta general',
          consultorio,
          canal: canal || 'whatsapp',
          primerMensaje,
          estado: 'no_leido'
        }
      });

      // Si hay primer mensaje, agregarlo
      if (primerMensaje) {
        await prisma.mensaje.create({
          data: {
            conversacionId: conversacion.id,
            tipo: 'usuario',
            contenido: primerMensaje
          }
        });
      }

      res.status(201).json({ success: true, data: conversacion });
    } catch (error) {
      console.error('Error creating conversacion:', error);
      res.status(500).json({ success: false, message: 'Error al crear conversación' });
    }
  },

  async agregarMensaje(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tipo, contenido } = req.body;
      
      const mensaje = await prisma.mensaje.create({
        data: {
          conversacionId: id,
          tipo,
          contenido
        }
      });

      res.status(201).json({ success: true, data: mensaje });
    } catch (error) {
      console.error('Error adding mensaje:', error);
      res.status(500).json({ success: false, message: 'Error al agregar mensaje' });
    }
  },

  async actualizarEstado(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { estado } = req.body;
      
      const conversacion = await prisma.conversacion.update({
        where: { id },
        data: { estado }
      });

      res.json({ success: true, data: conversacion });
    } catch (error) {
      console.error('Error updating estado:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar estado' });
    }
  },

  async actualizarResumen(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { resumen } = req.body;
      
      const conversacion = await prisma.conversacion.update({
        where: { id },
        data: { resumen }
      });

      res.json({ success: true, data: conversacion });
    } catch (error) {
      console.error('Error updating resumen:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar resumen' });
    }
  }
};
