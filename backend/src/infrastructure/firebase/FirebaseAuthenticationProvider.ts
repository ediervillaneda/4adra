import { Auth } from 'firebase-admin/auth';
import { AuthenticationProvider } from '../../domain/auth/AuthenticationProvider';
import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { UnauthenticatedException } from '../../domain/auth/errors';
import { UserId } from '../../domain/user/UserId';
import { Email } from '../../domain/user/Email';

export class FirebaseAuthenticationProvider implements AuthenticationProvider {
  constructor(private readonly auth: Auth) {}

  async verifyIdToken(idToken: string): Promise<AuthenticatedActor> {
    let decoded;
    try {
      decoded = await this.auth.verifyIdToken(idToken);
    } catch {
      throw new UnauthenticatedException('token inválido o expirado.');
    }

    if (!decoded.email) {
      throw new UnauthenticatedException('el token no contiene un correo verificado.');
    }

    return {
      userId: UserId.fromString(decoded.uid),
      email: Email.fromString(decoded.email),
      displayName: typeof decoded.name === 'string' ? decoded.name : null,
      photoUrl: typeof decoded.picture === 'string' ? decoded.picture : null,
    };
  }
}
