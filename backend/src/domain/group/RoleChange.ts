import { ValidationException } from '../errors/ValidationException';
import { MemberRole, isMemberRole } from './MemberRole';

/** Valida el cuerpo de un cambio de rol (docs/api/Members.md) y devuelve el rol, o lanza ValidationException. */
export function validateRoleChange(input: unknown): MemberRole {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ValidationException([{ field: 'body', reason: 'must_be_object' }]);
  }
  const role = (input as Record<string, unknown>).role;
  if (!isMemberRole(role)) {
    throw new ValidationException([{ field: 'role', reason: 'unsupported_role' }]);
  }
  return role;
}
