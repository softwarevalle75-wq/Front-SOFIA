import { Request, Response } from 'express';
import { historialService } from '../services/historial.service';
import { auditoriaService } from '../services/auditoria.service';

export const historialController = {
  async getHistorial(req: Request, res: Response) {
    try {
      const { limit, offset, tipo } = req.query;
      
      const historial = await historialService.getHistorialCompleto({
        limit: limit ? parseInt(limit as string) : 500,
        offset: offset ? parseInt(offset as string) : 0,
        tipo: tipo as string,
      });
      
      res.json({ success: true, data: historial });
    } catch (error: any) {
      console.error('Error al obtener historial:', error);
      res.status(500).json({ success: false, message: 'Error al obtener historial' });
    }
  },

  async registrarAccion(req: Request, res: Response) {
    try {
      const { accion, entidad, entidadId, detalle, adminId, adminNombre } = req.body;
      
      const registro = await auditoriaService.registrar({
        accion: accion as any,
        entidad,
        entidadId,
        detalles: detalle,
        adminId,
        adminNombre,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('User-Agent'),
      });
      
      res.json({ success: true, data: registro });
    } catch (error: any) {
      console.error('Error al registrar acción:', error);
      res.status(500).json({ success: false, message: 'Error al registrar acción' });
    }
  },

  async getEstadisticas(req: Request, res: Response) {
    try {
      const stats = await historialService.getEstadisticas();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
  },
};

export default historialController;
