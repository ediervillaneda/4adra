import { ValidationException, ValidationIssue } from '../errors/ValidationException';
import { Email } from '../user/Email';
import { InvitableRole } from './Invitation';

const INVITABLE_ROLES: readonly string[] = ['ADMINISTRATOR', 'MEMBER', 'READ_ONLY'];

/** Datos validados para invitar a alguien a un grupo (docs/api/Members.md). */
export interface NewInvitation {
  email: Email;
  role: InvitableRole;
}

function isInvitableRole(value: unknown): value is InvitableRole {
  return typeof value === 'string' && INVITABLE_ROLES.includes(value);
}

function toEmail(value: unknown): Email | null {
  if (typeof value !== 'string') {
    return null;
  }
  try {
    return Email.fromString(value);
  } catch {
    return null;
  }
}

/** Valida una carga no confiable y devuelve correo normalizado y rol, o lanza ValidationException. */
export function validateNewInvitation(input: unknown): NewInvitation {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ValidationException([{ field: 'body', reason: 'must_be_object' }]);
  }
  const body = input as Record<string, unknown>;
  const issues: ValidationIssue[] = [];

  const email = toEmail(body.email);
  if (email === null) {
    issues.push({ field: 'email', reason: 'invalid_email' });
  }
  const role = body.role;
  if (!isInvitableRole(role)) {
    issues.push({ field: 'role', reason: 'unsupported_role' });
  }

  if (email === null || !isInvitableRole(role)) {
    throw new ValidationException(issues);
  }
  return { email, role };
}
