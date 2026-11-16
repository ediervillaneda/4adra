import { ValidationException, ValidationIssue } from '../errors/ValidationException';
import { isSupportedCurrency } from '../money/CurrencyCode';
import { validateGroupDetails } from './GroupDetails';

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

  const details = validateGroupDetails(body, issues);

  const defaultCurrency = body.defaultCurrency;
  if (!isSupportedCurrency(defaultCurrency)) {
    issues.push({ field: 'defaultCurrency', reason: 'unsupported_currency' });
  }

  if (issues.length > 0 || !isSupportedCurrency(defaultCurrency)) {
    throw new ValidationException(issues);
  }
  return { ...details, defaultCurrency };
}
