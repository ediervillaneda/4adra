import { ValidationException, ValidationIssue } from '../errors/ValidationException';

export const SUPPORTED_CURRENCIES = ['COP', 'USD', 'EUR', 'MXN', 'GTQ'] as const;
export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;

const ALLOWED_FIELDS = new Set([
  'displayName',
  'photoUrl',
  'preferredCurrency',
  'language',
  'timeZone',
]);
const MAX_DISPLAY_NAME_LENGTH = 100;

/** Campos del perfil que el propio usuario puede cambiar (docs/api/Auth.md). */
export interface ProfileChanges {
  displayName?: string;
  photoUrl?: string | null;
  preferredCurrency?: string;
  language?: string;
  timeZone?: string;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Valida una carga no confiable y devuelve los cambios normalizados, o lanza ValidationException. */
export function validateProfileChanges(input: unknown): ProfileChanges {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ValidationException([{ field: 'body', reason: 'must_be_object' }]);
  }
  const body = input as Record<string, unknown>;
  const issues: ValidationIssue[] = Object.keys(body)
    .filter((field) => !ALLOWED_FIELDS.has(field))
    .map((field) => ({ field, reason: 'not_allowed' }));
  const changes: ProfileChanges = {};

  if ('displayName' in body) {
    const value = body.displayName;
    if (typeof value !== 'string') {
      issues.push({ field: 'displayName', reason: 'must_be_string' });
    } else if (value.trim().length === 0 || value.trim().length > MAX_DISPLAY_NAME_LENGTH) {
      issues.push({ field: 'displayName', reason: 'length_1_to_100' });
    } else {
      changes.displayName = value.trim();
    }
  }
  if ('photoUrl' in body) {
    const value = body.photoUrl;
    if (value === null) {
      changes.photoUrl = null;
    } else if (typeof value === 'string' && isHttpsUrl(value)) {
      changes.photoUrl = value;
    } else {
      issues.push({ field: 'photoUrl', reason: 'must_be_https_url' });
    }
  }
  if ('preferredCurrency' in body) {
    const value = body.preferredCurrency;
    if (typeof value === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(value)) {
      changes.preferredCurrency = value;
    } else {
      issues.push({ field: 'preferredCurrency', reason: 'unsupported_currency' });
    }
  }
  if ('language' in body) {
    const value = body.language;
    if (typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)) {
      changes.language = value;
    } else {
      issues.push({ field: 'language', reason: 'unsupported_language' });
    }
  }
  if ('timeZone' in body) {
    const value = body.timeZone;
    if (typeof value === 'string' && isValidTimeZone(value)) {
      changes.timeZone = value;
    } else {
      issues.push({ field: 'timeZone', reason: 'invalid_time_zone' });
    }
  }

  if (issues.length > 0) {
    throw new ValidationException(issues);
  }
  return changes;
}
