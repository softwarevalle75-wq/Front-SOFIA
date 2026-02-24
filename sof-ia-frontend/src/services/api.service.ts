import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { API_CONFIG, DEFAULT_HEADERS } from '@/config/api.config';

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args: any[]) => {
  if (args[0]?.includes?.('Axios') || args[0]?.includes?.('Network Error') || args[0]?.includes?.('timeout')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

console.warn = (...args: any[]) => {
  if (args[0]?.includes?.('Axios')) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: DEFAULT_HEADERS,
  validateStatus: () => {
    // Aceptar todos los códigos de estado para manejarlos manualmente
    // Esto evita que el navegador muestre errores en consola
    return true;
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    const data = response.data as { success?: boolean; message?: string } | undefined;
    const requestUrl = String(response.config?.url || '');
    const isLoginRequest = requestUrl.includes(API_CONFIG.ENDPOINTS.AUTH.LOGIN);
    const hasToken = Boolean(localStorage.getItem('token'));

    // Cuando validateStatus=true, axios no lanza error en 401/403.
    // Si el backend responde success=false por token/sesion invalida, forzar logout.
    const message = (data?.message || '').toLowerCase();
    const authFailure = data?.success === false && (
      message.includes('token')
      || message.includes('sesion')
      || message.includes('sesión')
      || message.includes('expirad')
      || message.includes('autenticación')
      || message.includes('autenticacion')
    );

    if ((authFailure || response.status === 401 || response.status === 403) && !isLoginRequest && hasToken) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(new Error('Sesión inválida o expirada'));
    }

    // Retornar solo los datos de la respuesta
    return response.data;
  },
  (error: AxiosError) => {
    const requestUrl = String(error.config?.url || '');
    const isLoginRequest = requestUrl.includes(API_CONFIG.ENDPOINTS.AUTH.LOGIN);
    const hasToken = Boolean(localStorage.getItem('token'));

    if (error.response?.status === 401 && !isLoginRequest && hasToken) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

class ApiService {
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const config: AxiosRequestConfig = { params };
    return await apiClient.get(endpoint, config);
  }

  async post<T>(endpoint: string, data?: Record<string, any>): Promise<T> {
    return await apiClient.post(endpoint, data);
  }

  async put<T>(endpoint: string, data?: Record<string, any>): Promise<T> {
    return await apiClient.put(endpoint, data);
  }

  async patch<T>(endpoint: string, data?: Record<string, any>): Promise<T> {
    return await apiClient.patch(endpoint, data);
  }

  async delete<T>(endpoint: string, options?: Record<string, any>): Promise<T> {
    return await apiClient.delete(endpoint, options);
  }
}

export const apiService = new ApiService();

// Exportar también el cliente de axios por si se necesita acceso directo
export { apiClient };
