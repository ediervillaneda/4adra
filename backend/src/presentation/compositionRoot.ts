import { Hono } from 'hono';
import { v7 as uuidv7 } from 'uuid';
import { createApp } from './http/createApp';
import { AppEnv } from './http/AppEnv';
import { createAuth } from '../infrastructure/auth/createAuth';
import { BetterAuthAuthenticationProvider } from '../infrastructure/auth/BetterAuthAuthenticationProvider';
import { D1UserRepository } from '../infrastructure/d1/D1UserRepository';
import { D1AuditLogWriter } from '../infrastructure/d1/D1AuditLogWriter';
import { D1AllowedEmailRepository } from '../infrastructure/d1/D1AllowedEmailRepository';
import { Email } from '../domain/user/Email';
import { GetCurrentUserProfileUseCase } from '../application/user/GetCurrentUserProfileUseCase';

/** Único lugar que instancia dependencias concretas a partir de los bindings del Worker. */
export function composeApp(env: Env): Hono<AppEnv> {
  const allowedEmails = new D1AllowedEmailRepository(env.DB);
  const auth = createAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
    isSignUpAllowed: (email) => allowedEmails.isAllowed(Email.fromString(email)),
  });

  return createApp({
    authenticationProvider: new BetterAuthAuthenticationProvider((headers) =>
      auth.api.getSession({ headers }),
    ),
    auditLogWriter: new D1AuditLogWriter(env.DB, () => uuidv7()),
    getCurrentUserProfileUseCase: new GetCurrentUserProfileUseCase(
      new D1UserRepository(env.DB),
      () => new Date(),
    ),
    authHandler: (request) => auth.handler(request),
    generateRequestId: () => crypto.randomUUID(),
  });
}
