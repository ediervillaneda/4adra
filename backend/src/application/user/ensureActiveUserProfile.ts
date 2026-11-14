import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { User } from '../../domain/user/User';
import { UserRepository } from '../../domain/user/UserRepository';
import { createUserFromActor } from './createUserFromActor';

/**
 * El perfil del actor, creado y guardado a partir de la sesión si es su primer acceso.
 * Lanza `UserDisabledException` si la cuenta está deshabilitada.
 */
export async function ensureActiveUserProfile(
  userRepository: UserRepository,
  actor: AuthenticatedActor,
  now: Date,
): Promise<User> {
  const existing = await userRepository.findById(actor.userId);
  if (existing === null) {
    const created = createUserFromActor(actor, now);
    await userRepository.save(created);
    return created;
  }
  existing.assertActive();
  return existing;
}
