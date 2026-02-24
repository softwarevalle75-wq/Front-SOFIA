import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const configWhatsAppController = {
  async get(req: Request, res: Response) {
    try {
      let config = await prisma.configuracionWhatsApp.findFirst();
      
      if (!config) {
        config = await prisma.configuracionWhatsApp.create({
          data: {
            nombreBot: 'SOF-IA Bot',
            activo: false
          }
        });
      }

      // No devolver tokens sensibles
      res.json({
        success: true,
        data: {
          id: config.id,
          nombreBot: config.nombreBot,
          phoneNumberId: config.phoneNumberId,
          businessAccountId: config.businessAccountId,
          webhookUrl: config.webhookUrl,
          activo: config.activo,
          hasToken: !!config.tokenAcceso
        }
      });
    } catch (error) {
      console.error('Error getting config:', error);
      res.status(500).json({ success: false, message: 'Error al obtener configuración' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { nombreBot, phoneNumberId, businessAccountId, webhookUrl, tokenAcceso, webhookVerifyToken, activo } = req.body;
      
      let config = await prisma.configuracionWhatsApp.findFirst();
      
      if (!config) {
        config = await prisma.configuracionWhatsApp.create({
          data: {
            nombreBot: nombreBot || 'SOF-IA Bot',
            phoneNumberId,
            businessAccountId,
            webhookUrl,
            tokenAcceso,
            webhookVerifyToken,
            activo
          }
        });
      } else {
        const updateData: any = {};
        if (nombreBot) updateData.nombreBot = nombreBot;
        if (phoneNumberId) updateData.phoneNumberId = phoneNumberId;
        if (businessAccountId) updateData.businessAccountId = businessAccountId;
        if (webhookUrl) updateData.webhookUrl = webhookUrl;
        if (tokenAcceso) updateData.tokenAcceso = tokenAcceso;
        if (webhookVerifyToken) updateData.webhookVerifyToken = webhookVerifyToken;
        if (activo !== undefined) updateData.activo = activo;

        config = await prisma.configuracionWhatsApp.update({
          where: { id: config.id },
          data: updateData
        });
      }

      res.json({ success: true, data: { message: 'Configuración actualizada' } });
    } catch (error) {
      console.error('Error updating config:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar configuración' });
    }
  },

  async getPlantillas(req: Request, res: Response) {
    try {
      const plantillas = await prisma.plantillaMensaje.findMany({
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: plantillas });
    } catch (error) {
      console.error('Error getting plantillas:', error);
      res.status(500).json({ success: false, message: 'Error al obtener plantillas' });
    }
  },

  async createPlantilla(req: Request, res: Response) {
    try {
      const { nombre, contenido, tipo, idioma } = req.body;
      
      const plantilla = await prisma.plantillaMensaje.create({
        data: {
          nombre,
          contenido,
          tipo: tipo || 'general',
          idioma: idioma || 'es'
        }
      });

      res.status(201).json({ success: true, data: plantilla });
    } catch (error) {
      console.error('Error creating plantilla:', error);
      res.status(500).json({ success: false, message: 'Error al crear plantilla' });
    }
  },

  async updatePlantilla(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nombre, contenido, tipo, idioma, activa } = req.body;
      
      const plantilla = await prisma.plantillaMensaje.update({
        where: { id },
        data: {
          ...(nombre && { nombre }),
          ...(contenido && { contenido }),
          ...(tipo && { tipo }),
          ...(idioma && { idioma }),
          ...(activa !== undefined && { activa })
        }
      });

      res.json({ success: true, data: plantilla });
    } catch (error) {
      console.error('Error updating plantilla:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar plantilla' });
    }
  },

  async deletePlantilla(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await prisma.plantillaMensaje.delete({ where: { id } });

      res.json({ success: true, data: { message: 'Plantilla eliminada' } });
    } catch (error) {
      console.error('Error deleting plantilla:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar plantilla' });
    }
  }
};
