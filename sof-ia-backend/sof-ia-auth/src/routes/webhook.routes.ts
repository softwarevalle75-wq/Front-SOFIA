import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';

const router = Router();

// Webhook de WhatsApp (público)
router.get('/whatsapp', webhookController.verify);
router.post('/whatsapp', webhookController.receive);

export default router;
