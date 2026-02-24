import { Router } from 'express';
import { citaController } from '../controllers/cita.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { internalTokenMiddleware } from '../middlewares/internal-token.middleware';

const router = Router();

router.get('/chatbot/disponibilidad', internalTokenMiddleware, citaController.getChatbotDisponibilidad);
router.post('/chatbot/agendar', internalTokenMiddleware, citaController.createFromChatbot);
router.post('/chatbot/cancelar', internalTokenMiddleware, citaController.cancelarFromChatbot);
router.post('/chatbot/reprogramar', internalTokenMiddleware, citaController.reprogramarFromChatbot);

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.get('/', citaController.getAll);
router.get('/stats', citaController.getStats);
router.get('/disponibilidad', citaController.getDisponibilidad);
router.get('/:id', citaController.getById);
router.post('/', citaController.create);
router.put('/:id', citaController.update);
router.delete('/:id', citaController.delete);
router.post('/:id/cancelar', citaController.cancelar);
router.post('/:id/reprogramar', citaController.reprogramar);

export default router;
