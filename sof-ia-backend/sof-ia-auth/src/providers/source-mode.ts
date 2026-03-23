import { config } from '../config/config';

export type SourceMode = 'sicop' | 'dual';

export type ProviderModule =
  | 'stats'
  | 'notifications'
  | 'history'
  | 'conversations'
  | 'surveys';

export function getModuleSourceMode(moduleName: ProviderModule): SourceMode {
  return config.featureFlags.moduleSourceMode[moduleName];
}

export function isDualReadMode(moduleName: ProviderModule): boolean {
  return getModuleSourceMode(moduleName) === 'dual';
}

export function isSicopMode(moduleName: ProviderModule): boolean {
  return getModuleSourceMode(moduleName) === 'sicop';
}

export function isLocalWriteEnabled(
  moduleName: 'notifications' | 'history' | 'conversations' | 'surveys',
): boolean {
  return config.featureFlags.writeLocal[moduleName];
}
