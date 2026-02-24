import { config } from './config/config';
import app from './app';

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 SOF-IA Auth service running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
});
