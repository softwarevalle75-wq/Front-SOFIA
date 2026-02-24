import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
