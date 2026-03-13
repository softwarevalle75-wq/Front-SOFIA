import { config } from '../config/config';

export type SourceMode = 'prisma' | 'sicop' | 'dual';

export type ProviderModule =
  | 'stats'
  | 'notifications'
  | 'history'
  | 'conversations'
  | 'surveys'
  | 'webhookConfig';

export function getModuleSourceMode(moduleName: ProviderModule): SourceMode {
  return config.featureFlags.moduleSourceMode[moduleName];
}

export function isDualReadMode(moduleName: ProviderModule): boolean {
  return getModuleSourceMode(moduleName) === 'dual';
}

export function isPrismaMode(moduleName: ProviderModule): boolean {
  return getModuleSourceMode(moduleName) === 'prisma';
}

export function isSicopMode(moduleName: ProviderModule): boolean {
  return getModuleSourceMode(moduleName) === 'sicop';
}

export function isLocalWriteEnabled(
  moduleName: 'notifications' | 'history' | 'conversations' | 'surveys' | 'webhookConfig',
): boolean {
  return config.featureFlags.writeLocal[moduleName];
}
