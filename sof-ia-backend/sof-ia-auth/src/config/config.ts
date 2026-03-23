import dotenv from 'dotenv';

dotenv.config();

type SourceMode = 'sicop' | 'dual';

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseSourceMode(value: string | undefined, fallback: SourceMode): SourceMode {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'sicop' || normalized === 'dual') {
    return normalized;
  }
  return fallback;
}

function requireEnv(name: string): string {
  const value = (process.env[name] || '').trim();
  if (!value && process.env.NODE_ENV !== 'test') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
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
    timeoutMs: parseNumber(process.env.SICOP_TIMEOUT_MS, 10000),
    retryAttempts: parseNumber(process.env.SICOP_RETRY_ATTEMPTS, 1),
  },
  featureFlags: {
    moduleSourceMode: {
      stats: parseSourceMode(process.env.STATS_SOURCE_MODE, 'sicop'),
      notifications: parseSourceMode(process.env.NOTIFICATIONS_SOURCE_MODE, 'sicop'),
      history: parseSourceMode(process.env.HISTORY_SOURCE_MODE, 'sicop'),
      conversations: parseSourceMode(process.env.CONVERSATIONS_SOURCE_MODE, 'sicop'),
      surveys: parseSourceMode(process.env.SURVEYS_SOURCE_MODE, 'sicop'),
    },
    writeLocal: {
      notifications: parseBoolean(process.env.NOTIFICATIONS_WRITE_LOCAL_ENABLED, false),
      history: parseBoolean(process.env.HISTORY_WRITE_LOCAL_ENABLED, false),
      conversations: parseBoolean(process.env.CONVERSATIONS_WRITE_LOCAL_ENABLED, false),
      surveys: parseBoolean(process.env.SURVEYS_WRITE_LOCAL_ENABLED, false),
    },
  },
};
