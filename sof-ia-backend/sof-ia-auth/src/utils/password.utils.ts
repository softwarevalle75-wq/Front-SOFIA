import bcrypt from 'bcryptjs';
import { config } from '../config/config';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const validatePasswordPolicy = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const { password: passwordConfig } = config.security;

  if (password.length < passwordConfig.minLength) {
    errors.push(`La contraseña debe tener al menos ${passwordConfig.minLength} caracteres`);
  }

  if (passwordConfig.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra mayúscula');
  }

  if (passwordConfig.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra minúscula');
  }

  if (passwordConfig.requireNumber && !/\d/.test(password)) {
    errors.push('La contraseña debe contener al menos un número');
  }

  if (passwordConfig.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('La contraseña debe contener al menos un carácter especial');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
