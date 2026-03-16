import { ChangePasswordDto } from '../dto/change-password.dto';
import { LoginDto } from '../dto/login.dto';
import { config } from '../config/config';
import prisma from '../config/prisma';
import { comparePassword, hashPassword, validatePasswordPolicy } from '../utils/password.utils';
import { generateSessionToken, generateToken, verifyToken } from '../utils/jwt.utils';
import sicopAuthClient from '../integrations/sicop/sicop-auth.client';
import { mapSicopAuthUserToSofiaAuthUser } from '../integrations/sicop/sicop-mappers';
import { SicopIntegrationError } from '../integrations/sicop/sicop.types';
import { EstadoUsuario, Rol } from '@prisma/client';
import { incrementCounter } from '../observability/metrics';

export interface AuthResult {
  success: boolean;
  message: string;
  requiresPasswordChange?: boolean;
  token?: string;
  user?: {
    id: string;
    nombreCompleto: string;
    correo: string;
    rol: string;
    primerIngreso: boolean;
  };
}

function buildAuthErrorMessage(error: SicopIntegrationError): string {
  if (error.statusCode === 401 || error.statusCode === 403) {
    return 'Credenciales inválidas';
  }
  if (error.statusCode === 408 || error.code === 'SICOP_NETWORK_ERROR') {
    return 'No fue posible conectar con SICOP';
  }
  return 'No fue posible autenticar con SICOP';
}

function normalizeEmail(correo: string): string {
  return String(correo || '').trim().toLowerCase();
}

function canUseLocalFallback(): boolean {
  return config.featureFlags.authLocalFallbackEnabled;
}

function canAcceptLocalToken(): boolean {
  return config.featureFlags.authLocalTokenAcceptEnabled;
}

function isLocalToken(token: string): boolean {
  if (!canAcceptLocalToken()) return false;
  const payload = verifyToken(token);
  return Boolean(payload?.sessionId);
}

function mapLocalUserToAuthUser(usuario: {
  id: string;
  nombreCompleto: string;
  correo: string;
  rol: string;
  primerIngreso: boolean;
}): AuthResult['user'] {
  return {
    id: usuario.id,
    nombreCompleto: usuario.nombreCompleto,
    correo: usuario.correo,
    rol: usuario.rol,
    primerIngreso: usuario.primerIngreso,
  };
}

async function loginLocal(data: LoginDto): Promise<AuthResult> {
  const correo = normalizeEmail(data.correo);

  const usuario = await prisma.usuario.findFirst({
    where: {
      correo: {
        equals: correo,
        mode: 'insensitive',
      },
    },
  });

  if (!usuario) {
    return {
      success: false,
      message: 'Credenciales inválidas',
    };
  }

  if (usuario.estado !== EstadoUsuario.ACTIVO || usuario.rol !== Rol.ADMIN_CONSULTORIO) {
    return {
      success: false,
      message: 'Credenciales inválidas',
    };
  }

  const passwordValida = await comparePassword(data.password, usuario.passwordHash);
  if (!passwordValida) {
    return {
      success: false,
      message: 'Credenciales inválidas',
    };
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const sesion = await prisma.sesion.create({
    data: {
      usuarioId: usuario.id,
      token: generateSessionToken(),
      expiresAt,
    },
  });

  const token = generateToken({
    userId: usuario.id,
    email: usuario.correo,
    role: usuario.rol,
    sessionId: sesion.id,
  });

  await prisma.sesion.update({
    where: { id: sesion.id },
    data: { token },
  });

  return {
    success: true,
    message: 'Login exitoso',
    requiresPasswordChange: usuario.primerIngreso,
    token,
    user: mapLocalUserToAuthUser(usuario),
  };
}

async function meLocal(token: string): Promise<AuthResult> {
  const payload = verifyToken(token);
  if (!payload?.sessionId) {
    return {
      success: false,
      message: 'Token inválido o expirado',
    };
  }

  const sesion = await prisma.sesion.findFirst({
    where: {
      id: payload.sessionId,
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
    user: mapLocalUserToAuthUser(sesion.usuario),
  };
}

async function changePasswordLocal(token: string, data: ChangePasswordDto): Promise<AuthResult> {
  const payload = verifyToken(token);
  if (!payload?.sessionId || !payload?.userId) {
    return {
      success: false,
      message: 'Token inválido o expirado',
    };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.userId },
  });

  if (!usuario) {
    return {
      success: false,
      message: 'Usuario no encontrado',
    };
  }

  const passwordValida = await comparePassword(data.passwordActual, usuario.passwordHash);
  if (!passwordValida) {
    return {
      success: false,
      message: 'La contraseña actual es incorrecta',
    };
  }

  const validacion = validatePasswordPolicy(data.nuevaPassword);
  if (!validacion.valid) {
    return {
      success: false,
      message: validacion.errors.join('. '),
    };
  }

  const nuevoHash = await hashPassword(data.nuevaPassword);
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      passwordHash: nuevoHash,
      primerIngreso: false,
    },
  });

  return {
    success: true,
    message: 'Contraseña cambiada exitosamente',
  };
}

async function logoutLocal(token: string): Promise<void> {
  const sesion = await prisma.sesion.findFirst({
    where: { token, activa: true },
  });

  if (!sesion) return;

  await prisma.sesion.update({
    where: { id: sesion.id },
    data: { activa: false },
  });
}

export const authService = {
  async login(data: LoginDto): Promise<AuthResult> {
    const correo = normalizeEmail(data.correo);

    try {
      const loginResponse = await sicopAuthClient.loginUser(correo, data.password);
      if (!loginResponse.data?.token) {
        return {
          success: false,
          message: 'Respuesta inválida del servicio de autenticación',
        };
      }

      const rawUser = loginResponse.data.user || await sicopAuthClient.getMe(loginResponse.data.token);
      const user = mapSicopAuthUserToSofiaAuthUser(rawUser);

      return {
        success: true,
        message: 'Login exitoso',
        requiresPasswordChange: user.primerIngreso,
        token: loginResponse.data.token,
        user,
      };
    } catch (error) {
      if (error instanceof SicopIntegrationError) {
        if (canUseLocalFallback()) {
          incrementCounter('auth_fallback_local_attempt_total', 1, {
            origin: 'sicop_integration_error',
          });

          const localResult = await loginLocal(data);
          if (localResult.success) {
            incrementCounter('auth_fallback_local_success_total', 1, {
              origin: 'sicop_integration_error',
            });
            return localResult;
          }
        }

        return {
          success: false,
          message: buildAuthErrorMessage(error),
        };
      }

      if (canUseLocalFallback()) {
        incrementCounter('auth_fallback_local_attempt_total', 1, {
          origin: 'unexpected_error',
        });

        const localResult = await loginLocal(data);
        if (localResult.success) {
          incrementCounter('auth_fallback_local_success_total', 1, {
            origin: 'unexpected_error',
          });
          return localResult;
        }
      }

      return {
        success: false,
        message: 'Error interno del proceso de autenticación',
      };
    }
  },

  async me(token: string): Promise<AuthResult> {
    if (isLocalToken(token)) {
      incrementCounter('auth_local_token_verify_total');
      return meLocal(token);
    }

    try {
      const rawUser = await sicopAuthClient.getMe(token);
      const user = mapSicopAuthUserToSofiaAuthUser(rawUser);

      return {
        success: true,
        message: 'Sesión válida',
        user,
      };
    } catch (error) {
      if (error instanceof SicopIntegrationError && (error.statusCode === 401 || error.statusCode === 403)) {
        return {
          success: false,
          message: 'Token inválido o expirado',
        };
      }

      if (isLocalToken(token)) {
        incrementCounter('auth_local_token_verify_total', 1, { origin: 'sicop_me_fallback' });
        return meLocal(token);
      }

      return {
        success: false,
        message: 'No fue posible validar la sesión con SICOP',
      };
    }
  },

  async changePassword(token: string, data: ChangePasswordDto): Promise<AuthResult> {
    if (isLocalToken(token)) {
      incrementCounter('auth_local_token_verify_total', 1, { origin: 'change_password' });
      return changePasswordLocal(token, data);
    }

    try {
      await sicopAuthClient.requestWithUserToken(token, '/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: data.passwordActual,
          newPassword: data.nuevaPassword,
          passwordActual: data.passwordActual,
          nuevaPassword: data.nuevaPassword,
        }),
      });

      return {
        success: true,
        message: 'Contraseña cambiada exitosamente',
      };
    } catch (error) {
      if (error instanceof SicopIntegrationError) {
        return {
          success: false,
          message: error.statusCode === 404
            ? 'El cambio de contraseña no está disponible en SICOP'
            : 'No fue posible cambiar la contraseña',
        };
      }

      return {
        success: false,
        message: 'Error interno al cambiar contraseña',
      };
    }
  },

  async verifySession(token: string): Promise<AuthResult> {
    return this.me(token);
  },

  async logout(token: string): Promise<AuthResult> {
    if (isLocalToken(token)) {
      incrementCounter('auth_local_token_verify_total', 1, { origin: 'logout' });
      await logoutLocal(token);
      return {
        success: true,
        message: 'Sesión cerrada exitosamente',
      };
    }

    try {
      await sicopAuthClient.requestWithUserToken(token, '/auth/logout', {
        method: 'POST',
      });
    } catch {
      // El logout remoto no debe bloquear cierre de sesión local del frontend.
    }

    return {
      success: true,
      message: 'Sesión cerrada exitosamente',
    };
  },
};

export default authService;
