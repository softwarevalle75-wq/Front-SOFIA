import { Router } from 'express';
import { estudianteController } from '../controllers/estudiante.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.get('/', estudianteController.getAll);
router.get('/stats', estudianteController.getStats);
router.get('/proximos-6-meses', estudianteController.getProximos6Meses);
router.post('/importar', estudianteController.importar);
router.delete('/todos/delete', estudianteController.deleteAll);
router.get('/:id', estudianteController.getById);
router.post('/', estudianteController.create);
router.put('/:id', estudianteController.update);
router.delete('/:id', estudianteController.delete);

export default router;
