import { Request, Response } from 'express';
import { estudianteService } from '../services/estudiante.service';
import { auditoriaService } from '../services/auditoria.service';
import { Modalidad, EstadoEstudiante } from '@prisma/client';

export const estudianteController = {
  async getAll(req: Request, res: Response) {
    try {
      const estudiantes = await estudianteService.getAll();
      res.json({ success: true, data: estudiantes });
    } catch (error: any) {
      console.error('Error al obtener estudiantes:', error);
      res.status(500).json({ success: false, message: 'Error al obtener estudiantes' });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const estudiante = await estudianteService.getById(id);
      
      if (!estudiante) {
        return res.status(404).json({ success: false, message: 'Estudiante no encontrado' });
      }
      
      res.json({ success: true, data: estudiante });
    } catch (error: any) {
      console.error('Error al obtener estudiante:', error);
      res.status(500).json({ success: false, message: 'Error al obtener estudiante' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const data = req.body;
      const estudiante = await estudianteService.create(data);
      
      // Registrar en auditoría
      await auditoriaService.registrar({
        accion: 'CREAR',
        entidad: 'estudiante',
        entidadId: estudiante.id,
        detalles: `Se creó estudiante: ${estudiante.nombre} (Documento: ${estudiante.documento})`,
        adminId: (req as any).user?.userId,
        adminNombre: (req as any).user?.nombreCompleto,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });
      
      res.status(201).json({ success: true, data: estudiante });
    } catch (error: any) {
      console.error('Error al crear estudiante:', error);
      res.status(500).json({ success: false, message: error.message || 'Error al crear estudiante' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const estudianteExistente = await estudianteService.getById(id);
      if (!estudianteExistente) {
        return res.status(404).json({ success: false, message: 'Estudiante no encontrado' });
      }
      
      const estudiante = await estudianteService.update(id, data);
      
      // Registrar en auditoría
      await auditoriaService.registrar({
        accion: 'EDITAR',
        entidad: 'estudiante',
        entidadId: estudiante.id,
        detalles: `Se editó estudiante: ${estudiante.nombre} (Documento: ${estudiante.documento})`,
        adminId: (req as any).user?.userId,
        adminNombre: (req as any).user?.nombreCompleto,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });
      
      res.json({ success: true, data: estudiante });
    } catch (error: any) {
      console.error('Error al actualizar estudiante:', error);
      res.status(500).json({ success: false, message: error.message || 'Error al actualizar estudiante' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const estudianteExistente = await estudianteService.getById(id);
      if (!estudianteExistente) {
        return res.status(404).json({ success: false, message: 'Estudiante no encontrado' });
      }
      
      await estudianteService.delete(id);
      
      // Registrar en auditoría
      await auditoriaService.registrar({
        accion: 'ELIMINAR',
        entidad: 'estudiante',
        entidadId: id,
        detalles: `Se eliminó estudiante: ${estudianteExistente.nombre} (Documento: ${estudianteExistente.documento})`,
        adminId: (req as any).user?.userId,
        adminNombre: (req as any).user?.nombreCompleto,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });
      
      res.json({ success: true, message: 'Estudiante eliminado correctamente' });
    } catch (error: any) {
      console.error('Error al eliminar estudiante:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar estudiante' });
    }
  },

  async importar(req: Request, res: Response) {
    try {
      const { estudiantes } = req.body;
      
      if (!estudiantes || !Array.isArray(estudiantes)) {
        return res.status(400).json({ success: false, message: 'Se requiere un arreglo de estudiantes' });
      }
      
      const adminId = (req as any).user?.userId;
      const adminNombre = (req as any).user?.nombreCompleto;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('user-agent');
      
      const resultados = await estudianteService.importar(
        estudiantes,
        adminId,
        adminNombre,
        ip,
        userAgent
      );
      
      res.json({ 
        success: true, 
        data: resultados,
        message: `Se importaron ${resultados.exitosos} estudiantes` 
      });
    } catch (error: any) {
      console.error('Error al importar estudiantes:', error);
      res.status(500).json({ success: false, message: 'Error al importar estudiantes' });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const stats = await estudianteService.getStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
  },

  async deleteAll(req: Request, res: Response) {
    try {
      const adminId = (req as any).user?.userId;
      const adminNombre = (req as any).user?.nombreCompleto;
      
      const resultado = await estudianteService.deleteAll(adminId, adminNombre, req.ip, req.get('user-agent'));
      
      res.json({ 
        success: true, 
        data: resultado,
        message: `Se eliminaron ${resultado.eliminados} estudiantes` 
      });
    } catch (error: any) {
      console.error('Error al eliminar todos los estudiantes:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar todos los estudiantes' });
    }
  },

  async getProximos6Meses(req: Request, res: Response) {
    try {
      const stats = await estudianteService.getProximos6Meses();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('Error al obtener estudiantes próximos a 6 meses:', error);
      res.status(500).json({ success: false, message: 'Error al obtener estudiantes próximos a 6 meses' });
    }
  },
};

export default estudianteController;
