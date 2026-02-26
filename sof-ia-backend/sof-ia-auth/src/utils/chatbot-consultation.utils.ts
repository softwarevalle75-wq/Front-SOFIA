type ChatbotDirection = 'IN' | 'OUT';

export interface ChatbotMessageItem {
  id: string;
  direction: ChatbotDirection;
  text: string;
  createdAt: Date | string;
}

export interface ChatbotConsultationSegment {
  id: string;
  conversationId: string;
  startedAt: Date;
  endedAt: Date | null;
  status: 'closed' | 'open';
  startCommand: string;
  endCommand?: string;
  firstUserMessage: string;
  messages: ChatbotMessageItem[];
}

function normalizeInput(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[!¡?¿.,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function isStartCommand(text: string): boolean {
  const normalized = normalizeInput(text);
  return normalized === 'hola'
    || normalized === 'reset'
    || normalized === '/startmutu'
    || normalized === '/start';
}

function isEndCommand(text: string): boolean {
  const normalized = normalizeInput(text);
  if (normalized === 'salir' || normalized === '/salir') return true;
  return normalized.includes('agendar') && normalized.includes('cita');
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

function isUserMessage(message: ChatbotMessageItem): boolean {
  return message.direction === 'IN';
}

function isInternalFlowMessage(text: string): boolean {
  const normalized = normalizeInput(text);
  if (!normalized) return true;
  if (isStartCommand(normalized) || isEndCommand(normalized)) return true;
  return normalized.startsWith('/')
    || normalized === 'si'
    || normalized === 'no'
    || normalized === 'ok'
    || normalized.startsWith('confirmar cita')
    || normalized.startsWith('cambiar ')
    || normalized.startsWith('cancelar cita')
    || normalized.startsWith('reprogramar cita');
}

function isConsultationContentInbound(text: string): boolean {
  const normalized = normalizeInput(text);
  if (!normalized) return false;
  if (isStartCommand(normalized) || isEndCommand(normalized)) return false;
  return !isInternalFlowMessage(normalized);
}

export function segmentConsultationsByMarkers(input: {
  conversationId: string;
  messages: ChatbotMessageItem[];
}): ChatbotConsultationSegment[] {
  const ordered = [...input.messages]
    .map((item) => ({ ...item, text: String(item.text || '') }))
    .filter((item) => item.text.trim().length > 0)
    .sort((a, b) => toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime());

  const segments: ChatbotConsultationSegment[] = [];
  let current: {
    startMessageId: string;
    startedAt: Date;
    startCommand: string;
    messages: ChatbotMessageItem[];
  } | null = null;

  for (const message of ordered) {
    const createdAt = toDate(message.createdAt);
    if (!isValidDate(createdAt)) continue;

    const text = String(message.text || '').trim();
    if (!text) continue;
    const normalized = normalizeInput(text);
    const userMsg = isUserMessage(message);

    if (userMsg && isStartCommand(normalized)) {
      if (current && current.messages.length > 0) {
        const lastMessage = current.messages[current.messages.length - 1];
        segments.push({
          id: `${input.conversationId}:${current.startMessageId}`,
          conversationId: input.conversationId,
          startedAt: current.startedAt,
          endedAt: toDate(lastMessage.createdAt),
          status: 'open',
          startCommand: current.startCommand,
          firstUserMessage: pickFirstUserMessage(current.messages),
          messages: current.messages,
        });
      }

      current = {
        startMessageId: message.id,
        startedAt: createdAt,
        startCommand: text,
        messages: [{ ...message, createdAt }],
      };
      continue;
    }

    if (!current) continue;

    current.messages.push({ ...message, createdAt });

    if (userMsg && isEndCommand(normalized)) {
      segments.push({
        id: `${input.conversationId}:${current.startMessageId}`,
        conversationId: input.conversationId,
        startedAt: current.startedAt,
        endedAt: createdAt,
        status: 'closed',
        startCommand: current.startCommand,
        endCommand: text,
        firstUserMessage: pickFirstUserMessage(current.messages),
        messages: current.messages,
      });
      current = null;
    }
  }

  if (current && current.messages.length > 0) {
    const lastMessage = current.messages[current.messages.length - 1];
    segments.push({
      id: `${input.conversationId}:${current.startMessageId}`,
      conversationId: input.conversationId,
      startedAt: current.startedAt,
      endedAt: toDate(lastMessage.createdAt),
      status: 'open',
      startCommand: current.startCommand,
      firstUserMessage: pickFirstUserMessage(current.messages),
      messages: current.messages,
    });
  }

  return segments.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

export function pickFirstUserMessage(messages: ChatbotMessageItem[]): string {
  const candidate = messages.find((item) => {
    if (!isUserMessage(item)) return false;
    const content = String(item.text || '').trim();
    if (!content) return false;
    return !isInternalFlowMessage(content);
  });

  if (candidate) return String(candidate.text || '').trim();

  const firstInbound = messages.find((item) => isUserMessage(item) && String(item.text || '').trim().length > 0);
  return firstInbound ? String(firstInbound.text || '').trim() : 'Consulta de chatbot';
}

export function buildConsultationSummary(segment: ChatbotConsultationSegment): string {
  const userMessages = extractConsultationContentMessages(segment.messages)
    .filter((item) => isUserMessage(item))
    .map((item) => String(item.text || '').trim())
    .filter((text) => text.length > 0);

  if (userMessages.length === 0) {
    return 'Aun no hay resumen generado para esta consulta.';
  }

  const first = userMessages[0];
  const details = userMessages.slice(1, 3).join(' | ');
  const compactFirst = first.length > 320 ? `${first.slice(0, 317)}...` : first;

  if (!details) return compactFirst;
  const compactDetails = details.length > 220 ? `${details.slice(0, 217)}...` : details;
  return `${compactFirst}\n\nPuntos clave: ${compactDetails}`;
}

export function extractConsultationContentMessages(messages: ChatbotMessageItem[]): ChatbotMessageItem[] {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const firstContentIndex = messages.findIndex((item) => {
    if (!isUserMessage(item)) return false;
    return isConsultationContentInbound(String(item.text || ''));
  });

  if (firstContentIndex <= 0) return [...messages];
  return messages.slice(firstContentIndex);
}

export function getStoredConsultationSummary(
  contextData: Record<string, unknown> | null | undefined,
  consultationId: string,
): string | null {
  if (!contextData || typeof contextData !== 'object') return null;

  const profile = typeof contextData.profile === 'object' && contextData.profile !== null
    ? contextData.profile as Record<string, unknown>
    : undefined;

  const summaries = typeof profile?.consultationSummaries === 'object' && profile.consultationSummaries !== null
    ? profile.consultationSummaries as Record<string, unknown>
    : undefined;

  if (summaries && typeof summaries[consultationId] === 'string') {
    const stored = String(summaries[consultationId] || '').trim();
    if (stored.length > 0) return stored;
  }

  const legacy = (contextData.resumen || contextData.summary) as unknown;
  if (typeof legacy === 'string' && legacy.trim().length > 0) return legacy.trim();

  return null;
}

export function isConsultationDeleted(
  contextData: Record<string, unknown> | null | undefined,
  consultationId: string,
): boolean {
  if (!contextData || typeof contextData !== 'object') return false;

  const profile = typeof contextData.profile === 'object' && contextData.profile !== null
    ? contextData.profile as Record<string, unknown>
    : undefined;

  const deleted = typeof profile?.deletedConsultations === 'object' && profile.deletedConsultations !== null
    ? profile.deletedConsultations as Record<string, unknown>
    : undefined;

  if (!deleted) return false;
  return deleted[consultationId] === true;
}
