import prisma from '../config/prisma';
import { config } from '../config/config';
import { comparePassword, hashPassword, validatePasswordPolicy } from '../utils/password.utils';
import { generateToken, generateSessionToken } from '../utils/jwt.utils';
import { LoginDto } from '../dto/login.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { Rol, EstadoUsuario, TipoAuditoria } from '@prisma/client';

export interface AuthResult {
  success: boolean;
  message: string;
  requiresPasswordChange?: boolean;
  token?: string;
  user?: {
    id: string;
    nombreCompleto: string;
    correo: string;
    rol: Rol;
    primerIngreso: boolean;
  };
}

export const authService = {
  async login(data: LoginDto, ip?: string, userAgent?: string): Promise<AuthResult> {
    const { correo, password } = data;

    const usuario = await prisma.usuario.findUnique({
      where: { correo },
    });

    const ahora = new Date();
    const ventanaTiempo = new Date(
      ahora.getTime() - config.security.loginAttemptWindowMinutes * 60 * 1000
    );

    const intentosRecientes = await prisma.intentoLogin.count({
      where: {
        correo,
        exitoso: false,
        creadoEn: { gte: ventanaTiempo },
      },
    });

    if (intentosRecientes >= config.security.maxLoginAttempts) {
      await prisma.intentoLogin.create({
        data: {
          correo,
          tipo: 'LOGIN',
          exitoso: false,
          ip: ip || null,
          userAgent: userAgent || null,
          motivoFallo: 'Máximo de intentos alcanzado',
        },
      });

      return {
        success: false,
        message: 'Demasiados intentos fallidos. Intente más tarde.',
      };
    }

    if (!usuario) {
      await prisma.intentoLogin.create({
        data: {
          correo,
          tipo: 'LOGIN',
          exitoso: false,
          ip: ip || null,
          userAgent: userAgent || null,
          motivoFallo: 'Usuario no encontrado',
        },
      });

      // Registrar en auditoría
      await prisma.auditoria.create({
        data: {
          accion: TipoAuditoria.LOGIN_FALLO,
          entidad: 'login',
          detalles: `Intento de login fallido. Usuario no encontrado: ${correo}`,
          ip: ip || null,
          userAgent: userAgent || null,
        },
      });

      return {
        success: false,
        message: 'Credenciales inválidas',
      };
    }

    if (usuario.estado !== EstadoUsuario.ACTIVO) {
      await prisma.intentoLogin.create({
        data: {
          usuarioId: usuario.id,
          correo,
          tipo: 'LOGIN',
          exitoso: false,
          ip: ip || null,
          userAgent: userAgent || null,
          motivoFallo: 'Usuario inactivo o suspendido',
        },
      });

      // Registrar en auditoría
      await prisma.auditoria.create({
        data: {
          accion: TipoAuditoria.LOGIN_FALLO,
          entidad: 'login',
          detalles: `Intento de login fallido. Usuario inactivo: ${correo}`,
          adminId: usuario.id,
          adminNombre: usuario.nombreCompleto,
          ip: ip || null,
          userAgent: userAgent || null,
        },
      });

      return {
        success: false,
        message: 'Credenciales inválidas',
      };
    }

    if (usuario.rol !== Rol.ADMIN_CONSULTORIO) {
      await prisma.intentoLogin.create({
        data: {
          usuarioId: usuario.id,
          correo,
          tipo: 'LOGIN',
          exitoso: false,
          ip: ip || null,
          userAgent: userAgent || null,
          motivoFallo: 'Usuario no tiene rol de administrador',
        },
      });

      // Registrar en auditoría
      await prisma.auditoria.create({
        data: {
          accion: TipoAuditoria.LOGIN_FALLO,
          entidad: 'login',
          detalles: `Intento de login fallido. Usuario sin rol de admin: ${correo}`,
          adminId: usuario.id,
          adminNombre: usuario.nombreCompleto,
          ip: ip || null,
          userAgent: userAgent || null,
        },
      });

      return {
        success: false,
        message: 'Credenciales inválidas',
      };
    }

    const passwordValida = await comparePassword(password, usuario.passwordHash);

    if (!passwordValida) {
      await prisma.intentoLogin.create({
        data: {
          usuarioId: usuario.id,
          correo,
          tipo: 'LOGIN',
          exitoso: false,
          ip: ip || null,
          userAgent: userAgent || null,
          motivoFallo: 'Contraseña incorrecta',
        },
      });

      // Registrar en auditoría
      await prisma.auditoria.create({
        data: {
          accion: TipoAuditoria.LOGIN_FALLO,
          entidad: 'login',
          detalles: `Intento de login fallido. Contraseña incorrecta para usuario: ${correo}`,
          adminId: usuario.id,
          adminNombre: usuario.nombreCompleto,
          ip: ip || null,
          userAgent: userAgent || null,
        },
      });

      return {
        success: false,
        message: 'Credenciales inválidas',
      };
    }

    await prisma.intentoLogin.create({
      data: {
        usuarioId: usuario.id,
        correo,
        tipo: 'LOGIN',
        exitoso: true,
        ip: ip || null,
        userAgent: userAgent || null,
      },
    });

    // Registrar en auditoría
    await prisma.auditoria.create({
      data: {
        accion: TipoAuditoria.LOGIN_EXITO,
        entidad: 'login',
        detalles: `Login exitoso desde ${ip || 'IP desconocida'}`,
        adminId: usuario.id,
        adminNombre: usuario.nombreCompleto,
        ip: ip || null,
        userAgent: userAgent || null,
      },
    });

    // La sesión dura 24 horas pero el middleware controla la inactividad (20 min)
    const expiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000 // 24 horas
    );

    const sesion = await prisma.sesion.create({
      data: {
        usuarioId: usuario.id,
        token: generateSessionToken(),
        ip: ip || null,
        userAgent: userAgent || null,
        expiresAt,
      },
    });

    const tokenPayload = {
      userId: usuario.id,
      email: usuario.correo,
      role: usuario.rol,
      sessionId: sesion.id,
    };

    const token = generateToken(tokenPayload);

    await prisma.sesion.update({
      where: { id: sesion.id },
      data: { token },
    });

    return {
      success: true,
      message: 'Login exitoso',
      requiresPasswordChange: usuario.primerIngreso,
      token,
      user: {
        id: usuario.id,
        nombreCompleto: usuario.nombreCompleto,
        correo: usuario.correo,
        rol: usuario.rol,
        primerIngreso: usuario.primerIngreso,
      },
    };
  },

  async changePassword(
    userId: string,
    data: ChangePasswordDto,
    ip?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    const { passwordActual, nuevaPassword } = data;

    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!usuario) {
      return {
        success: false,
        message: 'Usuario no encontrado',
      };
    }

    const passwordValida = await comparePassword(passwordActual, usuario.passwordHash);

    if (!passwordValida) {
      await prisma.intentoLogin.create({
        data: {
          usuarioId: usuario.id,
          correo: usuario.correo,
          tipo: 'CAMBIO_PASSWORD',
          exitoso: false,
          ip: ip || null,
          userAgent: userAgent || null,
          motivoFallo: 'Contraseña actual incorrecta',
        },
      });

      return {
        success: false,
        message: 'La contraseña actual es incorrecta',
      };
    }

    const validacion = validatePasswordPolicy(nuevaPassword);

    if (!validacion.valid) {
      return {
        success: false,
        message: validacion.errors.join('. '),
      };
    }

    const nuevoHash = await hashPassword(nuevaPassword);

    await prisma.usuario.update({
      where: { id: userId },
      data: {
        passwordHash: nuevoHash,
        primerIngreso: false,
      },
    });

    await prisma.intentoLogin.create({
      data: {
        usuarioId: usuario.id,
        correo: usuario.correo,
        tipo: 'CAMBIO_PASSWORD',
        exitoso: true,
        ip: ip || null,
        userAgent: userAgent || null,
      },
    });

    await prisma.sesion.updateMany({
      where: {
        usuarioId: usuario.id,
        activa: true,
      },
      data: {
        ultimoAcceso: new Date(),
      },
    });

    return {
      success: true,
      message: 'Contraseña cambiada exitosamente',
    };
  },

  async verifySession(token: string): Promise<AuthResult> {
    const sesion = await prisma.sesion.findFirst({
      where: {
        token,
        activa: true,
        expiresAt: { gt: new Date() },
      },
      include: {
        usuario: true,
      },
    });

    if (!sesion) {
      return {
        success: false,
        message: 'Sesión inválida o expirada',
      };
    }

    await prisma.sesion.update({
      where: { id: sesion.id },
      data: { ultimoAcceso: new Date() },
    });

    return {
      success: true,
      message: 'Sesión válida',
      user: {
        id: sesion.usuario.id,
        nombreCompleto: sesion.usuario.nombreCompleto,
        correo: sesion.usuario.correo,
        rol: sesion.usuario.rol,
        primerIngreso: sesion.usuario.primerIngreso,
      },
    };
  },

  async logout(token: string): Promise<AuthResult> {
    const sesion = await prisma.sesion.findFirst({
      where: { token },
    });

    if (sesion) {
      await prisma.sesion.update({
        where: { id: sesion.id },
        data: { activa: false },
      });
    }

    return {
      success: true,
      message: 'Sesión cerrada exitosamente',
    };
  },

  async getLoginAttempts(correo: string): Promise<number> {
    const ventanaTiempo = new Date(
      Date.now() - config.security.loginAttemptWindowMinutes * 60 * 1000
    );

    return prisma.intentoLogin.count({
      where: {
        correo,
        exitoso: false,
        creadoEn: { gte: ventanaTiempo },
      },
    });
  },
};
