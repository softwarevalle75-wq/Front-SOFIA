export interface SicopLoginResponse {
  token: string;
  user?: SicopAuthUser;
}

export interface SicopAuthUser {
  id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  role?: string;
  primerIngreso?: boolean;
  firstLogin?: boolean;
  [key: string]: unknown;
}

export interface SicopMeResponse {
  user?: SicopAuthUser;
  data?: SicopAuthUser;
  [key: string]: unknown;
}

export interface SicopUser {
  id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  role?: string;
  area?: string | null;
  document?: string;
  documento?: string;
  phone?: string;
  telefono?: string;
  modality?: string;
  modalidad?: string;
  status?: string;
  estado?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface SicopUsersResponse {
  users?: SicopUser[];
  data?: SicopUser[];
  user?: SicopUser;
}

export interface SicopUserFilters {
  role?: string;
  sourceSystem?: string;
}

export interface SicopAppointment {
  [key: string]: unknown;
}

export interface SicopAppointmentsResponse {
  appointments?: SicopAppointment[];
  data?: SicopAppointment[];
  appointment?: SicopAppointment;
}

export interface SicopRequestOptions {
  retryAttempt?: number;
  reloginAttempted?: boolean;
}

export interface SicopHttpResponse<T> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

export interface SicopAppointmentFilters {
  limit?: number;
  offset?: number;
  estado?: string;
  modalidad?: string;
  sourceSystem?: string;
  origen?: string;
  from?: string;
  to?: string;
  updatedSince?: string;
}

export class SicopIntegrationError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 502,
    public readonly code = 'SICOP_INTEGRATION_ERROR',
  ) {
    super(message);
    this.name = 'SicopIntegrationError';
  }
}
