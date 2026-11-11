import { AuthenticationProvider } from '../../domain/auth/AuthenticationProvider';
import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { SessionCredential } from '../../domain/auth/SessionCredential';
import { UnauthenticatedException } from '../../domain/auth/errors';
import { UserId } from '../../domain/user/UserId';
import { Email } from '../../domain/user/Email';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image?: string | null | undefined;
}

export type SessionLookup = (headers: Headers) => Promise<{ user: SessionUser } | null>;

function blankToNull(value: string | null | undefined): string | null {
  return value === null || value === undefined || value.trim().length === 0 ? null : value;
}

export class BetterAuthAuthenticationProvider implements AuthenticationProvider {
  constructor(private readonly lookupSession: SessionLookup) {}

  async resolveSession(credential: SessionCredential): Promise<AuthenticatedActor> {
    if (credential.isEmpty()) {
      throw new UnauthenticatedException('falta la cookie de sesión.');
    }

    let session: { user: SessionUser } | null;
    try {
      session = await this.lookupSession(new Headers({ cookie: credential.toString() }));
    } catch {
      throw new UnauthenticatedException('no se pudo validar la sesión.');
    }

    if (session === null) {
      throw new UnauthenticatedException('sesión inválida o expirada.');
    }

    return {
      userId: UserId.fromString(session.user.id),
      email: Email.fromString(session.user.email),
      displayName: blankToNull(session.user.name),
      photoUrl: blankToNull(session.user.image),
    };
  }
}
