import { Request, Response } from 'express';
import notificationService from '../services/notification.service';
import { sicopNotificationsClient } from '../integrations/sicop/sicop-notifications.client';
import { SicopIntegrationError } from '../integrations/sicop/sicop.types';
import { config } from '../config/config';

function toDateFromWeekdayAndHour(day?: string, hour?: number, minute?: number): Date {
  const mapping: Record<string, number> = {
    lunes: 1,
    martes: 2,
    miercoles: 3,
    miércoles: 3,
    jueves: 4,
    viernes: 5,
  };

  const target = mapping[String(day || '').toLowerCase()];
  const now = new Date();
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);

  if (target === undefined) {
    base.setDate(base.getDate() + 1);
  } else {
    const diff = (target - base.getDay() + 7) % 7 || 7;
    base.setDate(base.getDate() + diff);
  }

  if (typeof hour === 'number' && Number.isFinite(hour)) {
    const safeMinute = minute === 30 ? 30 : 0;
    base.setHours(Math.max(0, Math.min(23, hour)), safeMinute, 0, 0);
  }

  return base;
}

function buildChatbotEventHtml(params: {
  titulo: string;
  mensaje: string;
  prioridad: string;
  tenantId?: string;
}) {
  const prioridadLabel = params.prioridad === 'high'
    ? 'Alta'
    : params.prioridad === 'low'
      ? 'Baja'
      : 'Media';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <h2 style="color: #1A1F71;">🔔 ${params.titulo}</h2>
      <p style="font-size: 15px; line-height: 1.6;">${params.mensaje}</p>
      <div style="background:#F3F4F6; border-radius: 8px; padding: 12px; margin-top: 16px;">
        <p style="margin: 4px 0;"><strong>Prioridad:</strong> ${prioridadLabel}</p>
        <p style="margin: 4px 0;"><strong>Canal:</strong> Chatbot</p>
        <p style="margin: 4px 0;"><strong>Tenant:</strong> ${params.tenantId || 'default'}</p>
      </div>
      <p style="margin-top: 20px; color:#6B7280; font-size: 12px;">Notificación generada automáticamente por SOF-IA.</p>
    </div>
  `;
}

function mapSicopError(error: unknown): { status: number; message: string } {
  if (error instanceof SicopIntegrationError) {
    if (error.statusCode === 401 || error.statusCode === 403) return { status: 401, message: 'No autorizado' };
    return { status: 502, message: 'No fue posible consultar notificaciones en SICOP' };
  }
  return { status: 500, message: 'Error al procesar notificaciones' };
}

function mapPagination(page: number, pageSize: number, pagination?: Record<string, unknown>, listLength?: number) {
  const total = Number(pagination?.total ?? listLength ?? 0);
  return {
    page,
    pageSize,
    total,
    totalPages: pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1,
  };
}

export const notificacionController = {
  async getAll(req: Request, res: Response) {
    try {
      const page = Number(req.query.page || 1);
      const pageSize = Number(req.query.pageSize || 20);
      const result = await sicopNotificationsClient.list(req.query as Record<string, unknown>);
      return res.json({
        success: true,
        data: result.data,
        pagination: mapPagination(page, pageSize, result.pagination, result.data.length),
      });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },

  async getNoLeidas(req: Request, res: Response) {
    try {
      const result = await sicopNotificationsClient.list({
        ...(req.query as Record<string, unknown>),
        leida: false,
        pageSize: req.query.pageSize || 10,
      });
      return res.json({ success: true, data: result.data });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },

  async getCount(req: Request, res: Response) {
    try {
      const count = await sicopNotificationsClient.countUnread();
      return res.json({ success: true, data: { count } });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const data = await sicopNotificationsClient.create(req.body as Record<string, unknown>);
      return res.status(201).json({ success: true, data: data.data ?? data });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },

  async createChatbotAppointmentEvent(req: Request, res: Response) {
    try {
      const {
        tenantId,
        tipoEvento,
        titulo,
        mensaje,
        prioridad = 'medium',
        appointment,
      } = req.body as {
        tenantId?: string;
        tipoEvento?: 'agendamiento' | 'cancelacion' | 'reprogramacion';
        titulo?: string;
        mensaje?: string;
        prioridad?: 'low' | 'medium' | 'high';
        appointment?: {
          userName?: string;
          userEmail?: string;
          userPhone?: string;
          userDocumentType?: string;
          userDocumentNumber?: string;
          day?: string;
          hour24?: number;
          minute?: number;
          mode?: 'presencial' | 'virtual';
        };
      };

      if (!titulo || !mensaje) {
        return res.status(400).json({ success: false, message: 'titulo y mensaje son obligatorios' });
      }

      const notificacion = await sicopNotificationsClient.create({
        tipo: 'cita',
        titulo,
        mensaje,
        prioridad,
        tenantId,
        metadata: { tipoEvento, appointment },
      });

      const adminCorreo = process.env.ADMIN_NOTIFICATION_EMAILS?.split(',')[0]?.trim()
        || config.sicop.integrationEmail;

      try {
        if (adminCorreo && !appointment?.userEmail) {
          await notificationService.enviarCorreo({
            to: adminCorreo,
            subject: `🔔 ${titulo}`,
            html: buildChatbotEventHtml({ titulo, mensaje, prioridad, tenantId }),
          });
        }

        if (appointment?.userEmail && appointment.userName) {
          const citaChatbot = {
            id: `chatbot-${Date.now()}`,
            estudianteId: 'chatbot',
            fecha: toDateFromWeekdayAndHour(appointment.day, appointment.hour24, appointment.minute),
            hora: typeof appointment.hour24 === 'number'
              ? `${String(appointment.hour24).padStart(2, '0')}:${String(appointment.minute === 30 ? 30 : 0).padStart(2, '0')}`
              : '09:00',
            modalidad: String(appointment.mode || '').toLowerCase() === 'presencial' ? 'PRESENCIAL' : 'VIRTUAL',
            motivo: `Evento de cita desde chatbot (${tipoEvento || 'agendamiento'})`,
            estado: tipoEvento === 'cancelacion' ? 'CANCELADA' : 'AGENDADA',
            createdAt: new Date(),
            updatedAt: new Date(),
            estudiante: {
              id: 'chatbot',
              nombre: appointment.userName,
              correo: appointment.userEmail,
              documento: appointment.userDocumentNumber || 'N/A',
            },
          } as any;

          const payload = {
            cita: citaChatbot,
            datosUsuario: {
              nombre: appointment.userName,
              tipoDocumento: appointment.userDocumentType || 'CC',
              numeroDocumento: appointment.userDocumentNumber || 'N/A',
              correo: appointment.userEmail,
              telefono: appointment.userPhone || '',
            },
            adminCorreo,
          };

          if (tipoEvento === 'cancelacion') {
            await notificationService.enviarNotificacionCancelacion(payload as any);
          } else if (tipoEvento === 'reprogramacion') {
            const nuevaFecha = toDateFromWeekdayAndHour(appointment.day, appointment.hour24, appointment.minute);
            const nuevaHora = typeof appointment.hour24 === 'number'
              ? `${String(appointment.hour24).padStart(2, '0')}:${String(appointment.minute === 30 ? 30 : 0).padStart(2, '0')}`
              : '09:00';
            await notificationService.enviarNotificacionReprogramacion(payload as any, nuevaFecha, nuevaHora);
          } else {
            await notificationService.enviarNotificacionCita(payload as any);
          }
        }
      } catch (mailError) {
        console.error('Error enviando correos de evento chatbot:', mailError);
      }

      return res.status(201).json({ success: true, data: notificacion.data ?? notificacion });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },

  async marcarLeida(req: Request, res: Response) {
    try {
      const data = await sicopNotificationsClient.markRead(req.params.id);
      return res.json({ success: true, data: data.data ?? data });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },

  async marcarTodasLeidas(req: Request, res: Response) {
    try {
      await sicopNotificationsClient.markAllRead();
      return res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      await sicopNotificationsClient.delete(req.params.id);
      return res.json({ success: true, message: 'Notificación eliminada' });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },
};

export default notificacionController;
