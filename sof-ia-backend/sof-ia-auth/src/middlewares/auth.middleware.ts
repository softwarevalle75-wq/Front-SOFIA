import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.utils';
import prisma from '../config/prisma';
import { config } from '../config/config';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    sessionId: string;
    nombreCompleto?: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const path = String(req.originalUrl || req.url || '').toLowerCase();
    const internalToken = req.headers['x-internal-token'];
    const configuredInternalToken = process.env.CHATBOT_INTERNAL_TOKEN;
    const isChatbotInternalRoute = path.includes('/citas/chatbot/');

    if (isChatbotInternalRoute) {
      if (!configuredInternalToken || configuredInternalToken.trim().length === 0) {
        return res.status(503).json({
          success: false,
          message: 'CHATBOT_INTERNAL_TOKEN no configurado en el servicio.',
        });
      }

      if (typeof internalToken !== 'string' || internalToken.trim().length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Token interno requerido',
        });
      }

      if (internalToken.trim() !== configuredInternalToken.trim()) {
        return res.status(401).json({
          success: false,
          message: 'Token interno inválido',
        });
      }

      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación requerido',
      });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado',
      });
    }

    const sesion = await prisma.sesion.findFirst({
      where: {
        id: payload.sessionId,
        token,
        activa: true,
      },
    });

    if (!sesion) {
      return res.status(401).json({
        success: false,
        message: 'Sesión inválida o expirada',
      });
    }

    // Verificar inactividad - si pasaron más de 20 minutos desde el último acceso
    const ahora = new Date();
    const ultimoAcceso = new Date(sesion.ultimoAcceso);
    const diferenciaInactividad = ahora.getTime() - ultimoAcceso.getTime();
    const timeoutMinutos = config.security.sessionTimeoutMinutes * 60 * 1000;

    if (diferenciaInactividad > timeoutMinutos) {
      // La sesión ha expirado por inactividad
      await prisma.sesion.update({
        where: { id: sesion.id },
        data: { activa: false }
      });
      
      return res.status(401).json({
        success: false,
        message: 'Sesión expirada por inactividad',
        code: 'SESSION_TIMEOUT_INACTIVITY'
      });
    }

    // Actualizar ultimoAcceso para reiniciar el contador de inactividad
    await prisma.sesion.update({
      where: { id: sesion.id },
      data: { ultimoAcceso: ahora }
    });

    // Obtener datos completos del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        nombreCompleto: true,
        correo: true,
        rol: true,
      },
    });

    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
      nombreCompleto: usuario?.nombreCompleto,
    };
    next();
  } catch (error) {
    console.error('Error en authMiddleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};
