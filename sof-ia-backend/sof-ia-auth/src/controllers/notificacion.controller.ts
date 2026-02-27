import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import notificationService from '../services/notification.service';

const prisma = new PrismaClient();

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

export const notificacionController = {
  async getAll(req: Request, res: Response) {
    try {
      const { page = 1, pageSize = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(pageSize);
      
      const [notificaciones, total] = await Promise.all([
        prisma.notificacion.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(pageSize)
        }),
        prisma.notificacion.count()
      ]);

      res.json({
        success: true,
        data: notificaciones,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize))
        }
      });
    } catch (error) {
      console.error('Error getting notificaciones:', error);
      res.status(500).json({ success: false, message: 'Error al obtener notificaciones' });
    }
  },

  async getNoLeidas(req: Request, res: Response) {
    try {
      const notificaciones = await prisma.notificacion.findMany({
        where: { leida: false },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      res.json({ success: true, data: notificaciones });
    } catch (error) {
      console.error('Error getting no leidas:', error);
      res.status(500).json({ success: false, message: 'Error al obtener notificaciones' });
    }
  },

  async getCount(req: Request, res: Response) {
    try {
      const count = await prisma.notificacion.count({
        where: { leida: false }
      });

      res.json({ success: true, data: { count } });
    } catch (error) {
      console.error('Error getting count:', error);
      res.status(500).json({ success: false, message: 'Error al obtener conteo' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { tipo, titulo, mensaje, prioridad, estudianteId } = req.body;
      
      const notificacion = await prisma.notificacion.create({
        data: {
          tipo,
          titulo,
          mensaje,
          prioridad: prioridad || 'medium',
          estudianteId
        }
      });

      res.status(201).json({ success: true, data: notificacion });
    } catch (error) {
      console.error('Error creating notificacion:', error);
      res.status(500).json({ success: false, message: 'Error al crear notificación' });
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
        return res.status(400).json({
          success: false,
          message: 'titulo y mensaje son obligatorios',
        });
      }

      const notificacion = await prisma.notificacion.create({
        data: {
          tipo: 'cita',
          titulo,
          mensaje,
          prioridad,
        },
      });

      const admin = await prisma.usuario.findFirst({
        where: { rol: 'ADMIN_CONSULTORIO' },
        select: { correo: true },
      });

      try {
        if (admin?.correo && !appointment?.userEmail) {
          await notificationService.enviarCorreo({
            to: admin.correo,
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
            adminCorreo: admin?.correo || '',
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

      res.status(201).json({ success: true, data: notificacion });
    } catch (error) {
      console.error('Error creating chatbot appointment event notification:', error);
      res.status(500).json({ success: false, message: 'Error al crear notificación del chatbot' });
    }
  },

  async marcarLeida(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const notificacion = await prisma.notificacion.update({
        where: { id },
        data: { leida: true }
      });

      res.json({ success: true, data: notificacion });
    } catch (error) {
      console.error('Error marking as read:', error);
      res.status(500).json({ success: false, message: 'Error al marcar notificación como leída' });
    }
  },

  async marcarTodasLeidas(req: Request, res: Response) {
    try {
      await prisma.notificacion.updateMany({
        where: { leida: false },
        data: { leida: true }
      });

      res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
      console.error('Error marking all as read:', error);
      res.status(500).json({ success: false, message: 'Error al marcar notificaciones' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await prisma.notificacion.delete({ where: { id } });

      res.json({ success: true, message: 'Notificación eliminada' });
    } catch (error) {
      console.error('Error deleting notificacion:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar notificación' });
    }
  }
};
