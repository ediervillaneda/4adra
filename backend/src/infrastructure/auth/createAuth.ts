import { betterAuth } from 'better-auth';
import { v7 as uuidv7 } from 'uuid';

export interface AuthConfig {
  database: D1Database;
  secret: string;
  baseURL: string;
  google?: { clientId: string; clientSecret: string };
  /** Solo para pruebas de integración: producción usa únicamente Google (ADR-016). */
  emailAndPasswordEnabled?: boolean;
}

/**
 * Configura Better Auth sobre D1 (dialecto D1 nativo de la librería). Identidad, sesiones y
 * cuentas viven en las tablas `user`, `session`, `account` y `verification` (0001_init.sql).
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- el tipo de Better Auth depende de las opciones y debe inferirse.
export function createAuth(config: AuthConfig) {
  return betterAuth({
    database: config.database,
    basePath: '/api/auth',
    secret: config.secret,
    baseURL: config.baseURL,
    emailAndPassword: { enabled: config.emailAndPasswordEnabled ?? false },
    ...(config.google ? { socialProviders: { google: config.google } } : {}),
    advanced: {
      database: { generateId: () => uuidv7() },
      useSecureCookies: config.baseURL.startsWith('https://'),
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
