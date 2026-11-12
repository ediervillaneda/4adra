import { ValidationException, ValidationIssue } from '../errors/ValidationException';
import { isSupportedCurrency } from '../money/CurrencyCode';

const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 500;

/** Datos validados para crear un grupo (docs/api/Groups.md). */
export interface NewGroup {
  name: string;
  description: string | null;
  defaultCurrency: string;
}

/** Valida una carga no confiable y devuelve el grupo normalizado, o lanza ValidationException. */
export function validateNewGroup(input: unknown): NewGroup {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ValidationException([{ field: 'body', reason: 'must_be_object' }]);
  }
  const body = input as Record<string, unknown>;
  const issues: ValidationIssue[] = [];

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

  const defaultCurrency = body.defaultCurrency;
  if (!isSupportedCurrency(defaultCurrency)) {
    issues.push({ field: 'defaultCurrency', reason: 'unsupported_currency' });
  }

  if (issues.length > 0 || !isSupportedCurrency(defaultCurrency)) {
    throw new ValidationException(issues);
  }
  return {
    name,
    description: description.length === 0 ? null : description,
    defaultCurrency,
  };
}
