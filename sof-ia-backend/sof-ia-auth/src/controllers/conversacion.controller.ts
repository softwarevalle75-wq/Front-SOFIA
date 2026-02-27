import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import {
  buildConsultationSummary,
  extractConsultationContentMessages,
  getStoredConsultationSummary,
  isConsultationDeleted,
  segmentConsultationsByMarkers,
} from '../utils/chatbot-consultation.utils';

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

  return `web-${req.ip || req.socket.remoteAddress || randomUUID()}`;
}

function mapCanalToChatbotEnum(canal?: string): 'WHATSAPP' | 'WEBCHAT' | undefined {
  if (!canal) return undefined;
  const raw = String(canal).toLowerCase();
  if (raw === 'whatsapp') return 'WHATSAPP';
  if (raw === 'web' || raw === 'webchat') return 'WEBCHAT';
  return undefined;
}

function mapStatusToFiltro(estado?: string): 'CLOSED' | 'OPEN' | undefined {
  if (!estado) return undefined;
  const raw = String(estado).toLowerCase();
  if (raw === 'leido') return 'CLOSED';
  if (raw === 'no_leido') return 'OPEN';
  return undefined;
}

function normalizeCaseText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function inferTipoCaso(payload: {
  temaLegal?: string | null;
  primerMensaje?: string | null;
  resumen?: string | null;
}): 'familia' | 'laboral' | 'civil' | 'penal' | 'comercial' | 'administrativo' | 'general' {
  const text = normalizeCaseText(`${payload.temaLegal || ''} ${payload.primerMensaje || ''} ${payload.resumen || ''}`);

  const matches = (terms: string[]) => terms.some((term) => text.includes(term));

  if (matches(['divor', 'custodia', 'alimentos', 'patria potestad', 'familia', 'esposa', 'esposo'])) return 'familia';
  if (matches(['despido', 'laboral', 'empleador', 'salario', 'liquidacion', 'contrato de trabajo'])) return 'laboral';
  if (matches(['lesion', 'denuncia', 'amenaza', 'agresion', 'penal', 'hurto', 'fiscalia'])) return 'penal';
  if (matches(['sociedad', 'empresa', 'comercial', 'factura', 'camara de comercio', 'contrato mercantil'])) return 'comercial';
  if (matches(['tutela', 'administrativo', 'entidad publica', 'acto administrativo'])) return 'administrativo';
  if (matches(['civil', 'arrendamiento', 'deuda', 'incumplimiento', 'obligacion'])) return 'civil';
  return 'general';
}

function mapTipoCasoToConsultorio(tipoCaso: ReturnType<typeof inferTipoCaso>): string {
  switch (tipoCaso) {
    case 'familia':
      return 'Derecho de Familia';
    case 'laboral':
      return 'Derecho Laboral';
    case 'civil':
      return 'Derecho Civil';
    case 'penal':
      return 'Derecho Penal';
    case 'comercial':
      return 'Derecho Comercial';
    case 'administrativo':
      return 'Derecho Administrativo';
    default:
      return 'General';
  }
}

export const conversacionController = {
  async getAll(req: Request, res: Response) {
    try {
      const { page = 1, pageSize = 10, search, estado, canal, fechaInicio, fechaFin, origen, tipoCaso, consultorioJuridico } = req.query;

      if (origen === 'chatbot') {
        const whereClauses: string[] = ['1=1'];
        const whereParams: unknown[] = [];

        const canalFiltro = mapCanalToChatbotEnum(String(canal || ''));
        if (canalFiltro) {
          whereParams.push(canalFiltro);
          whereClauses.push(`c."channel" = $${whereParams.length}`);
        }

        const statusFiltro = mapStatusToFiltro(String(estado || ''));
        if (statusFiltro === 'CLOSED') {
          whereClauses.push(`c."status" = 'CLOSED'`);
        } else if (statusFiltro === 'OPEN') {
          whereClauses.push(`c."status" <> 'CLOSED'`);
        }

        if (fechaInicio) {
          whereParams.push(new Date(String(fechaInicio)));
          whereClauses.push(`c."createdAt" >= $${whereParams.length}`);
        }

        if (fechaFin) {
          const endDate = new Date(String(fechaFin));
          endDate.setHours(23, 59, 59, 999);
          whereParams.push(endDate);
          whereClauses.push(`c."createdAt" <= $${whereParams.length}`);
        }

        const whereSql = whereClauses.join(' AND ');

        const conversationRows = await prisma.$queryRawUnsafe<any[]>(
          `
          SELECT
            c.id,
            c."status",
            c."channel",
            c."createdAt",
            ct.id AS "contactId",
            ct."displayName",
            ct."externalId",
            cc.data AS "contextData"
          FROM "Conversation" c
          LEFT JOIN "Contact" ct ON ct.id = c."contactId"
          LEFT JOIN LATERAL (
            SELECT ctx.data
            FROM "ConversationContext" ctx
            WHERE ctx."conversationId" = c.id
            ORDER BY ctx.version DESC
            LIMIT 1
          ) cc ON true
          WHERE ${whereSql}
          ORDER BY c."createdAt" DESC
          `,
          ...whereParams,
        );

        const conversationIds = conversationRows.map((row) => row.id).filter(Boolean);
        let messageRows: Array<{ id: string; conversationId: string; direction: 'IN' | 'OUT'; text: string; createdAt: Date | string }> = [];

        if (conversationIds.length > 0) {
          const placeholders = conversationIds.map((_id, index) => `$${index + 1}`).join(', ');
          messageRows = await prisma.$queryRawUnsafe<any[]>(
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
        }

        const messagesByConversation = new Map<string, typeof messageRows>();
        for (const message of messageRows) {
          const list = messagesByConversation.get(message.conversationId) || [];
          list.push(message);
          messagesByConversation.set(message.conversationId, list);
        }

        const consultations = conversationRows.flatMap((row) => {
          const messages = messagesByConversation.get(row.id) || [];
          const segments = segmentConsultationsByMarkers({
            conversationId: row.id,
            messages,
          });

          return segments
            .filter((segment) => !isConsultationDeleted(row.contextData, segment.id))
            .map((segment) => {
              const storedSummary = getStoredConsultationSummary(row.contextData, segment.id);
              const casoInferido = inferTipoCaso({
                temaLegal: segment.firstUserMessage,
                primerMensaje: segment.firstUserMessage,
                resumen: storedSummary,
              });
              const consultorioInferido = mapTipoCasoToConsultorio(casoInferido);
              return {
                id: segment.id,
                conversationId: row.id,
                temaLegal: segment.firstUserMessage || 'Consulta de chatbot',
                consultorio: consultorioInferido,
                tipoCaso: casoInferido,
                estado: segment.status === 'closed' ? 'leido' : 'no_leido',
                canal: row.channel === 'WHATSAPP' ? 'whatsapp' : 'web',
                primerMensaje: segment.firstUserMessage,
              resumen: storedSummary || buildConsultationSummary(segment),
              createdAt: segment.startedAt.toISOString(),
              endedAt: segment.endedAt ? segment.endedAt.toISOString() : null,
              estudiante: {
                id: row.contactId,
                nombre: row.displayName || row.externalId || 'Usuario',
                documento: row.externalId || '',
              },
            };
            });
        });

        let filteredConsultations = consultations;
        if (search) {
          const searchValue = String(search).toLowerCase();
          filteredConsultations = consultations.filter((item) => {
            const usuario = String(item.estudiante?.nombre || '').toLowerCase();
            const documento = String(item.estudiante?.documento || '').toLowerCase();
            const consulta = String(item.temaLegal || '').toLowerCase();
            const primerMensaje = String(item.primerMensaje || '').toLowerCase();
            const consultorio = String(item.consultorio || '').toLowerCase();
            return usuario.includes(searchValue)
              || documento.includes(searchValue)
              || consulta.includes(searchValue)
              || primerMensaje.includes(searchValue)
              || consultorio.includes(searchValue);
          });
        }

        const tipoCasoFiltro = normalizeCaseText(String(tipoCaso || ''));
        if (tipoCasoFiltro) {
          filteredConsultations = filteredConsultations.filter((item) => item.tipoCaso === tipoCasoFiltro);
        }

        const consultorioFiltro = normalizeCaseText(String(consultorioJuridico || ''));
        if (consultorioFiltro) {
          filteredConsultations = filteredConsultations.filter((item) => normalizeCaseText(String(item.consultorio || '')).includes(consultorioFiltro));
        }

        filteredConsultations = filteredConsultations.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        const pageNumber = Number(page) || 1;
        const pageSizeNumber = Number(pageSize) || 10;
        const total = filteredConsultations.length;
        const skip = Math.max(0, (pageNumber - 1) * pageSizeNumber);
        const data = filteredConsultations.slice(skip, skip + pageSizeNumber);

        return res.json({
          success: true,
          data,
          pagination: {
            page: pageNumber,
            pageSize: pageSizeNumber,
            total,
            totalPages: Math.ceil(total / pageSizeNumber),
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
        if (fechaFin) {
          const endDate = new Date(fechaFin as string);
          endDate.setHours(23, 59, 59, 999);
          where.createdAt.lte = endDate;
        }
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
        const consultationId = String(id || '').trim();
        const conversationId = consultationId.split(':')[0] || consultationId;

        const rows = await prisma.$queryRawUnsafe<any[]>(
          `
          SELECT
            c.id,
            c."createdAt",
            c."status",
            c."channel",
            json_build_object(
              'id', ct.id,
              'nombre', COALESCE(ct."displayName", ct."externalId", 'Usuario'),
              'documento', COALESCE(ct."externalId", ''),
              'correo', NULL,
              'telefono', ct.phone
            ) AS estudiante,
            cc.data AS "contextData"
          FROM "Conversation" c
          LEFT JOIN "Contact" ct ON ct.id = c."contactId"
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
          conversationId,
        );

        const conversation = rows[0] || null;

        if (!conversation) {
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
          conversationId,
        );

        const segments = segmentConsultationsByMarkers({
          conversationId,
          messages: mensajes.map((item) => ({
            id: item.id,
            direction: item.tipo === 'ia' ? 'OUT' : 'IN',
            text: item.contenido || '',
            createdAt: item.createdAt,
          })),
        });

        const selectedSegment = segments.find((segment) => segment.id === consultationId)
          || segments.find((segment) => segment.id === `${conversationId}:${consultationId}`)
          || null;

        if (!selectedSegment || isConsultationDeleted(conversation.contextData, selectedSegment.id)) {
          return res.status(404).json({ success: false, message: 'Consulta no encontrada dentro de la conversación' });
        }

        const consultationMessages = extractConsultationContentMessages(selectedSegment.messages);

        const filteredMessages = consultationMessages.map((item) => ({
          id: item.id,
          tipo: item.direction === 'OUT' ? 'ia' : 'usuario',
          contenido: item.text,
          createdAt: item.createdAt,
        }));

        const storedSummary = getStoredConsultationSummary(conversation.contextData, selectedSegment.id);
        const casoInferido = inferTipoCaso({
          temaLegal: selectedSegment.firstUserMessage,
          primerMensaje: selectedSegment.firstUserMessage,
          resumen: storedSummary,
        });

        return res.json({
          success: true,
          data: {
            id: selectedSegment.id,
            conversationId,
            temaLegal: selectedSegment.firstUserMessage || 'Consulta de chatbot',
            consultorio: mapTipoCasoToConsultorio(casoInferido),
            tipoCaso: casoInferido,
            estado: selectedSegment.status === 'closed' ? 'leido' : 'no_leido',
            canal: conversation.channel === 'WHATSAPP' ? 'whatsapp' : 'web',
            primerMensaje: selectedSegment.firstUserMessage,
            resumen: storedSummary || buildConsultationSummary(selectedSegment),
            createdAt: selectedSegment.startedAt.toISOString(),
            estudiante: conversation.estudiante,
            mensajes: filteredMessages,
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
        const consultationId = String(id || '').trim();
        const conversationId = consultationId.split(':')[0] || consultationId;

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
          conversationId,
        );

        const segments = segmentConsultationsByMarkers({
          conversationId,
          messages: mensajes.map((item) => ({
            id: item.id,
            direction: item.tipo === 'ia' ? 'OUT' : 'IN',
            text: item.contenido || '',
            createdAt: item.createdAt,
          })),
        });

        const selectedSegment = segments.find((segment) => segment.id === consultationId)
          || segments.find((segment) => segment.id === `${conversationId}:${consultationId}`)
          || null;

        const contextRows = await prisma.$queryRawUnsafe<any[]>(
          `
          SELECT data
          FROM "ConversationContext"
          WHERE "conversationId" = $1
          ORDER BY version DESC
          LIMIT 1
          `,
          conversationId,
        );
        const contextData = contextRows[0]?.data && typeof contextRows[0].data === 'object'
          ? contextRows[0].data as Record<string, unknown>
          : undefined;

        if (!selectedSegment || isConsultationDeleted(contextData, selectedSegment.id)) {
          return res.status(404).json({ success: false, message: 'Consulta no encontrada dentro de la conversación' });
        }

        const consultationMessages = extractConsultationContentMessages(selectedSegment.messages);

        const filteredMessages = consultationMessages.map((item) => ({
          id: item.id,
          tipo: item.direction === 'OUT' ? 'ia' : 'usuario',
          contenido: item.text,
          createdAt: item.createdAt,
        }));

        return res.json({ success: true, data: filteredMessages });
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
        return res.status(400).json({ success: false, message: 'El mensaje es obligatorio.' });
      }

      const externalUserId = normalizeExternalUserId(req);
      const tenantId = typeof body.tenantId === 'string' && body.tenantId.trim().length > 0
        ? body.tenantId.trim()
        : getWebchatTenantId();
      const displayName = typeof body.displayName === 'string' && body.displayName.trim().length > 0
        ? body.displayName.trim()
        : undefined;

      const orchestratorUrl = `${getOrchestratorBaseUrl().replace(/\/$/, '')}/v1/orchestrator/handle-message`;
      const correlationId = `webchat-${Date.now()}-${randomUUID()}`;

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
          'x-correlation-id': correlationId,
          'x-request-id': correlationId,
        },
        body: JSON.stringify(orchestratorPayload),
      });

      const payload = (await response.json()) as OrchestratorEnvelope;
      if (!response.ok || payload.success === false) {
        return res.status(502).json({
          success: false,
          message: payload.message || 'No fue posible procesar el mensaje en el orquestador.',
        });
      }

      const responses = Array.isArray(payload.data?.responses) ? payload.data.responses : [];
      const botMessages = responses
        .map((item) => (typeof item?.text === 'string' ? item.text.trim() : ''))
        .filter((text) => text.length > 0);

      return res.status(200).json({
        success: true,
        data: {
          externalUserId,
          conversationId: payload.data?.conversationId || null,
          correlationId: payload.data?.correlationId || correlationId,
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
      const { origen } = req.query;

      if (origen === 'chatbot') {
        const consultationId = String(id || '').trim();
        const conversationId = consultationId.split(':')[0] || consultationId;

        if (typeof resumen !== 'string' || resumen.trim().length === 0) {
          return res.status(400).json({ success: false, message: 'resumen es obligatorio para consultas de chatbot.' });
        }

        const latestContextRows = await prisma.$queryRawUnsafe<any[]>(
          `
          SELECT id, "tenantId", version, data
          FROM "ConversationContext"
          WHERE "conversationId" = $1
          ORDER BY version DESC
          LIMIT 1
          `,
          conversationId,
        );

        const latestContext = latestContextRows[0] || null;
        if (!latestContext) {
          return res.status(404).json({ success: false, message: 'No se encontró contexto de conversación para guardar el resumen.' });
        }

        const currentData = (latestContext.data && typeof latestContext.data === 'object')
          ? latestContext.data as Record<string, unknown>
          : {};
        const currentProfile = (currentData.profile && typeof currentData.profile === 'object')
          ? currentData.profile as Record<string, unknown>
          : {};
        const currentSummaries = (currentProfile.consultationSummaries && typeof currentProfile.consultationSummaries === 'object')
          ? currentProfile.consultationSummaries as Record<string, unknown>
          : {};

        const nextData = {
          ...currentData,
          profile: {
            ...currentProfile,
            consultationSummaries: {
              ...currentSummaries,
              [consultationId]: resumen.trim(),
            },
          },
        };

        await prisma.$executeRawUnsafe(
          `
          INSERT INTO "ConversationContext" (id, "tenantId", "conversationId", version, data)
          VALUES ($1, $2, $3, $4, $5::jsonb)
          `,
          randomUUID(),
          String(latestContext.tenantId),
          conversationId,
          Number(latestContext.version || 0) + 1,
          JSON.stringify(nextData),
        );

        return res.json({
          success: true,
          data: {
            id: consultationId,
            conversationId,
            resumen: resumen.trim(),
          },
        });
      }
      
      const conversacion = await prisma.conversacion.update({
        where: { id },
        data: { resumen }
      });

      res.json({ success: true, data: conversacion });
    } catch (error) {
      console.error('Error updating resumen:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar resumen' });
    }
  },

  async eliminar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { origen } = req.query;

      if (origen === 'chatbot') {
        const consultationId = String(id || '').trim();
        const conversationId = consultationId.split(':')[0] || consultationId;

        const latestContextRows = await prisma.$queryRawUnsafe<any[]>(
          `
          SELECT "tenantId", version, data
          FROM "ConversationContext"
          WHERE "conversationId" = $1
          ORDER BY version DESC
          LIMIT 1
          `,
          conversationId,
        );

        const latestContext = latestContextRows[0] || null;
        if (!latestContext) {
          return res.status(404).json({ success: false, message: 'No se encontró contexto para eliminar la consulta.' });
        }

        const currentData = (latestContext.data && typeof latestContext.data === 'object')
          ? latestContext.data as Record<string, unknown>
          : {};
        const currentProfile = (currentData.profile && typeof currentData.profile === 'object')
          ? currentData.profile as Record<string, unknown>
          : {};
        const deletedConsultations = (currentProfile.deletedConsultations && typeof currentProfile.deletedConsultations === 'object')
          ? currentProfile.deletedConsultations as Record<string, unknown>
          : {};

        const nextData = {
          ...currentData,
          profile: {
            ...currentProfile,
            deletedConsultations: {
              ...deletedConsultations,
              [consultationId]: true,
            },
          },
        };

        await prisma.$executeRawUnsafe(
          `
          INSERT INTO "ConversationContext" (id, "tenantId", "conversationId", version, data)
          VALUES ($1, $2, $3, $4, $5::jsonb)
          `,
          randomUUID(),
          String(latestContext.tenantId),
          conversationId,
          Number(latestContext.version || 0) + 1,
          JSON.stringify(nextData),
        );

        return res.json({
          success: true,
          data: {
            id: consultationId,
            eliminado: true,
          },
        });
      }

      await prisma.conversacion.delete({ where: { id } });
      return res.json({ success: true, data: { id, eliminado: true } });
    } catch (error) {
      console.error('Error deleting conversacion:', error);
      return res.status(500).json({ success: false, message: 'Error al eliminar conversación' });
    }
  },
};
