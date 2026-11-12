import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { v7 as uuidv7 } from 'uuid';

const MIN_SECRET_LENGTH = 32;

interface AuthConfig {
  database: D1Database;
  secret: string;
  baseURL: string;
  google?: { clientId: string; clientSecret: string };
  /** Solo para pruebas de integración: producción usa únicamente Google (ADR-016). */
  emailAndPasswordEnabled?: boolean;
  /**
   * Filtro de registro (ADR-018): si se define, solo se crean cuentas cuyo correo devuelva true.
   * No afecta a usuarios que ya existen.
   */
  isSignUpAllowed?: (email: string) => Promise<boolean>;
  /** Orígenes extra aceptados además de baseURL (solo desarrollo, ver parseTrustedOrigins). */
  trustedOrigins?: string[];
}

/**
 * Configura Better Auth sobre D1 (dialecto D1 nativo de la librería). Identidad, sesiones y
 * cuentas viven en las tablas `user`, `session`, `account` y `verification` (0001_init.sql).
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- el tipo de Better Auth depende de las opciones y debe inferirse.
export function createAuth(config: AuthConfig) {
  // Sin secreto propio Better Auth caería en uno por defecto público y las cookies serían falsificables.
  if (config.secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `BETTER_AUTH_SECRET falta o tiene menos de ${MIN_SECRET_LENGTH} caracteres (ver docs/Deployment.md).`,
    );
  }

  return betterAuth({
    database: config.database,
    basePath: '/api/auth',
    secret: config.secret,
    baseURL: config.baseURL,
    trustedOrigins: config.trustedOrigins ?? [],
    emailAndPassword: { enabled: config.emailAndPasswordEnabled ?? false },
    // Los tokens de Google se cifran en D1 (XChaCha20-Poly1305 con BETTER_AUTH_SECRET).
    account: { encryptOAuthTokens: true },
    ...(config.google ? { socialProviders: { google: config.google } } : {}),
    ...(config.isSignUpAllowed ? { databaseHooks: signUpGate(config.isSignUpAllowed) } : {}),
    advanced: {
      database: { generateId: () => uuidv7() },
      useSecureCookies: config.baseURL.startsWith('https://'),
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

interface SignUpGateHooks {
  user: { create: { before: (user: { email: string }) => Promise<void> } };
}

function signUpGate(isSignUpAllowed: (email: string) => Promise<boolean>): SignUpGateHooks {
  return {
    user: {
      create: {
        before: async (user: { email: string }): Promise<void> => {
          if (!(await isSignUpAllowed(user.email))) {
            // En el login con Google, Better Auth redirige a /api/auth/error?error=NOT_INVITED.
            throw new APIError('FORBIDDEN', {
              code: 'NOT_INVITED',
              message: 'Este correo no tiene invitación para usar 4adra.',
            });
          }
        },
      },
    },
  };
}
