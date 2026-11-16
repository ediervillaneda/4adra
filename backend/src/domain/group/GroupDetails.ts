import { ValidationIssue } from '../errors/ValidationException';

const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 500;

/** Nombre y descripción normalizados de un grupo, los que se eligen al crearlo y se pueden editar. */
export interface GroupDetails {
  name: string;
  description: string | null;
}

/**
 * Valida nombre y descripción de un cuerpo ya comprobado como objeto (mismas reglas al crear y al
 * editar, docs/api/Groups.md): agrega los problemas a `issues` y devuelve los valores normalizados.
 */
export function validateGroupDetails(
  body: Record<string, unknown>,
  issues: ValidationIssue[],
): GroupDetails {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    issues.push({ field: 'name', reason: 'length_1_to_120' });
  }

  let description = '';
  if (typeof body.description === 'string') {
    description = body.description.trim();
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      issues.push({ field: 'description', reason: 'max_length_500' });
    }
  } else if (body.description !== undefined && body.description !== null) {
    issues.push({ field: 'description', reason: 'must_be_string' });
  }

  return { name, description: description.length === 0 ? null : description };
}
