import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { User } from '../../domain/user/User';
import { DEFAULT_PROFILE_SETTINGS } from './defaultProfileSettings';

/** Perfil inicial a partir de la identidad autenticada (primer acceso). */
export function createUserFromActor(actor: AuthenticatedActor, now: Date): User {
  return User.create({
    id: actor.userId,
    displayName: actor.displayName ?? actor.email.toString(),
    email: actor.email,
    photoUrl: actor.photoUrl,
    preferredCurrency: DEFAULT_PROFILE_SETTINGS.preferredCurrency,
    language: DEFAULT_PROFILE_SETTINGS.language,
    timeZone: DEFAULT_PROFILE_SETTINGS.timeZone,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  });
}
