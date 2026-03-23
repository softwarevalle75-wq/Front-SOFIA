import { config } from '../../config/config';
import SicopTokenStore from './sicop-token.store';
import {
  SicopAuthUser,
  SicopHttpResponse,
  SicopIntegrationError,
  SicopLoginResponse,
  SicopMeResponse,
  SicopRequestOptions,
} from './sicop.types';

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const NON_RETRYABLE_STATUS = new Set([400, 401, 403, 404]);

function parseJwtExpirationMs(token: string): number {
  try {
    const [, payload = ''] = token.split('.');
    if (!payload) return Date.now() + 15 * 60 * 1000;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as { exp?: number };
    if (!decoded.exp) return Date.now() + 15 * 60 * 1000;
    return decoded.exp * 1000;
  } catch {
    return Date.now() + 15 * 60 * 1000;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
  const base = 300;
  const exponential = base * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 150);
  return Math.min(2_500, exponential + jitter);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isRetryableNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (isAbortError(error)) return true;
  return ['TypeError', 'FetchError'].includes(error.name);
}

function logIntegration(params: {
  endpoint: string;
  status: number | 'NETWORK_ERROR' | 'TIMEOUT';
  latencyMs: number;
  retryCount: number;
}): void {
  const payload = {
    integration: 'sicop',
    endpoint: params.endpoint,
    status: params.status,
    latency_ms: params.latencyMs,
    retry_count: params.retryCount,
  };
  console.info(JSON.stringify(payload));
}

export class SicopAuthClient {
  private readonly tokenStore = new SicopTokenStore();

  private loginInFlight: Promise<string> | null = null;

  private get baseUrl(): string {
    return config.sicop.gatewayUrl.replace(/\/$/, '');
  }

  private async runRequest<T>(params: {
    endpoint: string;
    init?: RequestInit;
    retryAttempts?: number;
  }): Promise<SicopHttpResponse<T>> {
    const maxRetries = params.retryAttempts ?? config.sicop.retryAttempts;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.sicop.timeoutMs);

      try {
        const response = await fetch(`${this.baseUrl}${params.endpoint}`, {
          ...(params.init || {}),
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(params.init?.headers || {}),
          },
        });
        clearTimeout(timeout);

        const latency = Date.now() - start;
        logIntegration({
          endpoint: params.endpoint,
          status: response.status,
          latencyMs: latency,
          retryCount: attempt,
        });

        const raw = await response.text();
        let parsed: any = null;
        if (raw) {
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = { message: raw };
          }
        }

        if (!response.ok) {
          const retryable = RETRYABLE_STATUS.has(response.status);
          const noRetry = NON_RETRYABLE_STATUS.has(response.status);
          if (retryable && attempt < maxRetries) {
            await sleep(backoffMs(attempt));
            continue;
          }

          const safeMessage =
            (parsed && typeof parsed.error === 'string' && parsed.error) ||
            (parsed && typeof parsed.message === 'string' && parsed.message) ||
            `Error SICOP ${response.status}`;
          throw new SicopIntegrationError(safeMessage, response.status, noRetry ? 'SICOP_REQUEST_REJECTED' : 'SICOP_REQUEST_FAILED');
        }

        return {
          status: response.status,
          data: parsed as T,
          headers: Object.fromEntries(response.headers.entries()),
        };
      } catch (error) {
        clearTimeout(timeout);
        if (error instanceof SicopIntegrationError) {
          throw error;
        }

        const latency = Date.now() - start;
        logIntegration({
          endpoint: params.endpoint,
          status: isAbortError(error) ? 'TIMEOUT' : 'NETWORK_ERROR',
          latencyMs: latency,
          retryCount: attempt,
        });

        if (isRetryableNetworkError(error) && attempt < maxRetries) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw new SicopIntegrationError('No fue posible conectar con SICOP', 502, 'SICOP_NETWORK_ERROR');
      }
    }

    throw new SicopIntegrationError('No fue posible completar la solicitud a SICOP', 502, 'SICOP_REQUEST_EXHAUSTED');
  }

  async request<T>(endpoint: string, init?: RequestInit): Promise<SicopHttpResponse<T>> {
    return this.runRequest<T>({
      endpoint,
      init,
      retryAttempts: config.sicop.retryAttempts,
    });
  }

  private async requestLoginWithOptionalScope(payload: {
    email: string;
    password: string;
    scope: 'sicop' | 'sofia';
  }): Promise<SicopHttpResponse<SicopLoginResponse>> {
    try {
      return await this.runRequest<SicopLoginResponse>({
        endpoint: '/auth/login',
        init: {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        retryAttempts: config.sicop.retryAttempts,
      });
    } catch (error) {
      if (
        error instanceof SicopIntegrationError
        && error.statusCode === 400
        && /scope\s+.*not allowed/i.test(String(error.message || ''))
      ) {
        return this.runRequest<SicopLoginResponse>({
          endpoint: '/auth/login',
          init: {
            method: 'POST',
            body: JSON.stringify({
              email: payload.email,
              password: payload.password,
            }),
          },
          retryAttempts: config.sicop.retryAttempts,
        });
      }
      throw error;
    }
  }

  private async login(): Promise<string> {
    if (this.loginInFlight) return this.loginInFlight;

    this.loginInFlight = (async () => {
      const response = await this.requestLoginWithOptionalScope({
        email: config.sicop.integrationEmail,
        password: config.sicop.integrationPassword,
        scope: 'sicop',
      });

      if (!response.data?.token) {
        throw new SicopIntegrationError('SICOP no devolvió token de integración', 502, 'SICOP_MISSING_TOKEN');
      }

      const expiresAtMs = parseJwtExpirationMs(response.data.token);
      this.tokenStore.setToken(response.data.token, expiresAtMs);
      return response.data.token;
    })();

    try {
      return await this.loginInFlight;
    } finally {
      this.loginInFlight = null;
    }
  }

  async getTechnicalToken(): Promise<string> {
    const cachedToken = this.tokenStore.getToken();
    if (cachedToken) return cachedToken;
    return this.login();
  }

  invalidateToken(): void {
    this.tokenStore.invalidate();
  }

  async requestWithAuth<T>(
    endpoint: string,
    init?: RequestInit,
    options?: SicopRequestOptions,
  ): Promise<SicopHttpResponse<T>> {
    const token = await this.getTechnicalToken();
    try {
      return await this.runRequest<T>({
        endpoint,
        init: {
          ...(init || {}),
          headers: {
            ...(init?.headers || {}),
            Authorization: `Bearer ${token}`,
          },
        },
        retryAttempts: config.sicop.retryAttempts,
      });
    } catch (error) {
      if (
        error instanceof SicopIntegrationError
        && (error.statusCode === 401 || error.statusCode === 403)
        && !options?.reloginAttempted
      ) {
        this.invalidateToken();
        await this.getTechnicalToken();
        return this.requestWithAuth<T>(endpoint, init, { ...options, reloginAttempted: true });
      }
      throw error;
    }
  }

  async loginUser(correo: string, password: string): Promise<SicopHttpResponse<SicopLoginResponse>> {
    return this.requestLoginWithOptionalScope({
      email: correo,
      password,
      scope: 'sofia',
    });
  }

  async requestWithUserToken<T>(token: string, endpoint: string, init?: RequestInit): Promise<SicopHttpResponse<T>> {
    return this.request<T>(endpoint, {
      ...(init || {}),
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getMe(token: string): Promise<SicopAuthUser> {
    const response = await this.requestWithUserToken<SicopMeResponse | SicopAuthUser>(token, '/auth/me', {
      method: 'GET',
    });

    const payload = response.data;
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      if ((payload as SicopMeResponse).user && typeof (payload as SicopMeResponse).user === 'object') {
        return (payload as SicopMeResponse).user as SicopAuthUser;
      }
      if ((payload as SicopMeResponse).data && typeof (payload as SicopMeResponse).data === 'object') {
        return (payload as SicopMeResponse).data as SicopAuthUser;
      }
      return payload as SicopAuthUser;
    }

    throw new SicopIntegrationError('SICOP devolvió un payload inválido en /auth/me', 502, 'SICOP_INVALID_ME_PAYLOAD');
  }
}

export const sicopAuthClient = new SicopAuthClient();

export default sicopAuthClient;
