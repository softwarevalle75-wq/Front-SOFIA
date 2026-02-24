import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const historialService = {
  async getHistorialCompleto(options?: {
    limit?: number;
    offset?: number;
    tipo?: string; // 'estudiante' | 'cita' | 'login' | 'todos'
  }) {
    const limit = options?.limit || 2000;
    const offset = options?.offset || 0;
    const tipo = options?.tipo;

    // Obtener auditorías
    const whereAuditoria: any = {};
    if (tipo && tipo !== 'login' && tipo !== 'todos') {
      whereAuditoria.entidad = tipo;
    }

    const auditorias = await prisma.auditoria.findMany({
      where: whereAuditoria,
      orderBy: { creadoEn: 'desc' },
      take: limit,
      skip: offset,
    });

    // Obtener intentos de login
    let intentosLogin: any[] = [];
    if (!tipo || tipo === 'login' || tipo === 'todos') {
      intentosLogin = await prisma.intentoLogin.findMany({
        orderBy: { creadoEn: 'desc' },
        take: limit,
        skip: offset,
      });
    }

    // Combinar y ordenar por fecha
    const historial = [
      ...auditorias.map(a => ({
        id: a.id,
        tipo: 'auditoria',
        accion: a.accion,
        entidad: a.entidad,
        entidadId: a.entidadId,
        detalles: a.detalles,
        adminId: a.adminId,
        adminNombre: a.adminNombre,
        ip: a.ip,
        userAgent: a.userAgent,
        exitoso: null,
        correo: null,
        motivoFallo: null,
        creadoEn: a.creadoEn,
      })),
      ...intentosLogin.map(i => ({
        id: i.id,
        tipo: 'login',
        accion: i.exitoso ? 'LOGIN_EXITO' : 'LOGIN_FALLO',
        entidad: 'login',
        detalles: i.exitoso 
          ? `Login exitoso desde ${i.ip || 'IP desconocida'}` 
          : `Login fallido. Motivo: ${i.motivoFallo || 'Credenciales incorrectas'}`,
        adminId: i.usuarioId,
        adminNombre: null,
        ip: i.ip,
        userAgent: i.userAgent,
        exitoso: i.exitoso,
        correo: i.correo,
        motivoFallo: i.motivoFallo,
        creadoEn: i.creadoEn,
      })),
    ].sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime());

    // Limitar resultado final
    return historial.slice(0, limit);
  },

  async getEstadisticas() {
    const totalAuditorias = await prisma.auditoria.count();
    const totalLogins = await prisma.intentoLogin.count();
    const loginsExitosos = await prisma.intentoLogin.count({ where: { exitoso: true } });
    const loginsFallidos = await prisma.intentoLogin.count({ where: { exitoso: false } });

    // Citas del mes actual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const citasMes = await prisma.cita.count({
      where: {
        creadoEn: { gte: inicioMes },
      },
    });

    // Estudiantes del mes
    const estudiantesMes = await prisma.estudiante.count({
      where: {
        creadoEn: { gte: inicioMes },
      },
    });

    return {
      totalAuditorias,
      totalLogins,
      loginsExitosos,
      loginsFallidos,
      citasMes,
      estudiantesMes,
    };
  },
};

export default historialService;
