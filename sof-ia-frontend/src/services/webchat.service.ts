import { apiService } from '@/services/api.service';
import { API_CONFIG } from '@/config/api.config';
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
  private readonly endpoint = `${API_CONFIG.ENDPOINTS.CONVERSACIONES.BASE}/webchat/message`;

  async sendMessage(input: { text: string; displayName?: string }): Promise<string[]> {
    const response = await apiService.post<WebchatSendMessageResponse>(this.endpoint, {
      message: input.text,
      displayName: input.displayName,
      externalUserId: getStoredExternalUserId(),
      tenantId: import.meta.env.VITE_WEBCHAT_TENANT_ID || CHATBOT_CONFIG.WEBCHAT_TENANT_ID,
    });

    if (!response.success) {
      throw new Error(response.message || 'No fue posible enviar el mensaje al chatbot.');
    }

    return response.data?.botMessages || [];
  }

  restartSession() {
    rotateExternalUserId();
  }
}

export const webchatService = new WebchatService();
