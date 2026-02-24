import { Router } from 'express';
import { historialController } from '../controllers/historial.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.get('/', historialController.getHistorial);
router.post('/', historialController.registrarAccion);
router.get('/stats', historialController.getEstadisticas);

export default router;
