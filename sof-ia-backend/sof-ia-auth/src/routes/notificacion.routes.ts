import { Router } from 'express';
import { notificacionController } from '../controllers/notificacion.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Ruta interna para eventos de citas desde chatbot (sin JWT)
router.post('/chatbot-cita-evento', notificacionController.createChatbotAppointmentEvent);

router.use(authMiddleware);

router.get('/', notificacionController.getAll);
router.get('/no-leidas', notificacionController.getNoLeidas);
router.get('/count', notificacionController.getCount);
router.post('/', notificacionController.create);
router.put('/:id/leer', notificacionController.marcarLeida);
router.put('/leer-todas', notificacionController.marcarTodasLeidas);
router.delete('/:id', notificacionController.delete);

export default router;
