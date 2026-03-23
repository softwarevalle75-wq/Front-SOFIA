import { ChangePasswordDto } from '../dto/change-password.dto';
import { LoginDto } from '../dto/login.dto';
import sicopAuthClient from '../integrations/sicop/sicop-auth.client';
import { mapSicopAuthUserToSofiaAuthUser } from '../integrations/sicop/sicop-mappers';
import { SicopIntegrationError } from '../integrations/sicop/sicop.types';

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
  if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 423) {
    return 'Credenciales inválidas';
  }
  if (error.statusCode === 408 || error.code === 'SICOP_NETWORK_ERROR') {
    return 'Credenciales inválidas';
  }
  return 'Credenciales inválidas';
}

function normalizeEmail(correo: string): string {
  return String(correo || '').trim().toLowerCase();
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
        return {
          success: false,
          message: buildAuthErrorMessage(error),
        };
      }

      return {
        success: false,
        message: 'Error interno del proceso de autenticación',
      };
    }
  },

  async me(token: string): Promise<AuthResult> {
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

      return {
        success: false,
        message: 'No fue posible validar la sesión con SICOP',
      };
    }
  },

  async changePassword(token: string, data: ChangePasswordDto): Promise<AuthResult> {
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
