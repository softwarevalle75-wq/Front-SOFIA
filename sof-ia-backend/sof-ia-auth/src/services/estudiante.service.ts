import { sicopUsersClient } from '../integrations/sicop/sicop-users.client';
import { mapSicopUserToSofiaStudent, mapSofiaStudentInputToSicopPayload } from '../integrations/sicop/sicop-mappers';
import { SicopIntegrationError } from '../integrations/sicop/sicop.types';

type SofiaStudent = Record<string, any>;

function asSofiaStudent(raw: unknown): SofiaStudent {
  return mapSicopUserToSofiaStudent(raw as any) as SofiaStudent;
}

async function fetchStudentList(options?: { sourceSystem?: string }): Promise<SofiaStudent[]> {
  const users = await sicopUsersClient.getUsers({
    role: 'estudiante',
    sourceSystem: options?.sourceSystem,
  });

  return users
    .filter((user) => String(user.role || '').toLowerCase() === 'estudiante')
    .map((user) => asSofiaStudent(user))
    .sort((a, b) => new Date(String(b.creadoEn || b.createdAt || 0)).getTime() - new Date(String(a.creadoEn || a.createdAt || 0)).getTime());
}

function mapStudentServiceError(error: unknown): Error {
  if (error instanceof SicopIntegrationError) {
    if (error.statusCode === 401 || error.statusCode === 403) return new Error('No autorizado para consultar estudiantes en SICOP');
    if (error.statusCode === 404) return new Error('Estudiante no encontrado');
    return new Error('No fue posible consultar estudiantes en SICOP');
  }
  return error instanceof Error ? error : new Error('Error interno en servicio de estudiantes');
}

export const estudianteService = {
  async getAll() {
    try {
      return await fetchStudentList();
    } catch (error) {
      throw mapStudentServiceError(error);
    }
  },

  async getById(id: string) {
    try {
      const raw = await sicopUsersClient.getUserById(id);
      return asSofiaStudent(raw);
    } catch (error) {
      if (error instanceof SicopIntegrationError && error.statusCode === 404) {
        return null;
      }
      throw mapStudentServiceError(error);
    }
  },

  async getByDocumento(documento: string) {
    const students = await fetchStudentList();
    return students.find((student) => String(student.documento || '') === String(documento || '')) || null;
  },

  async create(data: Record<string, unknown>) {
    try {
      const payload = mapSofiaStudentInputToSicopPayload(data);
      const created = await sicopUsersClient.upsertUser(payload);
      return asSofiaStudent(created);
    } catch (error) {
      throw mapStudentServiceError(error);
    }
  },

  async update(id: string, data: Record<string, unknown>) {
    try {
      const payload = mapSofiaStudentInputToSicopPayload(data);
      const updated = await sicopUsersClient.updateUser(id, payload);
      return asSofiaStudent(updated);
    } catch (error) {
      throw mapStudentServiceError(error);
    }
  },

  async delete(id: string) {
    try {
      await sicopUsersClient.deleteUser(id);
      return { id };
    } catch (error) {
      throw mapStudentServiceError(error);
    }
  },

  async importar(estudiantes: Array<Record<string, unknown>>) {
    const resultados = {
      exitosos: 0,
      fallidos: 0,
      errores: [] as string[],
      estudiantesCreados: [] as any[],
    };

    for (const estudiante of estudiantes) {
      try {
        const created = await this.create(estudiante);
        resultados.exitosos += 1;
        resultados.estudiantesCreados.push(created);
      } catch (error) {
        resultados.fallidos += 1;
        resultados.errores.push(error instanceof Error ? error.message : 'Error al importar estudiante');
      }
    }

    return resultados;
  },

  async getStats() {
    const students = await fetchStudentList();
    const total = students.length;
    const activos = students.filter((student) => String(student.estado || '').toUpperCase() === 'ACTIVO').length;
    const inactivos = students.filter((student) => String(student.estado || '').toUpperCase() !== 'ACTIVO').length;
    const presencial = students.filter((student) => String(student.modalidad || '').toUpperCase() === 'PRESENCIAL').length;
    const virtual = students.filter((student) => String(student.modalidad || '').toUpperCase() === 'VIRTUAL').length;

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const nuevosEsteMes = students.filter((student) => new Date(String(student.creadoEn || student.createdAt || 0)) >= inicioMes).length;

    return {
      total,
      activos,
      inactivos,
      presencial,
      virtual,
      nuevosEsteMes,
    };
  },

  async deleteAll() {
    const students = await fetchStudentList({ sourceSystem: 'SOFIA' });
    for (const student of students) {
      try {
        await sicopUsersClient.deleteUser(String(student.id));
      } catch {
        // Continúa para eliminar la mayor cantidad posible.
      }
    }

    return { eliminados: students.length };
  },

  async getProximos6Meses() {
    const ahora = new Date();
    const seisMesesEnMilisegundos = 180 * 24 * 60 * 60 * 1000;
    const cincoMesesEnMilisegundos = 150 * 24 * 60 * 60 * 1000;
    const fechaMinima = new Date(ahora.getTime() - seisMesesEnMilisegundos);
    const fechaMaxima = new Date(ahora.getTime() - cincoMesesEnMilisegundos);

    const students = await fetchStudentList();
    return students
      .filter((student) => student.fechaInicio)
      .map((student) => {
        const fechaInicio = new Date(String(student.fechaInicio));
        const seisMesesDespues = new Date(fechaInicio.getTime() + seisMesesEnMilisegundos);
        const diasRestantes = Math.ceil((seisMesesDespues.getTime() - ahora.getTime()) / (24 * 60 * 60 * 1000));

        return {
          id: student.id,
          nombre: student.nombre,
          documento: student.documento,
          correo: student.correo,
          telefono: student.telefono,
          fechaInicio: student.fechaInicio,
          programa: student.programa,
          diasRestantes,
          necesitaNotificacion: diasRestantes <= 30 && diasRestantes > 0,
        };
      })
      .filter((student) => {
        const fechaInicio = new Date(String(student.fechaInicio));
        return fechaInicio >= fechaMinima && fechaInicio <= fechaMaxima;
      })
      .sort((a, b) => new Date(String(a.fechaInicio)).getTime() - new Date(String(b.fechaInicio)).getTime());
  },
};

export default estudianteService;
