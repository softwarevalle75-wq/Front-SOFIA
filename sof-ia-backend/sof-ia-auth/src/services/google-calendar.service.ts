import { randomUUID } from 'crypto';
import { googleOAuthService } from './google-oauth.service';

type CreateMeetEventInput = {
  summary: string;
  description?: string;
  attendeeEmails?: string[];
  start: Date;
  end: Date;
  timezone?: string;
};

type CalendarEventResponse = {
  id?: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{ uri?: string; entryPointType?: string }>;
  };
};

function getCalendarId(): string {
  return String(process.env.GOOGLE_CALENDAR_ID || 'primary').trim() || 'primary';
}

function getTimeZone(): string {
  return String(process.env.GOOGLE_CALENDAR_TIMEZONE || 'America/Bogota').trim() || 'America/Bogota';
}

function normalizeAttendees(attendeeEmails: string[]): Array<{ email: string }> {
  const dedup = new Set<string>();
  const normalized: Array<{ email: string }> = [];

  for (const email of attendeeEmails) {
    const clean = String(email || '').trim().toLowerCase();
    if (!clean || dedup.has(clean)) continue;
    dedup.add(clean);
    normalized.push({ email: clean });
  }

  return normalized;
}

export const googleCalendarService = {
  async createMeetEvent(input: CreateMeetEventInput): Promise<{ eventId: string | null; meetLink: string }> {
    const accessToken = await googleOAuthService.getAccessToken();
    const calendarId = encodeURIComponent(getCalendarId());
    const timezone = input.timezone || getTimeZone();

    const attendees = normalizeAttendees(input.attendeeEmails || []);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          summary: input.summary,
          description: input.description || '',
          start: {
            dateTime: input.start.toISOString(),
            timeZone: timezone,
          },
          end: {
            dateTime: input.end.toISOString(),
            timeZone: timezone,
          },
          attendees,
          conferenceData: {
            createRequest: {
              requestId: randomUUID(),
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        }),
      },
    );

    const payload = (await response.json()) as CalendarEventResponse & { error?: { message?: string } };
    if (!response.ok) {
      throw new Error(payload?.error?.message || `Google Calendar API error (${response.status}).`);
    }

    const meetFromEntryPoints =
      payload.conferenceData?.entryPoints?.find((item) => item.entryPointType === 'video')?.uri || '';
    const meetLink = String(payload.hangoutLink || meetFromEntryPoints || '').trim();

    if (!meetLink) {
      throw new Error('Google Calendar no devolvió un enlace de Meet para la cita virtual.');
    }

    return {
      eventId: payload.id || null,
      meetLink,
    };
  },
};

export default googleCalendarService;
