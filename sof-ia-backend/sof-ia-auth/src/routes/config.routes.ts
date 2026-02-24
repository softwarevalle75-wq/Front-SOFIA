import { Router } from 'express';
import { configWhatsAppController } from '../controllers/config-whatsapp.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/whatsapp', configWhatsAppController.get);
router.put('/whatsapp', authMiddleware, configWhatsAppController.update);
router.get('/plantillas', configWhatsAppController.getPlantillas);
router.post('/plantillas', authMiddleware, configWhatsAppController.createPlantilla);
router.put('/plantillas/:id', authMiddleware, configWhatsAppController.updatePlantilla);
router.delete('/plantillas/:id', authMiddleware, configWhatsAppController.deletePlantilla);

export default router;
