import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    sessionId?: string;
    nombreCompleto?: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
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
    const session = await authService.me(token);

    if (!session.success || !session.user) {
      return res.status(401).json({
        success: false,
        message: session.message || 'Token inválido o expirado',
      });
    }

    req.user = {
      userId: session.user.id,
      email: session.user.correo,
      role: session.user.rol,
      nombreCompleto: session.user.nombreCompleto,
    };

    return next();
  } catch (error) {
    console.error('Error en authMiddleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

export default authMiddleware;
