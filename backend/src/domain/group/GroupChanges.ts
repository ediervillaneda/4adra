import { ValidationException, ValidationIssue } from '../errors/ValidationException';
import { GroupDetails, validateGroupDetails } from './GroupDetails';

/** Lo único que se puede editar de un grupo; la moneda base queda fija desde que se crea. */
const EDITABLE_FIELDS: readonly string[] = ['name', 'description'];

/**
 * Valida una edición no confiable de un grupo (docs/api/Groups.md): las mismas reglas que al crearlo,
 * con `description` obligatoria (vaciarla es explícito) y ningún otro campo.
 */
export function validateGroupChanges(input: unknown): GroupDetails {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ValidationException([{ field: 'body', reason: 'must_be_object' }]);
  }
  const body = input as Record<string, unknown>;
  const issues: ValidationIssue[] = [];

  const details = validateGroupDetails(body, issues);
  if (!('description' in body)) {
    issues.push({ field: 'description', reason: 'required' });
  }
  for (const field of Object.keys(body)) {
    if (!EDITABLE_FIELDS.includes(field)) {
      issues.push({ field, reason: 'not_allowed' });
    }
  }

  if (issues.length > 0) {
    throw new ValidationException(issues);
  }
  return details;
}
