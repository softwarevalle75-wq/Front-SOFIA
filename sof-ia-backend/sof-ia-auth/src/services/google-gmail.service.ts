import { googleOAuthService } from './google-oauth.service';

function getSenderEmail(): string {
  const sender = String(process.env.GOOGLE_SENDER_EMAIL || '').trim();
  if (!sender) {
    throw new Error('Falta configurar GOOGLE_SENDER_EMAIL para enviar correos con Gmail API.');
  }
  return sender;
}

function encodeBase64Url(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function sanitizeHeaderValue(value: string): string {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

export const googleGmailService = {
  async sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
    const to = sanitizeHeaderValue(params.to);
    const subject = sanitizeHeaderValue(params.subject);
    const html = String(params.html || '');

    if (!to) throw new Error('No se proporcionó destinatario para correo Gmail API.');

    const fromEmail = getSenderEmail();
    const rawMessage = [
      `From: ${fromEmail}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      html,
    ].join('\r\n');

    const accessToken = await googleOAuthService.getAccessToken();
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ raw: encodeBase64Url(rawMessage) }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Gmail API error (${response.status}): ${details}`);
    }
  },
};

export default googleGmailService;
