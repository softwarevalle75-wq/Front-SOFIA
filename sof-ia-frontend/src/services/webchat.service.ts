import { CHATBOT_CONFIG } from '@/config/constants';

interface WebchatSendMessageResponse {
  success: boolean;
  data?: {
    externalUserId: string;
    conversationId: string | null;
    correlationId: string | null;
    responses: Array<{
      type?: string;
      text?: string;
      payload?: Record<string, unknown>;
    }>;
    botMessages: string[];
  };
  message?: string;
}

const EXTERNAL_USER_KEY = 'sofia-webchat-external-user-id';

function getStoredExternalUserId(): string {
  const existing = localStorage.getItem(EXTERNAL_USER_KEY);
  if (existing && existing.trim().length > 0) return existing;

  const generated = `admin-${crypto.randomUUID()}`;
  localStorage.setItem(EXTERNAL_USER_KEY, generated);
  return generated;
}

function rotateExternalUserId(): string {
  const generated = `admin-${crypto.randomUUID()}`;
  localStorage.setItem(EXTERNAL_USER_KEY, generated);
  return generated;
}

class WebchatService {
  private readonly microserviceEndpoint = `${String(import.meta.env.VITE_CHATBOT_WEB_API_URL || 'http://localhost:3060').trim().replace(/\/$/, '')}/v1/chatbot/web/message`;

  async sendMessage(input: { text: string; displayName?: string }): Promise<string[]> {
    const payloadBody = {
      message: input.text,
      displayName: input.displayName,
      externalUserId: getStoredExternalUserId(),
      tenantId: import.meta.env.VITE_WEBCHAT_TENANT_ID || CHATBOT_CONFIG.WEBCHAT_TENANT_ID,
    };

    let response: Response;
    try {
      response = await fetch(this.microserviceEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadBody),
      });
    } catch {
      throw new Error('No fue posible conectar con el servicio del chatbot. Revisa la configuracion de VITE_CHATBOT_WEB_API_URL.');
    }

    let payload: WebchatSendMessageResponse | null = null;
    try {
      payload = (await response.json()) as WebchatSendMessageResponse;
    } catch {
      payload = null;
    }

    if (!response.ok || !payload?.success) {
      const fallbackMessage =
        response.status >= 500
          ? 'El servicio del chatbot no esta disponible temporalmente.'
          : 'No fue posible enviar el mensaje al chatbot.';
      throw new Error(payload?.message || fallbackMessage);
    }

    return payload.data?.botMessages || [];
  }

  restartSession() {
    rotateExternalUserId();
  }
}

export const webchatService = new WebchatService();
