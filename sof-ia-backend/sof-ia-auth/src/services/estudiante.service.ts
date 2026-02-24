import { PrismaClient, Modalidad, EstadoEstudiante } from '@prisma/client';
import { auditoriaService } from './auditoria.service';

const prisma = new PrismaClient();

export const estudianteService = {
  async getAll() {
    return await prisma.estudiante.findMany({
      orderBy: { creadoEn: 'desc' },
    });
  },

  async getById(id: string) {
    return await prisma.estudiante.findUnique({
      where: { id },
    });
  },

  async getByDocumento(documento: string) {
    return await prisma.estudiante.findUnique({
      where: { documento },
    });
  },

  async create(data: {
    documento: string;
    nombre: string;
    correo?: string;
    telefono?: string;
    programa?: string;
    modalidad?: Modalidad;
    estado?: EstadoEstudiante;
    estadoCuenta?: string;
    accesoCitas?: boolean;
    acudimientos?: boolean;
    fechaInicio?: Date;
  }) {
    return await prisma.estudiante.create({
      data: {
        documento: data.documento,
        nombre: data.nombre,
        correo: data.correo,
        telefono: data.telefono,
        programa: data.programa,
        modalidad: data.modalidad || 'PRESENCIAL',
        estado: data.estado || 'ACTIVO',
        estadoCuenta: data.estadoCuenta || 'Activo',
        accesoCitas: data.accesoCitas ?? true,
        acudimientos: data.acudimientos ?? false,
        fechaInicio: data.fechaInicio,
      },
    });
  },

  async update(id: string, data: any) {
    const allowedFields = ['documento', 'nombre', 'correo', 'telefono', 'programa', 'modalidad', 'estado', 'estadoCuenta', 'accesoCitas', 'acudimientos', 'fechaInicio'];
    const cleanData: any = {};
    
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        cleanData[key] = data[key];
      }
    }
    
    if (cleanData.fechaInicio) {
      cleanData.fechaInicio = new Date(cleanData.fechaInicio);
    }
    
    return await prisma.estudiante.update({
      where: { id },
      data: cleanData,
    });
  },

  async delete(id: string) {
    return await prisma.estudiante.delete({
      where: { id },
    });
  },

  async importar(estudiantes: Array<{
    documento: string;
    nombre: string;
    correo?: string;
    telefono?: string;
    programa?: string;
    modalidad?: Modalidad;
    fechaInicio?: Date;
  }>, adminId?: string, adminNombre?: string, ip?: string, userAgent?: string) {
    const resultados = {
      exitosos: 0,
      fallidos: 0,
      errores: [] as string[],
      estudiantesCreados: [] as any[],
    };

    for (const est of estudiantes) {
      try {
        const fechaInicioDate = est.fechaInicio ? new Date(est.fechaInicio) : undefined;
        const tieneFechaInicio = !!fechaInicioDate;
        
        const estudianteCreado = await prisma.estudiante.create({
          data: {
            documento: est.documento,
            nombre: est.nombre,
            correo: est.correo,
            telefono: est.telefono,
            programa: est.programa || 'Derecho',
            modalidad: est.modalidad || 'PRESENCIAL',
            estado: tieneFechaInicio ? 'ACTIVO' : 'INACTIVO',
            estadoCuenta: tieneFechaInicio ? 'Activo' : 'Inactivo',
            accesoCitas: tieneFechaInicio,
            fechaInicio: fechaInicioDate,
          },
        });
        resultados.exitosos++;
        resultados.estudiantesCreados.push(estudianteCreado);
        
        // Registrar auditoría por cada estudiante importado
        if (adminId) {
          await auditoriaService.registrar({
            accion: 'IMPORTAR',
            entidad: 'estudiante',
            entidadId: estudianteCreado.id,
            detalles: `Se importó estudiante: ${est.nombre} (Documento: ${est.documento})`,
            adminId,
            adminNombre,
            ip,
            userAgent,
          });
        }
      } catch (error: any) {
        resultados.fallidos++;
        resultados.errores.push(`Error con documento ${est.documento}: ${error.message}`);
      }
    }

    return resultados;
  },

  async getStats() {
    const total = await prisma.estudiante.count();
    const activos = await prisma.estudiante.count({ where: { estado: 'ACTIVO' } });
    const inactivos = await prisma.estudiante.count({ where: { estado: 'INACTIVO' } });
    const presencial = await prisma.estudiante.count({ where: { modalidad: 'PRESENCIAL' } });
    const virtual = await prisma.estudiante.count({ where: { modalidad: 'VIRTUAL' } });

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const nuevosEsteMes = await prisma.estudiante.count({ where: { creadoEn: { gte: inicioMes } } });

    return {
      total,
      activos,
      inactivos,
      presencial,
      virtual,
      nuevosEsteMes,
    };
  },

  async deleteAll(adminId?: string, adminNombre?: string, ip?: string, userAgent?: string) {
    const count = await prisma.estudiante.count();
    
    if (count === 0) {
      return { eliminados: 0 };
    }

    await prisma.estudiante.deleteMany({});

    if (adminId) {
      await auditoriaService.registrar({
        accion: 'ELIMINAR',
        entidad: 'estudiante',
        detalles: `Se eliminaron ${count} estudiantes importado(s)`,
        adminId,
        adminNombre,
        ip,
        userAgent,
      });
    }

    return { eliminados: count };
  },

  async getProximos6Meses() {
    const ahora = new Date();
    const seisMesesEnMilisegundos = 180 * 24 * 60 * 60 * 1000;
    const cincoMesesEnMilisegundos = 150 * 24 * 60 * 60 * 1000;
    
    // Buscar estudiantes que tengan entre 5 y 6 meses de antigüedad (van a cumplir 6 meses pronto)
    const fechaMinima = new Date(ahora.getTime() - seisMesesEnMilisegundos);
    const fechaMaxima = new Date(ahora.getTime() - cincoMesesEnMilisegundos);

    const estudiantes = await prisma.estudiante.findMany({
      where: {
        fechaInicio: {
          not: null,
          gte: fechaMinima,
          lte: fechaMaxima,
        },
      },
      select: {
        id: true,
        nombre: true,
        documento: true,
        correo: true,
        telefono: true,
        fechaInicio: true,
        programa: true,
      },
      orderBy: {
        fechaInicio: 'asc',
      },
    });

    return estudiantes.map(est => {
      const fechaInicio = new Date(est.fechaInicio!);
      const seisMesesDespues = new Date(fechaInicio.getTime() + seisMesesEnMilisegundos);
      const diasRestantes = Math.ceil((seisMesesDespues.getTime() - ahora.getTime()) / (24 * 60 * 60 * 1000));
      
      return {
        id: est.id,
        nombre: est.nombre,
        documento: est.documento,
        correo: est.correo,
        telefono: est.telefono,
        fechaInicio: est.fechaInicio,
        programa: est.programa,
        diasRestantes,
        necesitaNotificacion: diasRestantes <= 30 && diasRestantes > 0,
      };
    });
  },
};

export default estudianteService;
