import { NextFunction, Request, Response } from 'express';

export function internalTokenMiddleware(req: Request, res: Response, next: NextFunction): Response | void {
  const configuredToken = process.env.CHATBOT_INTERNAL_TOKEN;
  if (!configuredToken) {
    return res.status(503).json({
      success: false,
      message: 'Integración interna de chatbot no configurada.',
    });
  }

  const providedToken = req.get('x-internal-token') || '';
  if (!providedToken || providedToken !== configuredToken) {
    return res.status(401).json({
      success: false,
      message: 'Token interno inválido.',
    });
  }

  next();
}
