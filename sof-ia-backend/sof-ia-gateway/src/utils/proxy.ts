import { Request, Response } from 'express';
import http from 'http';

export const proxyRequest = (
  req: Request,
  res: Response,
  targetService: string,
  targetPath: string
) => {
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
