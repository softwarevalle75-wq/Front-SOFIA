import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { loginSchema } from '../dto/login.dto';
import { changePasswordSchema } from '../dto/change-password.dto';
import { verifyToken } from '../utils/jwt.utils';

export const authController = {
  async login(req: Request, res: Response) {
    try {
      const result = loginSchema.safeParse(req.body);

      if (!result.success) {
        const errors = result.error.errors.map((e) => e.message);
        return res.status(400).json({
          success: false,
          message: errors.join('. '),
        });
      }

      const ip = req.ip || req.socket.remoteAddress || undefined;
      const userAgent = req.headers['user-agent'];

      const authResult = await authService.login(result.data, ip, userAgent);

      if (!authResult.success) {
        return res.status(401).json(authResult);
      }

      return res.json(authResult);
    } catch (error) {
      console.error('Error en login:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  },

  async changePassword(req: Request, res: Response) {
    try {
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

      const result = changePasswordSchema.safeParse(req.body);

      if (!result.success) {
        const errors = result.error.errors.map((e) => e.message);
        return res.status(400).json({
          success: false,
          message: errors.join('. '),
        });
      }

      const ip = req.ip || req.socket.remoteAddress || undefined;
      const userAgent = req.headers['user-agent'];

      const authResult = await authService.changePassword(
        payload.userId,
        result.data,
        ip,
        userAgent
      );

      if (!authResult.success) {
        return res.status(400).json(authResult);
      }

      return res.json(authResult);
    } catch (error) {
      console.error('Error en changePassword:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  },

  async verifySession(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Token de autenticación requerido',
        });
      }

      const token = authHeader.split(' ')[1];
      const authResult = await authService.verifySession(token);

      if (!authResult.success) {
        return res.status(401).json(authResult);
      }

      return res.json(authResult);
    } catch (error) {
      console.error('Error en verifySession:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Token de autenticación requerido',
        });
      }

      const token = authHeader.split(' ')[1];
      const authResult = await authService.logout(token);

      return res.json(authResult);
    } catch (error) {
      console.error('Error en logout:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  },
};
