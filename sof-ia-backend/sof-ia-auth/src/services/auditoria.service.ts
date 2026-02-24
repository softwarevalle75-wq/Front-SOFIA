import { PrismaClient, TipoAuditoria } from '@prisma/client';

const prisma = new PrismaClient();

export const auditoriaService = {
  async registrar(data: {
    accion: TipoAuditoria;
    entidad: string;
    entidadId?: string;
    detalles: string;
    adminId?: string;
    adminNombre?: string;
    ip?: string;
    userAgent?: string;
  }) {
    return await prisma.auditoria.create({
      data: {
        accion: data.accion,
        entidad: data.entidad,
        entidadId: data.entidadId,
        detalles: data.detalles,
        adminId: data.adminId,
        adminNombre: data.adminNombre,
        ip: data.ip,
        userAgent: data.userAgent,
      },
    });
  },

  async getAll(options?: {
    entidad?: string;
    adminId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    
    if (options?.entidad) {
      where.entidad = options.entidad;
    }
    
    if (options?.adminId) {
      where.adminId = options.adminId;
    }

    return await prisma.auditoria.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  },

  async getByEntidad(entidad: string, limit?: number, offset?: number) {
    return await prisma.auditoria.findMany({
      where: { entidad },
      orderBy: { creadoEn: 'desc' },
      take: limit || 50,
      skip: offset || 0,
    });
  },

  async count(options?: {
    entidad?: string;
    adminId?: string;
  }) {
    const where: any = {};
    
    if (options?.entidad) {
      where.entidad = options.entidad;
    }
    
    if (options?.adminId) {
      where.adminId = options.adminId;
    }

    return await prisma.auditoria.count({ where });
  },
};

export default auditoriaService;
