import { describe, expect, it } from 'vitest';
import { mapSicopAppointmentToSofiaCita, mapSicopUserToSofiaStudent } from './sicop-mappers';

describe('sicop mappers', () => {
  it('maps SICOP users to SOFIA students', () => {
    const mapped = mapSicopUserToSofiaStudent({
      id: 'u-1',
      name: 'Estudiante Uno',
      email: 'uno@uni.edu',
      role: 'estudiante',
      area: 'Civil',
      status: 'active',
      createdAt: '2026-03-10T00:00:00.000Z',
      updatedAt: '2026-03-10T01:00:00.000Z',
    });

    expect(mapped).toMatchObject({
      id: 'u-1',
      nombre: 'Estudiante Uno',
      documento: 'u-1',
      correo: 'uno@uni.edu',
      programa: 'Civil',
      modalidad: 'PRESENCIAL',
      estado: 'ACTIVO',
      accesoCitas: true,
    });
  });

  it('maps SICOP appointments to SOFIA citas', () => {
    const mapped = mapSicopAppointmentToSofiaCita({
      id: 'c-1',
      studentId: 's-9',
      date: '2026-03-10T15:30:00.000Z',
      mode: 'virtual',
      status: 'cancelled',
      reason: 'Consulta general',
      student: {
        id: 's-9',
        name: 'Laura Perez',
        email: 'laura@uni.edu',
      },
      createdAt: '2026-03-10T10:00:00.000Z',
      updatedAt: '2026-03-10T11:00:00.000Z',
    });

    expect(mapped).toMatchObject({
      id: 'c-1',
      estudianteId: 's-9',
      hora: '15:30',
      modalidad: 'VIRTUAL',
      estado: 'CANCELADA',
      motivo: 'Consulta general',
      estudiante: {
        id: 's-9',
        nombre: 'Laura Perez',
      },
    });
  });
});
