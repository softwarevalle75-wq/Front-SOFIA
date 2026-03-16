import { Request, Response } from 'express';
import { citaService } from '../services/cita.service';

type Modalidad = 'PRESENCIAL' | 'VIRTUAL';

const WEEKDAY_INDEX: Record<string, number> = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
};

function toNextWeekdayDate(day?: string): Date {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
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

function toNextWeekdayDateKey(day?: string): string {
  const date = toNextWeekdayDate(day);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayValue = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayValue}`;
}

function hourToLabel(hour24?: number, minute?: number): string {
  if (typeof hour24 !== 'number' || Number.isNaN(hour24)) return '09:00';
  const h = Math.max(0, Math.min(23, Math.floor(hour24)));
  const m = minute === 30 ? 30 : 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function hourLabelToNumber(hora: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(hora || '').trim());
  if (!match) return 9;
  return Number(match[1]);
}

function hourLabelToMinute(hora: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(hora || '').trim());
  if (!match) return 0;
  return Number(match[2]) === 30 ? 30 : 0;
}

function mapServiceErrorToStatus(code: string): number {
  const statusByCode: Record<string, number> = {
    INVALID_DATE: 400,
    INVALID_HOUR: 400,
    INVALID_MODE: 400,
    NOT_FOUND: 404,
    SLOT_NOT_AVAILABLE: 409,
    SICOP_UNAUTHORIZED: 401,
    SICOP_UNAVAILABLE: 502,
  };
  return statusByCode[code] || 500;
}

function respondServiceError(res: Response, error: any, fallbackMessage: string) {
  if (citaService.isServiceError(error)) {
    return res.status(mapServiceErrorToStatus(error.code)).json({
      success: false,
      message: error.message || fallbackMessage,
    });
  }

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
}

export const citaController = {
  async getAll(req: Request, res: Response) {
    try {
      const { estudianteId, estado, modalidad, sourceSystem, origen, from, to, updatedSince, fechaInicio, fechaFin } = req.query;

      const citas = await citaService.getAll({
        estudianteId: estudianteId as string,
        estado: estado as string,
        modalidad: modalidad as string,
        sourceSystem: sourceSystem as string,
        origen: origen as string,
        from: (from || fechaInicio) as string,
        to: (to || fechaFin) as string,
        updatedSince: updatedSince as string,
      });

      return res.json({ success: true, data: citas });
    } catch (error: any) {
      console.error('Error al obtener citas:', error);
      return respondServiceError(res, error, 'Error al obtener citas');
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const cita = await citaService.getById(id);

      if (!cita) {
        return res.status(404).json({ success: false, message: 'Cita no encontrada' });
      }

      return res.json({ success: true, data: cita });
    } catch (error: any) {
      console.error('Error al obtener cita:', error);
      return respondServiceError(res, error, 'Error al obtener cita');
    }
  },

  async getDisponibilidad(req: Request, res: Response) {
    try {
      const fecha = String(req.query.fecha || '').trim();
      const modalidad = String(req.query.modalidad || '').trim().toUpperCase() as Modalidad;

      if (!fecha) {
        return res.status(400).json({ success: false, message: 'La fecha es obligatoria (YYYY-MM-DD).' });
      }

      if (modalidad !== 'PRESENCIAL' && modalidad !== 'VIRTUAL') {
        return res.status(400).json({ success: false, message: 'La modalidad debe ser PRESENCIAL o VIRTUAL.' });
      }

      const disponibilidad = await citaService.getDisponibilidad(fecha, modalidad);
      return res.json({ success: true, data: disponibilidad });
    } catch (error: any) {
      console.error('Error al obtener disponibilidad:', error);
      return respondServiceError(res, error, 'Error al obtener disponibilidad');
    }
  },

  async getChatbotDisponibilidad(req: Request, res: Response) {
    try {
      const day = String(req.query.day || '').trim().toLowerCase();
      const mode = String(req.query.mode || '').trim().toUpperCase() as Modalidad;

      if (!WEEKDAY_INDEX[day]) {
        return res.status(400).json({ success: false, message: 'day inválido. Usa lunes a viernes.' });
      }

      if (mode !== 'PRESENCIAL' && mode !== 'VIRTUAL') {
        return res.status(400).json({ success: false, message: 'mode inválido. Usa presencial o virtual.' });
      }

      const fecha = toNextWeekdayDateKey(day);
      const disponibilidad = await citaService.getDisponibilidad(fecha, mode);

      return res.json({
        success: true,
        data: {
          day,
          fecha,
          mode: mode.toLowerCase(),
          horasDisponibles: disponibilidad.horasDisponibles,
          fechaDisponible: disponibilidad.fechaDisponible,
          motivoIndisponibilidad: disponibilidad.motivoIndisponibilidad,
        },
      });
    } catch (error: any) {
      console.error('Error al obtener disponibilidad chatbot:', error);
      return respondServiceError(res, error, 'Error al obtener disponibilidad');
    }
  },

  async createFromChatbot(req: Request, res: Response) {
    try {
      const body = req.body || {};
      const day = String(body.day || '').trim().toLowerCase();
      const mode = String(body.mode || '').trim().toUpperCase() as Modalidad;
      const hour24 = Number(body.hour24);
      const minute = Number(body.minute ?? 0);

      if (!WEEKDAY_INDEX[day]) {
        return res.status(400).json({ success: false, message: 'day inválido. Usa lunes a viernes.' });
      }
      if (mode !== 'PRESENCIAL' && mode !== 'VIRTUAL') {
        return res.status(400).json({ success: false, message: 'mode inválido. Usa presencial o virtual.' });
      }

      const fecha = toNextWeekdayDateKey(day);
      const hora = hourToLabel(hour24, minute);
      const cita = await citaService.create({
        fecha,
        hora,
        modalidad: mode,
        motivo: body.motivo || 'Cita agendada desde chatbot',
        usuarioNombre: body.userName || 'Usuario chatbot',
        usuarioTipoDocumento: body.userDocumentType || 'CC',
        usuarioNumeroDocumento: body.userDocumentNumber || '',
        usuarioCorreo: body.userEmail || '',
        usuarioTelefono: body.userPhone || '',
        conversacionId: body.conversationId || null,
      });

      return res.status(201).json({
        success: true,
        data: {
          citaId: cita.id,
          estudianteId: cita.estudianteId,
          estudianteNombre: cita.estudiante?.nombre,
          estudianteCorreo: cita.estudiante?.correo,
          fecha,
          day,
          hour24: hourLabelToNumber(String(cita.hora || hora)),
          minute: hourLabelToMinute(String(cita.hora || hora)),
          hora: cita.hora,
          mode: String(cita.modalidad || mode).toLowerCase(),
        },
      });
    } catch (error: any) {
      console.error('Error al agendar cita desde chatbot:', error);
      return respondServiceError(res, error, 'Error al agendar cita');
    }
  },

  async cancelarFromChatbot(req: Request, res: Response) {
    try {
      const citaId = String(req.body?.citaId || '').trim();
      if (!citaId) {
        return res.status(400).json({ success: false, message: 'citaId es obligatorio.' });
      }

      const cita = await citaService.cancelar(citaId, 'Cancelada desde chatbot');
      return res.json({
        success: true,
        data: {
          citaId: cita.id,
          hour24: hourLabelToNumber(String(cita.hora || '09:00')),
          minute: hourLabelToMinute(String(cita.hora || '09:00')),
          mode: String(cita.modalidad || '').toLowerCase(),
        },
      });
    } catch (error: any) {
      console.error('Error al cancelar cita desde chatbot:', error);
      return respondServiceError(res, error, 'Error al cancelar cita');
    }
  },

  async reprogramarFromChatbot(req: Request, res: Response) {
    try {
      const citaId = String(req.body?.citaId || '').trim();
      const day = String(req.body?.day || '').trim().toLowerCase();
      const hour24 = Number(req.body?.hour24);
      const minute = Number(req.body?.minute ?? 0);

      if (!citaId) {
        return res.status(400).json({ success: false, message: 'citaId es obligatorio.' });
      }
      if (!WEEKDAY_INDEX[day]) {
        return res.status(400).json({ success: false, message: 'day inválido. Usa lunes a viernes.' });
      }

      const fecha = toNextWeekdayDateKey(day);
      const hora = hourToLabel(hour24, minute);
      const cita = await citaService.reprogramar(citaId, fecha, hora);

      return res.json({
        success: true,
        data: {
          citaId: cita.id,
          estudianteId: cita.estudianteId,
          estudianteNombre: cita.estudiante?.nombre,
          estudianteCorreo: cita.estudiante?.correo,
          fecha,
          day,
          hour24: hourLabelToNumber(String(cita.hora || hora)),
          minute: hourLabelToMinute(String(cita.hora || hora)),
          hora: cita.hora,
          mode: String(cita.modalidad || '').toLowerCase(),
        },
      });
    } catch (error: any) {
      console.error('Error al reprogramar cita desde chatbot:', error);
      return respondServiceError(res, error, 'Error al reprogramar cita');
    }
  },

  async create(req: Request, res: Response) {
    try {
      const data = req.body || {};
      if (!data.fecha || !data.hora || !data.modalidad) {
        return res.status(400).json({
          success: false,
          message: 'fecha, hora y modalidad son obligatorios para agendar la cita.',
        });
      }

      const cita = await citaService.create(data);
      return res.status(201).json({ success: true, data: cita });
    } catch (error: any) {
      console.error('Error al crear cita:', error);
      return respondServiceError(res, error, 'Error al crear cita');
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body || {};
      const cita = await citaService.update(id, data);
      return res.json({ success: true, data: cita });
    } catch (error: any) {
      console.error('Error al actualizar cita:', error);
      return respondServiceError(res, error, 'Error al actualizar cita');
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await citaService.delete(id);
      return res.json({ success: true, message: 'Cita eliminada correctamente' });
    } catch (error: any) {
      console.error('Error al eliminar cita:', error);
      return respondServiceError(res, error, 'Error al eliminar cita');
    }
  },

  async cancelar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { motivo } = req.body || {};
      const cita = await citaService.cancelar(id, motivo);
      return res.json({ success: true, data: cita });
    } catch (error: any) {
      console.error('Error al cancelar cita:', error);
      return respondServiceError(res, error, 'Error al cancelar cita');
    }
  },

  async reprogramar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { fecha, hora } = req.body || {};
      const cita = await citaService.reprogramar(id, fecha, hora);
      return res.json({ success: true, data: cita });
    } catch (error: any) {
      console.error('Error al reprogramar cita:', error);
      return respondServiceError(res, error, 'Error al reprogramar cita');
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const stats = await citaService.getStats();
      return res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('Error al obtener estadísticas de citas:', error);
      return respondServiceError(res, error, 'Error al obtener estadísticas');
    }
  },
};

export default citaController;
