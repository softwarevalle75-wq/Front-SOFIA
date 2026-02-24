import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import estudianteRoutes from './routes/estudiante.routes';
import citaRoutes from './routes/cita.routes';
import historialRoutes from './routes/historial.routes';
import conversacionRoutes from './routes/conversacion.routes';
import encuestaRoutes from './routes/encuesta.routes';
import statsRoutes from './routes/stats.routes';
import webhookRoutes from './routes/webhook.routes';
import configRoutes from './routes/config.routes';
import notificacionRoutes from './routes/notificacion.routes';

const app: Express = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'sof-ia-auth' });
});

app.use('/api/auth', authRoutes);
app.use('/api/estudiantes', estudianteRoutes);
app.use('/api/citas', citaRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/conversaciones', conversacionRoutes);
app.use('/api/encuestas', encuestaRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/config', configRoutes);
app.use('/api/notificaciones', notificacionRoutes);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
  });
});

export default app;
