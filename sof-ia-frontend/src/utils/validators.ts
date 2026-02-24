/**
 * Utilidades para validación de datos
 */

/**
 * Validar email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validar documento (cédula colombiana)
 */
export const isValidDocument = (document: string): boolean => {
  const documentRegex = /^\d{7,10}$/;
  return documentRegex.test(document);
};

/**
 * Validar teléfono colombiano
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^3\d{9}$/;
  return phoneRegex.test(phone);
};

/**
 * Validar que un string no esté vacío
 */
export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Validar longitud mínima
 */
export const hasMinLength = (value: string, minLength: number): boolean => {
  return value.length >= minLength;
};