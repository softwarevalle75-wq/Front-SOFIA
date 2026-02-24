import { Router } from 'express';
import { statsController } from '../controllers/stats.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/dashboard', statsController.getDashboardStats);
router.get('/satisfaccion', statsController.getSatisfaccionStats);
router.get('/conversaciones', statsController.getConversacionesStats);

export default router;
