import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';

const app: Express = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'sofia-gateway' });
});

// Función de proxy genérica - recibe la ruta completa
const proxyRequest = (req: Request, res: Response, targetService: string, targetPath: string) => {
  const options = {
    hostname: targetService,
    port: 3001,
    path: targetPath,
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': req.headers['authorization'] || '',
      'User-Agent': req.headers['user-agent'] || '',
      'X-Forwarded-For': req.ip || req.socket.remoteAddress || '',
    },
  };

  console.log(`Proxying ${req.method} request to: http://${options.hostname}:${options.port}${options.path}`);

  const proxyReq = http.request(options, (proxyRes) => {
    let data = '';
    proxyRes.on('data', (chunk) => { data += chunk; });
    proxyRes.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        res.status(proxyRes.statusCode || 200).json(jsonData);
      } catch {
        res.status(proxyRes.statusCode || 200).send(data);
      }
    });
  });

  proxyReq.on('error', (err) => {
    console.error(`Proxy error to ${targetService}:`, err);
    res.status(500).json({ success: false, message: `Error al conectar con el servicio ${targetService}` });
  });

  if (req.body && Object.keys(req.body).length > 0) {
    proxyReq.write(JSON.stringify(req.body));
  }
  proxyReq.end();
};

// Rutas de autenticación
app.all('/api/auth/:path(*)', (req: Request, res: Response) => {
  const path = req.params.path || '';
  proxyRequest(req, res, 'sofia_auth', `/api/auth/${path}`);
});

// Rutas de estudiantes
app.get('/api/estudiantes', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/estudiantes');
});
app.get('/api/estudiantes/stats', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/estudiantes/stats');
});
app.post('/api/estudiantes', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/estudiantes');
});
app.put('/api/estudiantes/:id', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', `/api/estudiantes/${req.params.id}`);
});
app.all('/api/estudiantes/:path(*)', (req: Request, res: Response) => {
  const path = req.params.path || '';
  proxyRequest(req, res, 'sofia_auth', `/api/estudiantes/${path}`);
});

// Rutas de citas
app.get('/api/citas', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/citas');
});
app.get('/api/citas/stats', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/citas/stats');
});
app.post('/api/citas', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/citas');
});
app.all('/api/citas/:path(*)', (req: Request, res: Response) => {
  const path = req.params.path || '';
  proxyRequest(req, res, 'sofia_auth', `/api/citas/${path}`);
});

// Rutas de historial
app.get('/api/historial', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/historial');
});
app.get('/api/historial/stats', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/historial/stats');
});
app.all('/api/historial/:path(*)', (req: Request, res: Response) => {
  const path = req.params.path || '';
  proxyRequest(req, res, 'sofia_auth', `/api/historial/${path}`);
});

// Rutas de conversaciones
app.get('/api/conversaciones', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/conversaciones');
});
app.all('/api/conversaciones/:path(*)', (req: Request, res: Response) => {
  const path = req.params.path || '';
  proxyRequest(req, res, 'sofia_auth', `/api/conversaciones/${path}`);
});

// Rutas de encuestas
app.get('/api/encuestas', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/encuestas');
});
app.get('/api/encuestas/stats', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/encuestas/stats');
});
app.post('/api/encuestas', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/encuestas');
});
app.all('/api/encuestas/:path(*)', (req: Request, res: Response) => {
  const path = req.params.path || '';
  proxyRequest(req, res, 'sofia_auth', `/api/encuestas/${path}`);
});

// Rutas de stats
app.get('/api/stats/dashboard', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/stats/dashboard');
});
app.get('/api/stats/satisfaccion', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/stats/satisfaccion');
});
app.get('/api/stats/conversaciones', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/stats/conversaciones');
});
app.all('/api/stats/:path(*)', (req: Request, res: Response) => {
  const path = req.params.path || '';
  proxyRequest(req, res, 'sofia_auth', `/api/stats/${path}`);
});

// Rutas de configuración
app.get('/api/config/whatsapp', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/config/whatsapp');
});
app.get('/api/config/plantillas', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/config/plantillas');
});
app.all('/api/config/:path(*)', (req: Request, res: Response) => {
  const path = req.params.path || '';
  proxyRequest(req, res, 'sofia_auth', `/api/config/${path}`);
});

// Rutas de webhook
app.get('/api/webhook/whatsapp', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/webhook/whatsapp');
});
app.post('/api/webhook/whatsapp', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/webhook/whatsapp');
});
app.all('/api/webhook/:path(*)', (req: Request, res: Response) => {
  const path = req.params.path || '';
  proxyRequest(req, res, 'sofia_auth', `/api/webhook/${path}`);
});

// Rutas de notificaciones
app.get('/api/notificaciones', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/notificaciones');
});
app.get('/api/notificaciones/no-leidas', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/notificaciones/no-leidas');
});
app.get('/api/notificaciones/count', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/notificaciones/count');
});
app.post('/api/notificaciones', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/notificaciones');
});
app.put('/api/notificaciones/:id/leer', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', `/api/notificaciones/${req.params.id}/leer`);
});
app.put('/api/notificaciones/leer-todas', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/notificaciones/leer-todas');
});
app.delete('/api/notificaciones/:id', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', `/api/notificaciones/${req.params.id}`);
});

// Rutas de estudiantes proximos 6 meses
app.get('/api/estudiantes/proximos-6-meses', (req: Request, res: Response) => {
  proxyRequest(req, res, 'sofia_auth', '/api/estudiantes/proximos-6-meses');
});

// Manejo de rutas no encontradas
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Gateway error:', err);
  res.status(500).json({
    success: false,
    message: 'Error en el gateway',
  });
});

// Catch-all para debug - mostrar qué rutas no se encuentran
app.use((req: Request, res: Response) => {
  console.log(`Ruta no encontrada: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.url}`,
  });
});

export default app;
