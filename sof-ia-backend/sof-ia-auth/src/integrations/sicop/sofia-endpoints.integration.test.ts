import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

function jsonResponse(status: number, payload: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
  });
}

function createJwtWithExp(expSecondsFromNow: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
    }),
  ).toString('base64url');
  return `${header}.${payload}.signature`;
}

describe('SOFIA endpoint integration via SICOP', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.SICOP_GATEWAY_URL = 'https://sicop.mock';
    process.env.SICOP_INTEGRATION_EMAIL = 'integration@mock.test';
    process.env.SICOP_INTEGRATION_PASSWORD = 'mock-password';
    process.env.SICOP_TIMEOUT_MS = '20';
    process.env.SICOP_RETRY_ATTEMPTS = '2';
    process.env.CHATBOT_INTERNAL_TOKEN = 'internal-token';
  });

  it('supports auth login, estudiantes and citas CRUD endpoints', async () => {
    const technicalToken = createJwtWithExp(600);
    const userToken = createJwtWithExp(600);
    let appointments = [
      {
        id: 'apt-1',
        studentId: 'stu-1',
        date: '2026-03-15T13:00:00.000Z',
        time: '13:00',
        status: 'AGENDADA',
        mode: 'PRESENCIAL',
        reason: 'Consulta inicial',
        student: { id: 'stu-1', name: 'Ana Estudiante', email: 'ana@uni.edu.co' },
        createdAt: '2026-03-10T10:00:00.000Z',
        updatedAt: '2026-03-10T10:00:00.000Z',
      },
    ];

    const fetchMock = vi.fn(async (input: any, init?: RequestInit) => {
      const url = String(input);
      const method = String(init?.method || 'GET').toUpperCase();
      const parsedUrl = new URL(url);
      const pathWithQuery = `${parsedUrl.pathname}${parsedUrl.search}`;

      if (parsedUrl.pathname === '/auth/login' && method === 'POST') {
        const body = JSON.parse(String(init?.body || '{}'));
        if (body.email === process.env.SICOP_INTEGRATION_EMAIL) {
          return jsonResponse(200, { token: technicalToken });
        }

        return jsonResponse(200, {
          token: userToken,
          user: {
            id: 'admin-1',
            fullName: 'Admin SOFIA',
            email: body.email,
            role: 'administrativo',
          },
        });
      }

      if (parsedUrl.pathname === '/auth/me' && method === 'GET') {
        const auth = String((init?.headers as Record<string, string> | undefined)?.Authorization || '');
        if (!auth.includes(userToken)) {
          return jsonResponse(401, { message: 'unauthorized' });
        }

        return jsonResponse(200, {
          user: {
            id: 'admin-1',
            fullName: 'Admin SOFIA',
            email: 'admin@sofia.test',
            role: 'administrativo',
          },
        });
      }

      if (parsedUrl.pathname === '/auth/users' && method === 'GET') {
        return jsonResponse(200, {
          users: [
            {
              id: 'stu-1',
              name: 'Ana Estudiante',
              email: 'ana@uni.edu.co',
              role: 'estudiante',
              createdAt: '2026-03-10T10:00:00.000Z',
              updatedAt: '2026-03-10T10:00:00.000Z',
            },
          ],
        });
      }

      if (parsedUrl.pathname === '/appointments' && method === 'GET') {
        return jsonResponse(
          200,
          { appointments },
          {
            'x-pagination-limit': '100',
            'x-pagination-offset': '0',
            'x-pagination-has-more': 'false',
          },
        );
      }

      if (parsedUrl.pathname === '/appointments' && method === 'POST') {
        const body = JSON.parse(String(init?.body || '{}'));
        const created = {
          id: 'apt-2',
          studentId: body.studentId || body.estudianteId || 'stu-1',
          date: body.date || body.fecha,
          time: body.time || body.hora,
          status: body.status || body.estado || 'AGENDADA',
          mode: body.mode || body.modalidad || 'PRESENCIAL',
          reason: body.reason || body.motivo || '',
          student: { id: 'stu-1', name: 'Ana Estudiante', email: 'ana@uni.edu.co' },
          createdAt: '2026-03-12T10:00:00.000Z',
          updatedAt: '2026-03-12T10:00:00.000Z',
        };
        appointments = [created, ...appointments];
        return jsonResponse(201, created);
      }

      if (parsedUrl.pathname.startsWith('/appointments/') && method === 'GET') {
        const appointmentId = parsedUrl.pathname.split('/').pop() || '';
        const found = appointments.find((item) => item.id === appointmentId);
        return found ? jsonResponse(200, found) : jsonResponse(404, { message: 'not found' });
      }

      if (parsedUrl.pathname.startsWith('/appointments/') && method === 'PATCH') {
        const appointmentId = parsedUrl.pathname.split('/').pop() || '';
        const body = JSON.parse(String(init?.body || '{}'));
        appointments = appointments.map((item) => {
          if (item.id !== appointmentId) return item;
          return {
            ...item,
            status: body.status || body.estado || item.status,
            reason: body.reason || body.motivo || item.reason,
            mode: body.mode || body.modalidad || item.mode,
            time: body.time || body.hora || item.time,
            date: body.date || body.fecha || item.date,
            updatedAt: '2026-03-12T11:00:00.000Z',
          };
        });
        return jsonResponse(200, appointments.find((item) => item.id === appointmentId));
      }

      if (parsedUrl.pathname.startsWith('/appointments/') && method === 'DELETE') {
        const appointmentId = parsedUrl.pathname.split('/').pop() || '';
        appointments = appointments.filter((item) => item.id !== appointmentId);
        return new Response(null, { status: 204 });
      }

      throw new Error(`Unhandled fetch in test: ${method} ${pathWithQuery}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const { default: app } = await import('../../app');

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'admin@sofia.test', password: 'secret' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(typeof loginRes.body.token).toBe('string');
    expect(loginRes.body.user.rol).toBe('ADMIN_CONSULTORIO');

    const bearer = `Bearer ${loginRes.body.token}`;

    const studentsRes = await request(app)
      .get('/api/estudiantes')
      .set('Authorization', bearer);

    expect(studentsRes.status).toBe(200);
    expect(studentsRes.body.success).toBe(true);
    expect(Array.isArray(studentsRes.body.data)).toBe(true);

    const getCitasRes = await request(app)
      .get('/api/citas')
      .query({ origen: 'sistema' })
      .set('Authorization', bearer);

    expect(getCitasRes.status).toBe(200);
    expect(getCitasRes.body.success).toBe(true);
    expect(Array.isArray(getCitasRes.body.data)).toBe(true);

    const createCitaRes = await request(app)
      .post('/api/citas')
      .set('Authorization', bearer)
      .send({
        fecha: '2026-03-20',
        hora: '14:00',
        modalidad: 'PRESENCIAL',
        motivo: 'Seguimiento',
      });

    expect(createCitaRes.status).toBe(201);
    expect(createCitaRes.body.success).toBe(true);
    expect(createCitaRes.body.data.id).toBe('apt-2');

    const updateCitaRes = await request(app)
      .put('/api/citas/apt-2')
      .set('Authorization', bearer)
      .send({ motivo: 'Motivo actualizado' });

    expect(updateCitaRes.status).toBe(200);
    expect(updateCitaRes.body.success).toBe(true);
    expect(updateCitaRes.body.data.motivo).toContain('Motivo actualizado');

    const deleteCitaRes = await request(app)
      .delete('/api/citas/apt-2')
      .set('Authorization', bearer);

    expect(deleteCitaRes.status).toBe(200);
    expect(deleteCitaRes.body.success).toBe(true);
  });
});
