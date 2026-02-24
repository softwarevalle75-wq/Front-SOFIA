import jwt from 'jsonwebtoken';
import { config } from '../config/config';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  } catch {
    return null;
  }
};

export const generateSessionToken = (): string => {
  return jwt.sign(
    { random: Math.random().toString(36) },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
  );
};
