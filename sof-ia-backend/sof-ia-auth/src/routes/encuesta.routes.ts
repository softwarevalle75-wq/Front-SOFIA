import { Router } from 'express';
import { encuestaController } from '../controllers/encuesta.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Rutas públicas para WhatsApp
router.post('/', encuestaController.create);
router.get('/stats', encuestaController.getStats);

// Rutas autenticadas
router.use(authMiddleware);
router.get('/', encuestaController.getAll);

export default router;
