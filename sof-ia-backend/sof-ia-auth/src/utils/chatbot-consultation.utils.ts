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

function isBotMessage(message: ChatbotMessageItem): boolean {
  return message.direction === 'OUT';
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

function isBotNoiseMessage(text: string): boolean {
  const normalized = normalizeInput(text);
  if (!normalized) return true;

  if (normalized.includes('bienvenido') && normalized.includes('consultorio juridico')) return true;
  if (normalized.includes('puedo orientarte de manera preliminar')) return true;
  if (normalized.includes('escribe reset')) return true;
  if (normalized.includes('si deseas agendar una cita')) return true;
  if (normalized.includes('para finalizar la conversacion, escribe salir')) return true;

  return false;
}

function compactLine(text: string, maxLength = 220): string {
  const singleLine = text.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= maxLength) return singleLine;
  return `${singleLine.slice(0, maxLength - 3)}...`;
}

function toSummaryPhrase(text: string, maxLength?: number): string {
  const cleaned = String(text || '')
    .replace(/[`*_~]/g, '')
    .replace(/[•▪◦]/g, ' ')
    .replace(/\s*[-–—]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (typeof maxLength === 'number' && maxLength > 0) {
    return compactLine(cleaned, maxLength);
  }
  return cleaned;
}

function cleanBotGuidance(text: string): string {
  const cleaned = toSummaryPhrase(text)
    .replace(/¿?Que deseas hacer ahora\?.*$/i, '')
    .replace(/¿?Qué deseas hacer ahora\?.*$/i, '')
    .replace(/\*?Importante:?\*?.*$/i, '')
    .trim();

  return cleaned;
}

function isLowValueBotGuidance(text: string): boolean {
  const normalized = normalizeInput(text);
  if (!normalized) return true;
  if (normalized.includes('estamos analizando tu consulta')) return true;
  if (normalized.includes('indicame primero el tipo de caso')) return true;
  if (normalized.includes('indícame primero el tipo de caso')) return true;
  if (normalized.includes('que deseas hacer ahora')) return true;
  if (normalized.includes('qué deseas hacer ahora')) return true;
  if (normalized.includes('escribe reset')) return true;
  if (normalized.includes('si deseas agendar una cita')) return true;
  if (normalized.includes('para finalizar la conversacion')) return true;
  return false;
}

function pickBestBotGuidance(botMessages: string[]): string | undefined {
  const cleaned = botMessages
    .map((text) => cleanBotGuidance(text))
    .filter((text) => text.length > 0);

  const useful = cleaned.filter((text) => !isLowValueBotGuidance(text));
  const candidates = useful.length > 0 ? useful : cleaned;
  if (candidates.length === 0) return undefined;

  const scored = candidates
    .map((text) => {
      const normalized = normalizeInput(text);
      let score = Math.min(120, text.length);
      if (normalized.includes('con lo que') || normalized.includes('puedes empezar')) score += 50;
      if (normalized.includes('ruta') || normalized.includes('reunir') || normalized.includes('orientacion preliminar')) score += 25;
      if (/\b1\)|\b2\)|\b3\)/.test(text)) score += 10;
      return { text, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.text;
}

function pickCaseType(userText: string): 'familia' | 'laboral' | 'penal' | 'general' {
  const normalized = normalizeInput(userText);
  if (normalized.includes('divor') || normalized.includes('custodia') || normalized.includes('alimentos') || normalized.includes('esposa') || normalized.includes('esposo')) {
    return 'familia';
  }
  if (normalized.includes('despido') || normalized.includes('liquidacion') || normalized.includes('salario') || normalized.includes('empleador')) {
    return 'laboral';
  }
  if (normalized.includes('golpe') || normalized.includes('amenaza') || normalized.includes('denuncia') || normalized.includes('lesion')) {
    return 'penal';
  }
  return 'general';
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = normalizeInput(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function fallbackQuestionsByCase(caseType: 'familia' | 'laboral' | 'penal' | 'general'): string[] {
  if (caseType === 'familia') {
    return [
      'El divorcio sería de mutuo acuerdo o existe conflicto?',
      'Hay hijos menores o acuerdos de custodia/alimentos?',
      'Existen bienes o deudas que deban repartirse?',
    ];
  }
  if (caseType === 'laboral') {
    return [
      'Cuál era tu tipo de contrato y fecha del hecho principal?',
      'Hubo despido, renuncia o incumplimiento de pagos?',
      'Qué resultado esperas obtener (reintegro, pago, indemnización)?',
    ];
  }
  if (caseType === 'penal') {
    return [
      'Qué ocurrió, cuándo y dónde sucedió?',
      'Existen pruebas o testigos de los hechos?',
      'Ya presentaste denuncia o necesitas orientación para hacerlo?',
    ];
  }
  return [
    'Cuál es el hecho principal que deseas resolver?',
    'Cuándo ocurrió y quiénes están involucrados?',
    'Qué resultado esperas obtener con la asesoría?',
  ];
}

function orientationByCase(caseType: 'familia' | 'laboral' | 'penal' | 'general'): string[] {
  if (caseType === 'familia') {
    return [
      'Reunir documentos clave (registro civil, pruebas de convivencia o de la situación actual).',
      'Definir si se buscará conciliación o demanda según el objetivo principal (divorcio, custodia o alimentos).',
    ];
  }
  if (caseType === 'laboral') {
    return [
      'Reunir soportes del vínculo laboral (contrato, desprendibles, comunicaciones, incapacidades).',
      'Definir si la ruta inicial será reclamación directa, conciliación o acción judicial según el incumplimiento.',
    ];
  }
  if (caseType === 'penal') {
    return [
      'Organizar cronología de hechos con fecha, lugar y personas involucradas.',
      'Conservar evidencia disponible y evaluar ruta de denuncia o medidas de protección según el riesgo.',
    ];
  }
  return [
    'Precisar los hechos principales con fechas y personas involucradas.',
    'Definir el objetivo jurídico para orientar la ruta inicial de acción.',
  ];
}

function extractQuestions(botMessages: string[]): string[] {
  const candidates = botMessages
    .flatMap((text) => text.split(/\n+/))
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => /\?$/.test(line) || /^\d+[).:-]?\s+/.test(line));

  const cleaned = candidates.map((line) => {
    const withoutPrefix = line.replace(/^\d+[).:-]?\s*/, '').replace(/^[-•]\s*/, '');
    const phrase = toSummaryPhrase(withoutPrefix);
    return phrase.endsWith('?') ? phrase : `${phrase}?`;
  });

  return uniqueStrings(cleaned).slice(0, 3);
}

function extractOrientationBullets(botMessages: string[]): string[] {
  const candidates = botMessages
    .flatMap((text) => text.split(/\n+/))
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => /^[-•]\s+/.test(line) || /^\d+[).:-]?\s+/.test(line));

  const cleaned = candidates
    .map((line) => line.replace(/^[-•]\s*/, '').replace(/^\d+[).:-]?\s*/, ''))
    .map((line) => toSummaryPhrase(line, 180));

  return uniqueStrings(cleaned).slice(0, 4);
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
  const consultationMessages = extractConsultationContentMessages(segment.messages);

  const userMessages = consultationMessages
    .filter((item) => isUserMessage(item))
    .map((item) => String(item.text || '').trim())
    .filter((text) => text.length > 0 && !isInternalFlowMessage(text));

  const botMessages = consultationMessages
    .filter((item) => isBotMessage(item))
    .map((item) => String(item.text || '').trim())
    .filter((text) => text.length > 0 && !isBotNoiseMessage(text));

  if (userMessages.length === 0 && botMessages.length === 0) {
    return 'Aun no hay resumen generado para esta consulta.';
  }

  const userMain = toSummaryPhrase(userMessages[0] || segment.firstUserMessage || 'una consulta legal');
  const userDetails = userMessages
    .slice(1, 3)
    .map((text) => toSummaryPhrase(text))
    .filter((text) => text.length > 0 && text !== userMain);

  const hasTechnicalFallback = botMessages.some((text) => normalizeInput(text).includes('no pude consultar la base juridica'));
  const botMain = pickBestBotGuidance(botMessages);

  const caseType = pickCaseType(userMain);
  const orientationBullets = orientationByCase(caseType);
  const questions = fallbackQuestionsByCase(caseType);

  const analysisContext = userDetails.length > 0
    ? `\nContexto adicional: ${userDetails.join('; ')}.`
    : '';

  const orientationIntro = hasTechnicalFallback
    ? '\n\nSOF-IA brindó una orientación preliminar indicando que, debido a un problema técnico, no fue posible consultar la base jurídica en ese momento. Mientras se restablece el sistema, se compartió una guía inicial.'
    : botMain
      ? `\n\nRespuesta entregada por SOF-IA: ${botMain}`
      : '\n\nSOF-IA brindó una orientación preliminar para definir una ruta inicial del caso.';

  return [
    '📌 Resumen Generado por IA',
    '',
    '🟢 Análisis del Caso',
    `El usuario consultó: "${userMain}".${analysisContext}${orientationIntro}`,
    '',
    '📂 Orientación Inicial',
    ...orientationBullets.map((item) => `• ${item}`),
    '',
    '❓ Preguntas Clave para Avanzar',
    ...questions.map((item, index) => `${index + 1}. ${item}`),
  ].join('\n');
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
