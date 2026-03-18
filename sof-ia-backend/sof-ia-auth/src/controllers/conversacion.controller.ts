import { Request, Response } from 'express';
import { sicopConversationsClient } from '../integrations/sicop/sicop-conversations.client';
import { SicopIntegrationError } from '../integrations/sicop/sicop.types';

function mapSicopError(error: unknown): { status: number; message: string } {
  if (error instanceof SicopIntegrationError) {
    if (error.statusCode === 404) return { status: 404, message: 'Conversación no encontrada' };
    if (error.statusCode === 401 || error.statusCode === 403) return { status: 401, message: 'No autorizado' };
    return { status: 502, message: 'No fue posible consultar conversaciones en SICOP' };
  }
  return { status: 500, message: 'Error al procesar conversaciones' };
}

function pickData(payload: Record<string, unknown>): Record<string, unknown> {
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return payload.data as Record<string, unknown>;
  }
  return payload;
}

function normalizeMensaje(item: Record<string, unknown>): Record<string, unknown> {
  const tipo = String(item.tipo || item.role || item.direction || '').toLowerCase();
  return {
    id: item.id,
    tipo: tipo === 'assistant' || tipo === 'out' || tipo === 'ia' ? 'ia' : 'usuario',
    contenido: String(item.contenido || item.text || item.message || ''),
    createdAt: item.createdAt || item.fecha || new Date().toISOString(),
  };
}

function normalizeEstado(value: unknown): string {
  const raw = String(value || '').toLowerCase();
  if (raw === 'closed' || raw === 'cerrada' || raw === 'leido' || raw === 'leído') return 'leido';
  if (raw === 'open' || raw === 'abierta' || raw === 'no_leido' || raw === 'no leído') return 'no_leido';
  return raw ? String(value) : 'no_leido';
}

function normalizeCanal(value: unknown): string {
  const raw = String(value || '').toLowerCase();
  if (raw === 'whatsapp') return 'whatsapp';
  if (raw === 'webchat' || raw === 'web') return 'web';
  return raw || 'web';
}

function resolveConversationId(rawId: string): { conversationId: string; consultationId?: string } {
  const id = String(rawId || '').trim();
  if (!id.includes(':')) return { conversationId: id };
  const [conversationId] = id.split(':');
  return {
    conversationId: String(conversationId || '').trim(),
    consultationId: id,
  };
}

function normalizeConversation(item: Record<string, unknown>, requestedId?: string): Record<string, unknown> {
  const fromStudent = (item.estudiante || item.student || item.user || {}) as Record<string, unknown>;
  const id = String(requestedId || item.id || item.conversationId || item.caseId || '').trim();

  return {
    ...item,
    id,
    conversationId: String(item.conversationId || id),
    temaLegal: item.temaLegal || item.caseType || item.tema || item.topic || item.subject || item.primerMensaje || 'Consulta de chatbot',
    consultorio: item.consultorio || item.consultorioJuridico || item.area || null,
    tipoCaso: item.tipoCaso || item.caseType || null,
    estado: normalizeEstado(item.estado || item.status),
    canal: normalizeCanal(item.canal || item.channel),
    primerMensaje: item.primerMensaje || item.firstMessage || item.mensajeInicial || item.lastMessage || '',
    resumen: item.resumen || item.summary || null,
    createdAt: item.createdAt || item.fecha || item.startedAt || new Date().toISOString(),
    estudiante: {
      id: fromStudent.id || item.estudianteId || item.studentId || null,
      nombre: fromStudent.nombre || fromStudent.name || fromStudent.fullName || item.usuarioNombre || 'Usuario',
      documento: fromStudent.documento || fromStudent.document || fromStudent.externalId || '',
      correo: fromStudent.correo || fromStudent.email || null,
      telefono: fromStudent.telefono || fromStudent.phone || null,
    },
  };
}

export const conversacionController = {
  async getAll(req: Request, res: Response) {
    try {
      const response = await sicopConversationsClient.getConversations(req.query as Record<string, unknown>);
      const data = response.data.map((item) => normalizeConversation(item));
      return res.json({
        success: true,
        data,
        ...(response.pagination ? { pagination: response.pagination } : {}),
      });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id: rawId } = req.params;
      const { conversationId } = resolveConversationId(rawId);
      const conversation = await sicopConversationsClient.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Conversación no encontrada' });
      }

      return res.json({
        success: true,
        data: normalizeConversation(conversation, rawId),
      });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },

  async getMensajes(req: Request, res: Response) {
    try {
      const { id: rawId } = req.params;
      const { conversationId } = resolveConversationId(rawId);
      const mensajes = await sicopConversationsClient.getConversationMessages(conversationId);
      return res.json({
        success: true,
        data: mensajes.map((item) => normalizeMensaje(item)),
      });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },

  async sendWebchatMessage(req: Request, res: Response) {
    try {
      const payload = req.body as Record<string, unknown>;
      const response = await sicopConversationsClient.sendWebchatMessage(payload);
      return res.status(200).json({ success: true, data: pickData(response) });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const response = await sicopConversationsClient.createConversation(req.body as Record<string, unknown>);
      const normalized = normalizeConversation(pickData(response));
      return res.status(201).json({ success: true, data: normalized });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },

  async agregarMensaje(req: Request, res: Response) {
    try {
      const { id: rawId } = req.params;
      const { conversationId } = resolveConversationId(rawId);
      const response = await sicopConversationsClient.addMessage(conversationId, req.body as Record<string, unknown>);
      return res.status(201).json({ success: true, data: pickData(response) });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },

  async actualizarEstado(req: Request, res: Response) {
    try {
      const { id: rawId } = req.params;
      const { conversationId } = resolveConversationId(rawId);
      const response = await sicopConversationsClient.updateConversation(conversationId, {
        estado: (req.body as Record<string, unknown>).estado,
      });
      return res.json({ success: true, data: pickData(response) });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },

  async actualizarResumen(req: Request, res: Response) {
    try {
      const { id: rawId } = req.params;
      const { conversationId } = resolveConversationId(rawId);
      const resumen = String((req.body as Record<string, unknown>).resumen || '').trim();
      if (!resumen) {
        return res.status(400).json({ success: false, message: 'resumen es obligatorio' });
      }
      const response = await sicopConversationsClient.updateSummary(conversationId, { resumen });
      const data = pickData(response);
      return res.json({
        success: true,
        data: {
          id: rawId,
          conversationId,
          resumen,
          ...data,
        },
      });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },

  async eliminar(req: Request, res: Response) {
    try {
      const { id: rawId } = req.params;
      const { conversationId } = resolveConversationId(rawId);
      await sicopConversationsClient.deleteConversation(conversationId);
      return res.json({ success: true, data: { id: rawId, conversationId, eliminado: true } });
    } catch (error) {
      const mapped = mapSicopError(error);
      return res.status(mapped.status).json({ success: false, message: mapped.message });
    }
  },
};

export default conversacionController;
