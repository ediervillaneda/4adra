import { AuthenticationProvider } from '../../domain/auth/AuthenticationProvider';
import { SessionCredential } from '../../domain/auth/SessionCredential';
import { SessionResolution } from '../../domain/auth/SessionResolution';
import { UnauthenticatedException } from '../../domain/auth/errors';
import { UserId } from '../../domain/user/UserId';
import { Email } from '../../domain/user/Email';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image?: string | null | undefined;
}

export interface SessionLookupResult {
  session: { user: SessionUser } | null;
  /** `Set-Cookie` emitidos por Better Auth al extender la sesión (puede venir vacío). */
  setCookies: string[];
}

export type SessionLookup = (headers: Headers) => Promise<SessionLookupResult>;

function blankToNull(value: string | null | undefined): string | null {
  return value === null || value === undefined || value.trim().length === 0 ? null : value;
}

export class BetterAuthAuthenticationProvider implements AuthenticationProvider {
  constructor(private readonly lookupSession: SessionLookup) {}

  async resolveSession(credential: SessionCredential): Promise<SessionResolution> {
    if (credential.isEmpty()) {
      throw new UnauthenticatedException('falta la cookie de sesión.');
    }

    // Cookie ausente, falsificada o vencida → Better Auth devuelve null (401).
    // Un fallo de D1/Better Auth se propaga: es un 500 con requestId, no "sin sesión".
    const { session, setCookies } = await this.lookupSession(
      new Headers({ cookie: credential.toString() }),
    );

    if (session === null) {
      throw new UnauthenticatedException('sesión inválida o expirada.');
    }

    return {
      actor: {
        userId: UserId.fromString(session.user.id),
        email: Email.fromString(session.user.email),
        displayName: blankToNull(session.user.name),
        photoUrl: blankToNull(session.user.image),
      },
      renewedCredentials: setCookies,
    };
  }
}
