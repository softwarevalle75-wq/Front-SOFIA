import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { citaService } from '../services/cita.service';
import { auditoriaService } from '../services/auditoria.service';
import { notificationService } from '../services/notification.service';
import { EstadoCita, Modalidad, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WEEKDAY_INDEX: Record<string, number> = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
};

function toNextWeekdayDate(day?: string): Date {
  const now = new Date();
  const normalized = (day || '').trim().toLowerCase();
  const target = WEEKDAY_INDEX[normalized];
  if (!target) return now;

  const current = now.getDay();
  let delta = target - current;
  if (delta <= 0) delta += 7;

  const next = new Date(now);
  next.setDate(now.getDate() + delta);
  next.setHours(0, 0, 0, 0);
  return next;
}

function hourToLabel(hour24?: number): string {
  if (typeof hour24 !== 'number' || Number.isNaN(hour24)) return '09:00';
  const h = Math.max(0, Math.min(23, Math.floor(hour24)));
  return `${String(h).padStart(2, '0')}:00`;
}

function extractChatbotConversationId(citaId: string): string | null {
  if (!citaId.startsWith('chatbot-')) return null;
  const raw = citaId.slice('chatbot-'.length);
  if (!raw) return null;
  return raw.split(':')[0] || null;
}

type ChatbotStoredAppointment = {
  mode: 'presencial' | 'virtual';
  day: string;
  hour24: number;
  status: 'agendada' | 'cancelada';
  updatedAt: string;
  user?: {
    fullName?: string;
    documentType?: string;
    documentNumber?: string;
    email?: string;
    phone?: string;
  };
};

type ChatbotAppointmentItem = {
  id: string;
  estudianteId: string | null;
  fecha: Date;
  hora: string;
  modalidad: 'PRESENCIAL' | 'VIRTUAL';
  motivo: string;
  estado: 'AGENDADA' | 'CANCELADA';
  usuarioNombre: string;
  usuarioTipoDocumento: string;
  usuarioNumeroDocumento: string | null;
  usuarioCorreo: string | null;
  usuarioTelefono: string | null;
  creadoEn: Date | string;
  actualizadoEn: Date | string;
  estudiante: {
    id: string;
    nombre: string;
  };
};

function parseChatbotAppointments(profile: any): ChatbotStoredAppointment[] {
  const fromList = Array.isArray(profile?.lastAppointments) ? profile.lastAppointments : [];
  const fromLast = profile?.lastAppointment ? [profile.lastAppointment] : [];
  const source = [...fromList, ...fromLast];

  const parsed = source
    .map((item: any) => {
      const mode = String(item?.mode || '').toLowerCase();
      const day = String(item?.day || '').toLowerCase();
      const status = String(item?.status || 'agendada').toLowerCase();
      const hour24 = typeof item?.hour24 === 'number' ? item.hour24 : Number.NaN;
      const updatedAt = typeof item?.updatedAt === 'string' ? item.updatedAt : new Date().toISOString();

      const isValidMode = mode === 'presencial' || mode === 'virtual';
      const isValidDay = WEEKDAY_INDEX[day] !== undefined;
      const isValidHour = Number.isFinite(hour24) && hour24 >= 0 && hour24 <= 23;
      if (!isValidMode || !isValidDay || !isValidHour) return null;

      return {
        mode,
        day,
        hour24,
        status: status === 'cancelada' ? 'cancelada' : 'agendada',
        updatedAt,
        user: typeof item?.user === 'object' && item.user !== null ? item.user : undefined,
      } as ChatbotStoredAppointment;
    })
    .filter((item: ChatbotStoredAppointment | null): item is ChatbotStoredAppointment => Boolean(item));

  const dedup = new Map<string, ChatbotStoredAppointment>();
  for (const item of parsed) {
    const key = `${item.day}-${item.hour24}-${item.mode}-${item.status}-${item.updatedAt}`;
    if (!dedup.has(key)) dedup.set(key, item);
  }

  return Array.from(dedup.values())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 20);
}

function buildChatbotAppointmentId(conversationId: string, appointment: ChatbotStoredAppointment): string {
  return `chatbot-${conversationId}:${appointment.updatedAt}:${appointment.day}:${appointment.hour24}:${appointment.mode}`;
}

async function getChatbotAppointments(): Promise<ChatbotAppointmentItem[]> {
  const chatbotRows = await prisma.$queryRawUnsafe<any[]>(
    `
    SELECT
      c.id AS "conversationId",
      ct.id AS "contactId",
      ct."displayName" AS "displayName",
      ct."externalId" AS "externalId",
      ctx.data AS "contextData",
      ctx."createdAt" AS "contextCreatedAt"
    FROM "Conversation" c
    LEFT JOIN "Contact" ct ON ct.id = c."contactId"
    JOIN "ConversationContext" ctx ON ctx."conversationId" = c.id
    WHERE
      (ctx.data -> 'profile' -> 'lastAppointment') IS NOT NULL
      OR jsonb_typeof(ctx.data -> 'profile' -> 'lastAppointments') = 'array'
    `,
  );

  const dedup = new Map<string, ChatbotAppointmentItem>();

  for (const row of chatbotRows) {
    const profile = row.contextData?.profile || {};
    const appointments = parseChatbotAppointments(profile);

    for (const appointment of appointments) {
      const user = appointment.user || {};
      const id = buildChatbotAppointmentId(row.conversationId, appointment);

      if (!dedup.has(id)) {
        dedup.set(id, {
          id,
          estudianteId: row.contactId || null,
          fecha: toNextWeekdayDate(appointment.day),
          hora: hourToLabel(appointment.hour24),
          modalidad: appointment.mode === 'presencial' ? 'PRESENCIAL' : 'VIRTUAL',
          motivo: 'Cita agendada desde chatbot',
          estado: appointment.status === 'cancelada' ? 'CANCELADA' : 'AGENDADA',
          usuarioNombre: user.fullName || row.displayName || row.externalId || 'Usuario chatbot',
          usuarioTipoDocumento: user.documentType || 'CC',
          usuarioNumeroDocumento: user.documentNumber || null,
          usuarioCorreo: user.email || null,
          usuarioTelefono: user.phone || null,
          creadoEn: appointment.updatedAt || row.contextCreatedAt || new Date(),
          actualizadoEn: appointment.updatedAt || row.contextCreatedAt || new Date(),
          estudiante: {
            id: row.contactId || row.conversationId,
            nombre: user.fullName || row.displayName || row.externalId || 'Usuario chatbot',
          },
        });
      }
    }
  }

  return Array.from(dedup.values()).sort(
    (a, b) => new Date(b.creadoEn || 0).getTime() - new Date(a.creadoEn || 0).getTime(),
  );
}

function extractTelegramChatId(externalId?: string | null): string | null {
  const raw = String(externalId || '').trim();
  if (!raw.toLowerCase().startsWith('telegram:')) return null;
  const chatId = raw.slice('telegram:'.length).trim();
  return chatId || null;
}

async function notifyTelegramCancellation(params: {
  chatId: string;
  nombreUsuario: string;
  fecha: Date;
  hora: string;
  modalidad: string;
  motivo?: string;
}) {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!telegramBotToken) return;

  const fechaFormateada = params.fecha.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const mensaje = [
    '❌ Tu cita ha sido cancelada',
    `Usuario: ${params.nombreUsuario || 'Usuario chatbot'}`,
    `Fecha: ${fechaFormateada}`,
    `Hora: ${params.hora}`,
    `Modalidad: ${String(params.modalidad || '').toLowerCase() === 'presencial' ? 'Presencial' : 'Virtual'}`,
    `Motivo: ${params.motivo || 'No especificado'}`,
  ].join('\n');

  const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: params.chatId,
      text: mensaje,
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`Telegram API error: ${response.status} ${errorPayload}`);
  }
}

export const citaController = {
  async getAll(req: Request, res: Response) {
    try {
      const { estudianteId, estado, modalidad, origen } = req.query;
      
      const citas = await citaService.getAll({
        estudianteId: estudianteId as string,
        estado: estado as EstadoCita,
        modalidad: modalidad as Modalidad,
      });

      const chatbotCitas = (await getChatbotAppointments())
        .filter((cita) => {
          if (estado && String(estado).toUpperCase() !== String(cita.estado).toUpperCase()) return false;
          if (modalidad && String(modalidad).toUpperCase() !== String(cita.modalidad).toUpperCase()) return false;
          if (estudianteId && String(estudianteId) !== String(cita.estudianteId)) return false;
          return true;
        });

      const merged = [...citas, ...chatbotCitas].sort(
        (a: any, b: any) => new Date(b.creadoEn || b.createdAt || 0).getTime() - new Date(a.creadoEn || a.createdAt || 0).getTime(),
      );

      const source = String(origen || '').toLowerCase();
      const result = source === 'chatbot'
        ? chatbotCitas
        : source === 'sistema'
          ? citas
          : merged;
      
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error al obtener citas:', error);
      res.status(500).json({ success: false, message: 'Error al obtener citas' });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const cita = await citaService.getById(id);
      
      if (!cita) {
        return res.status(404).json({ success: false, message: 'Cita no encontrada' });
      }
      
      res.json({ success: true, data: cita });
    } catch (error: any) {
      console.error('Error al obtener cita:', error);
      res.status(500).json({ success: false, message: 'Error al obtener cita' });
    }
  },

  async getDisponibilidad(req: Request, res: Response) {
    try {
      const fecha = String(req.query.fecha || '').trim();
      const modalidadRaw = String(req.query.modalidad || '').trim().toUpperCase();

      if (!fecha) {
        return res.status(400).json({ success: false, message: 'La fecha es obligatoria (YYYY-MM-DD).' });
      }

      if (modalidadRaw !== 'PRESENCIAL' && modalidadRaw !== 'VIRTUAL') {
        return res.status(400).json({ success: false, message: 'La modalidad debe ser PRESENCIAL o VIRTUAL.' });
      }

      const disponibilidad = await citaService.getDisponibilidad(fecha, modalidadRaw as Modalidad);
      return res.json({ success: true, data: disponibilidad });
    } catch (error: any) {
      console.error('Error al obtener disponibilidad:', error);
      return res.status(500).json({ success: false, message: error.message || 'Error al obtener disponibilidad' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const data = req.body;
      if (!data?.fecha || !data?.hora || !data?.modalidad) {
        return res.status(400).json({
          success: false,
          message: 'fecha, hora y modalidad son obligatorios para agendar la cita.',
        });
      }
      
      const cita = await citaService.create(data);
      
      // Registrar en auditoría
      await auditoriaService.registrar({
        accion: 'AGENDAR',
        entidad: 'cita',
        entidadId: cita.id,
        detalles: `Se agendó cita para ${cita.estudiante.nombre} el ${new Date(cita.fecha).toLocaleDateString()} a las ${cita.hora}`,
        adminId: (req as any).user?.userId,
        adminNombre: (req as any).user?.nombreCompleto,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });

      // Enviar notificaciones
      try {
        // Obtener correo del admin
        const admin = await prisma.usuario.findFirst({
          where: { rol: 'ADMIN_CONSULTORIO' }
        });

        // Obtener la última conversación del estudiante
        let resumenConversacion: string | undefined;
        const ultimaConversacion = await prisma.conversacion.findFirst({
          where: { estudianteId: cita.estudianteId },
          orderBy: { createdAt: 'desc' }
        });
        
        if (ultimaConversacion?.resumen) {
          resumenConversacion = ultimaConversacion.resumen;
        }

        if (admin?.correo || data.usuarioCorreo || cita.estudiante.correo) {
          await notificationService.enviarNotificacionCita({
            cita,
            datosUsuario: {
              nombre: data.usuarioNombre || '',
              tipoDocumento: data.usuarioTipoDocumento || 'CC',
              numeroDocumento: data.usuarioNumeroDocumento || '',
              correo: data.usuarioCorreo,
              telefono: data.usuarioTelefono || '',
            },
            adminCorreo: admin?.correo || '',
            resumenConversacion,
          });
        }
      } catch (notifError) {
        console.error('Error al enviar notificaciones:', notifError);
        // No fallamos la creación de la cita si las notificaciones fallan
      }
      
      res.status(201).json({ success: true, data: cita });
    } catch (error: any) {
      console.error('Error al crear cita:', error);
      if (citaService.isServiceError(error)) {
        const statusByCode: Record<string, number> = {
          INVALID_DATE: 400,
          INVALID_HOUR: 400,
          SLOT_NOT_AVAILABLE: 409,
          NO_ELIGIBLE_STUDENTS: 409,
        };
        return res.status(statusByCode[error.code] || 400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: error.message || 'Error al crear cita' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const citaExistente = await citaService.getById(id);
      if (!citaExistente) {
        return res.status(404).json({ success: false, message: 'Cita no encontrada' });
      }
      
      // Convertir fecha string a Date si es necesario
      if (data.fecha && typeof data.fecha === 'string') {
        data.fecha = new Date(data.fecha);
      }
      
      const cita = await citaService.update(id, data);
      
      // Registrar en auditoría
      await auditoriaService.registrar({
        accion: 'EDITAR',
        entidad: 'cita',
        entidadId: cita.id,
        detalles: `Se editó cita para ${cita.estudiante.nombre}`,
        adminId: (req as any).user?.userId,
        adminNombre: (req as any).user?.nombreCompleto,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });
      
      res.json({ success: true, data: cita });
    } catch (error: any) {
      console.error('Error al actualizar cita:', error);
      res.status(500).json({ success: false, message: error.message || 'Error al actualizar cita' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const citaExistente = await citaService.getById(id);
      if (!citaExistente) {
        return res.status(404).json({ success: false, message: 'Cita no encontrada' });
      }
      
      await citaService.delete(id);
      
      // Registrar en auditoría
      await auditoriaService.registrar({
        accion: 'CANCELAR',
        entidad: 'cita',
        entidadId: id,
        detalles: `Se eliminó cita para ${citaExistente.estudiante.nombre}`,
        adminId: (req as any).user?.userId,
        adminNombre: (req as any).user?.nombreCompleto,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });
      
      res.json({ success: true, message: 'Cita eliminada correctamente' });
    } catch (error: any) {
      console.error('Error al eliminar cita:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar cita' });
    }
  },

  async cancelar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      const conversationId = extractChatbotConversationId(id);

      if (conversationId) {
        const chatbotRows = await prisma.$queryRawUnsafe<any[]>(
          `
          SELECT
            c.id AS "conversationId",
            c."contactId" AS "contactId",
            ct."externalId" AS "externalId",
            ct."displayName" AS "displayName",
            ctx.id AS "contextId",
            ctx."tenantId" AS "tenantId",
            ctx.version AS "contextVersion",
            ctx.data AS "contextData"
          FROM "Conversation" c
          LEFT JOIN "Contact" ct ON ct.id = c."contactId"
          JOIN LATERAL (
            SELECT x.id, x."tenantId", x.version, x.data
            FROM "ConversationContext" x
            WHERE x."conversationId" = c.id
              AND (x.data -> 'profile' -> 'lastAppointment') IS NOT NULL
            ORDER BY x.version DESC
            LIMIT 1
          ) ctx ON true
          WHERE c.id = $1
          LIMIT 1
          `,
          conversationId,
        );

        const chatbotInfo = chatbotRows[0];
        if (!chatbotInfo) {
          return res.status(404).json({ success: false, message: 'Cita de chatbot no encontrada' });
        }

        const currentData = chatbotInfo.contextData || {};
        const profile = currentData.profile || {};
        const appointment = profile.lastAppointment || {};
        const appointmentUser = appointment.user || {};

        const updatedContextData = {
          ...currentData,
          profile: {
            ...profile,
            lastAppointment: {
              ...appointment,
              status: 'cancelada',
              updatedAt: new Date().toISOString(),
              cancelReason: motivo || appointment.cancelReason || 'No especificado',
            },
          },
        };

        await prisma.$executeRawUnsafe(
          `
          INSERT INTO "ConversationContext" (id, "tenantId", "conversationId", version, data)
          VALUES ($1, $2, $3, $4, $5::jsonb)
          `,
          randomUUID(),
          chatbotInfo.tenantId,
          conversationId,
          Number(chatbotInfo.contextVersion || 0) + 1,
          JSON.stringify(updatedContextData),
        );

        await auditoriaService.registrar({
          accion: 'CANCELAR',
          entidad: 'cita',
          entidadId: id,
          detalles: `Se canceló cita de chatbot para ${appointmentUser.fullName || chatbotInfo.displayName || 'Usuario chatbot'}. Motivo: ${motivo || 'No especificado'}`,
          adminId: (req as any).user?.userId,
          adminNombre: (req as any).user?.nombreCompleto,
          ip: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
        });

        try {
          const admin = await prisma.usuario.findFirst({
            where: { rol: 'ADMIN_CONSULTORIO' },
          });

          const citaChatbot = {
            id,
            fecha: toNextWeekdayDate(appointment.day),
            hora: hourToLabel(appointment.hour24),
            modalidad: String(appointment.mode || '').toLowerCase() === 'presencial' ? 'PRESENCIAL' : 'VIRTUAL',
            motivo: motivo || appointment.reason || 'Cancelada desde panel administrativo',
            estado: 'CANCELADA',
            estudiante: {
              nombre: appointmentUser.fullName || chatbotInfo.displayName || 'Usuario chatbot',
              correo: appointmentUser.email || null,
            },
          } as any;

          await notificationService.enviarNotificacionCancelacion({
            cita: citaChatbot,
            datosUsuario: {
              nombre: appointmentUser.fullName || chatbotInfo.displayName || 'Usuario chatbot',
              tipoDocumento: appointmentUser.documentType || 'CC',
              numeroDocumento: appointmentUser.documentNumber || '',
              correo: appointmentUser.email || '',
              telefono: appointmentUser.phone || '',
            },
            adminCorreo: admin?.correo || '',
          });
        } catch (notifError) {
          console.error('Error enviando correos de cancelación (chatbot):', notifError);
        }

        try {
          const telegramChatId = extractTelegramChatId(chatbotInfo.externalId);
          if (telegramChatId) {
            await notifyTelegramCancellation({
              chatId: telegramChatId,
              nombreUsuario: appointmentUser.fullName || chatbotInfo.displayName || 'Usuario chatbot',
              fecha: toNextWeekdayDate(appointment.day),
              hora: hourToLabel(appointment.hour24),
              modalidad: appointment.mode || 'virtual',
              motivo,
            });
          }
        } catch (telegramError) {
          console.error('Error enviando notificación de Telegram:', telegramError);
        }

        return res.json({
          success: true,
          data: {
            id,
            estado: 'CANCELADA',
            motivo: motivo || 'No especificado',
          },
        });
      }
      
      const citaExistente = await citaService.getById(id);
      if (!citaExistente) {
        return res.status(404).json({ success: false, message: 'Cita no encontrada' });
      }
      
      const cita = await citaService.cancelar(id, motivo);
      
      // Registrar en auditoría
      await auditoriaService.registrar({
        accion: 'CANCELAR',
        entidad: 'cita',
        entidadId: id,
        detalles: `Se canceló cita para ${cita.estudiante.nombre}. Motivo: ${motivo || 'No especificado'}`,
        adminId: (req as any).user?.userId,
        adminNombre: (req as any).user?.nombreCompleto,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });

      try {
        const admin = await prisma.usuario.findFirst({
          where: { rol: 'ADMIN_CONSULTORIO' },
        });

        await notificationService.enviarNotificacionCancelacion({
          cita: cita as any,
          datosUsuario: {
            nombre: cita.usuarioNombre || cita.estudiante.nombre || 'Usuario',
            tipoDocumento: cita.usuarioTipoDocumento || 'CC',
            numeroDocumento: cita.usuarioNumeroDocumento || '',
            correo: cita.usuarioCorreo || '',
            telefono: cita.usuarioTelefono || '',
          },
          adminCorreo: admin?.correo || '',
        });
      } catch (notifError) {
        console.error('Error enviando correos de cancelación:', notifError);
      }
      
      res.json({ success: true, data: cita });
    } catch (error: any) {
      console.error('Error al cancelar cita:', error);
      res.status(500).json({ success: false, message: 'Error al cancelar cita' });
    }
  },

  async reprogramar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { fecha, hora } = req.body;
      
      const citaExistente = await citaService.getById(id);
      if (!citaExistente) {
        return res.status(404).json({ success: false, message: 'Cita no encontrada' });
      }
      
      const cita = await citaService.reprogramar(id, fecha, hora);
      
      // Registrar en auditoría
      await auditoriaService.registrar({
        accion: 'REPROGRAMAR',
        entidad: 'cita',
        entidadId: id,
        detalles: `Se reprogramó cita para ${cita.estudiante.nombre}. Nueva fecha: ${new Date(cita.fecha).toLocaleDateString()} a las ${cita.hora}`,
        adminId: (req as any).user?.userId,
        adminNombre: (req as any).user?.nombreCompleto,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });

      try {
        const admin = await prisma.usuario.findFirst({
          where: { rol: 'ADMIN_CONSULTORIO' },
        });

        await notificationService.enviarNotificacionReprogramacion({
          cita: cita as any,
          datosUsuario: {
            nombre: cita.usuarioNombre || cita.estudiante.nombre || 'Usuario',
            tipoDocumento: cita.usuarioTipoDocumento || 'CC',
            numeroDocumento: cita.usuarioNumeroDocumento || '',
            correo: cita.usuarioCorreo || '',
            telefono: cita.usuarioTelefono || '',
          },
          adminCorreo: admin?.correo || '',
        },
        nuevaFecha,
        hora,
        );
      } catch (notifError) {
        console.error('Error enviando correos de reprogramación:', notifError);
      }
      
      res.json({ success: true, data: cita });
    } catch (error: any) {
      console.error('Error al reprogramar cita:', error);
      if (citaService.isServiceError(error)) {
        const statusByCode: Record<string, number> = {
          INVALID_DATE: 400,
          INVALID_HOUR: 400,
          SLOT_NOT_AVAILABLE: 409,
          NOT_FOUND: 404,
        };
        return res.status(statusByCode[error.code] || 400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Error al reprogramar cita' });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const { origen } = req.query;
      const source = String(origen || '').toLowerCase();

      if (source === 'chatbot') {
        const chatbotCitas = await getChatbotAppointments();

        const total = chatbotCitas.length;
        const agendadas = chatbotCitas.filter((cita) => cita.estado === 'AGENDADA').length;
        const canceladas = chatbotCitas.filter((cita) => cita.estado === 'CANCELADA').length;
        const presencial = chatbotCitas.filter((cita) => cita.estado === 'AGENDADA' && cita.modalidad === 'PRESENCIAL').length;
        const virtual = chatbotCitas.filter((cita) => cita.estado === 'AGENDADA' && cita.modalidad === 'VIRTUAL').length;

        return res.json({
          success: true,
          data: {
            total,
            agendadas,
            canceladas,
            completadas: 0,
            presencial,
            virtual,
          },
        });
      }

      const stats = await citaService.getStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
  },
};

export default citaController;
