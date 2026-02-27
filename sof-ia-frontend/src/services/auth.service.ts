import { apiService } from './api.service';
import { API_CONFIG } from '@/config/api.config';
import { User, UserRole, UserStatus } from '@/types';

interface BackendLoginResponse {
  success: boolean;
  message: string;
  requiresPasswordChange?: boolean;
  token: string;
  user: {
    id: string;
    nombreCompleto: string;
    correo: string;
    rol: string;
    primerIngreso: boolean;
  };
}

interface LoginResponse {
  token: string;
  user: User;
  requiresPasswordChange?: boolean;
}

class AuthService {
  clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiService.post<BackendLoginResponse>(
      API_CONFIG.ENDPOINTS.AUTH.LOGIN,
      { correo: email, password }
    );

    if (!response.success) {
      throw new Error(response.message || 'Credenciales inválidas');
    }

    const user: User = {
      id: response.user.id,
      nombre: response.user.nombreCompleto,
      email: response.user.correo,
      documento: '',
      rol: this.mapRole(response.user.rol),
      estado: UserStatus.ACTIVO,
    };

    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(user));

    return {
      token: response.token,
      user,
      requiresPasswordChange: response.requiresPasswordChange,
    };
  }

  private mapRole(backendRole: string): UserRole {
    switch (backendRole) {
      case 'ADMIN_CONSULTORIO':
        return UserRole.ADMINISTRADOR;
      case 'ESTUDIANTE':
        return UserRole.ESTUDIANTE;
      default:
        return UserRole.ADMINISTRADOR;
    }
  }

  async logout(): Promise<void> {
    try {
      await apiService.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, {});
    } catch (error) {
      // Silencioso
    } finally {
      this.clearSession();
      window.location.href = '/login';
    }
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr) as User;
      } catch (error) {
        // Silencioso
        return null;
      }
    }
    return null;
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return !!token;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  async verifyToken(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await apiService.get<{ success?: boolean }>(
        API_CONFIG.ENDPOINTS.AUTH.VERIFY_SESSION,
      );
      const isValid = response?.success === true;
      if (!isValid) this.clearSession();
      return isValid;
    } catch (error) {
      this.clearSession();
      return false;
    }
  }
}

export const authService = new AuthService();
