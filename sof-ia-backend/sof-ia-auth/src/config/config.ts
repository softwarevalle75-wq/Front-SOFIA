import dotenv from 'dotenv';

dotenv.config();

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function requireEnv(name: string): string {
  const value = (process.env[name] || '').trim();
  if (!value && process.env.NODE_ENV !== 'test') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  database: {
    url: process.env.DATABASE_URL || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h', // Token dura 24h, la sesión controla la expiración real
  },
  port: parseInt(process.env.PORT || '3001', 10),
  security: {
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    loginAttemptWindowMinutes: parseInt(process.env.LOGIN_ATTEMPT_WINDOW_MINUTES || '15', 10),
    sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '20', 10),
    password: {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
      requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === 'true',
      requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
      requireNumber: process.env.PASSWORD_REQUIRE_NUMBER === 'true',
      requireSpecial: process.env.PASSWORD_REQUIRE_SPECIAL === 'true',
    },
  },
  sicop: {
    gatewayUrl: requireEnv('SICOP_GATEWAY_URL'),
    integrationEmail: requireEnv('SICOP_INTEGRATION_EMAIL'),
    integrationPassword: requireEnv('SICOP_INTEGRATION_PASSWORD'),
    timeoutMs: parseNumber(process.env.SICOP_TIMEOUT_MS, 15000),
    retryAttempts: parseNumber(process.env.SICOP_RETRY_ATTEMPTS, 2),
  },
};
