import { Router } from 'express';
import { conversacionController } from '../controllers/conversacion.controller';

const router = Router();

router.get('/', conversacionController.getAll);
router.get('/:id', conversacionController.getById);
router.get('/:id/mensajes', conversacionController.getMensajes);
router.post('/webchat/message', conversacionController.sendWebchatMessage);
router.post('/', conversacionController.create);
router.post('/:id/mensajes', conversacionController.agregarMensaje);
router.put('/:id/estado', conversacionController.actualizarEstado);
router.put('/:id/resumen', conversacionController.actualizarResumen);

export default router;
