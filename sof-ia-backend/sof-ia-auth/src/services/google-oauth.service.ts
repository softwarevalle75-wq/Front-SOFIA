type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

let cachedAccessToken: { value: string; expiresAtMs: number } | null = null;

function getRequiredEnv(name: string): string {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`Falta configurar la variable de entorno ${name}.`);
  }
  return value;
}

export const googleOAuthService = {
  async getAccessToken(): Promise<string> {
    if (cachedAccessToken && cachedAccessToken.expiresAtMs > Date.now() + 30_000) {
      return cachedAccessToken.value;
    }

    const clientId = getRequiredEnv('GOOGLE_CLIENT_ID');
    const clientSecret = getRequiredEnv('GOOGLE_CLIENT_SECRET');
    const refreshToken = getRequiredEnv('GOOGLE_REFRESH_TOKEN');

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const payload = (await response.json()) as GoogleTokenResponse;
    if (!response.ok || !payload.access_token) {
      const reason = payload.error_description || payload.error || 'No se pudo renovar token de Google.';
      throw new Error(`Google OAuth token error: ${reason}`);
    }

    const expiresInMs = Math.max(60, Number(payload.expires_in || 3600)) * 1000;
    cachedAccessToken = {
      value: payload.access_token,
      expiresAtMs: Date.now() + expiresInMs,
    };

    return payload.access_token;
  },
};

export default googleOAuthService;
