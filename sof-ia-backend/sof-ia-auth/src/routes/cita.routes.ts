import { Router } from 'express';
import { citaController } from '../controllers/cita.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.get('/', citaController.getAll);
router.get('/stats', citaController.getStats);
router.get('/:id', citaController.getById);
router.post('/', citaController.create);
router.put('/:id', citaController.update);
router.delete('/:id', citaController.delete);
router.post('/:id/cancelar', citaController.cancelar);
router.post('/:id/reprogramar', citaController.reprogramar);

export default router;
