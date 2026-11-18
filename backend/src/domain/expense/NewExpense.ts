import { ValidationException, ValidationIssue } from '../errors/ValidationException';
import { CurrencyMismatchException } from '../money/errors';
import { InvalidSplitException } from './errors';
import { Money } from '../money/Money';
import { UserId } from '../user/UserId';

/** Datos validados para registrar un gasto (docs/api/Expenses.md). */
export interface NewExpense {
  title: string;
  description: string | null;
  paidBy: UserId;
  amount: Money;
  expenseDate: Date;
  participants: UserId[];
}

const TITLE_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 500;
/** Tasa 1 escrita como decimal ("1", "1.000000"). */
const RATE_ONE = /^1(?:\.0+)?$/;
/** El día del gasto a las 00:00 Z (con o sin milisegundos). */
const DAY_AT_MIDNIGHT_UTC = /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.000)?Z$/;

/**
 * Valida una carga no confiable contra la moneda base del grupo y devuelve el gasto normalizado.
 * Que pagador y participantes sean miembros activos lo revisa el caso de uso.
 */
export function validateNewExpense(input: unknown, groupCurrency: string): NewExpense {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ValidationException([{ field: 'body', reason: 'must_be_object' }]);
  }
  const body = input as Record<string, unknown>;
  const issues: ValidationIssue[] = [];

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (title.length < 1 || title.length > TITLE_MAX_LENGTH) {
    issues.push({ field: 'title', reason: 'length_1_to_120' });
  }
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    issues.push({ field: 'description', reason: 'max_length_500' });
  }
  const paidBy = typeof body.paidBy === 'string' && body.paidBy.trim() !== '' ? body.paidBy : null;
  if (paidBy === null) {
    issues.push({ field: 'paidBy', reason: 'required' });
  }
  const expenseDate = parseDayAtMidnightUtc(body.expenseDate);
  if (expenseDate === null) {
    issues.push({ field: 'expenseDate', reason: 'must_be_day_at_midnight_utc' });
  }
  if (issues.length > 0 || paidBy === null || expenseDate === null) {
    throw new ValidationException(issues);
  }

  if (body.currency !== groupCurrency || !isRateOneOrAbsent(body.exchangeRate)) {
    throw new CurrencyMismatchException();
  }

  const participants = parseEqualSplitParticipants(body.split);
  return {
    title,
    description: description === '' ? null : description,
    paidBy: UserId.fromString(paidBy),
    amount: Money.parsePositive(typeof body.amount === 'string' ? body.amount : '', groupCurrency),
    expenseDate,
    participants,
  };
}

function parseDayAtMidnightUtc(value: unknown): Date | null {
  const match = typeof value === 'string' ? DAY_AT_MIDNIGHT_UTC.exec(value) : null;
  if (!match) {
    return null;
  }
  const date = new Date(value as string);
  // Rechaza días que no existen (2026-02-30), que Date corre al mes siguiente.
  return date.toISOString().slice(0, 10) === match[1] ? date : null;
}

function isRateOneOrAbsent(value: unknown): boolean {
  return value === undefined || (typeof value === 'string' && RATE_ONE.test(value));
}

/** Participantes de un reparto EQUAL: al menos uno, cada uno con `userId` y sin repetir. */
function parseEqualSplitParticipants(value: unknown): UserId[] {
  const split =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  if (
    split.type !== 'EQUAL' ||
    !Array.isArray(split.participants) ||
    split.participants.length === 0
  ) {
    throw new InvalidSplitException();
  }
  const participants = (split.participants as unknown[]).map((participant) => {
    const userId = (participant as { userId?: unknown } | null)?.userId;
    if (typeof userId !== 'string' || userId.trim() === '') {
      throw new InvalidSplitException();
    }
    return UserId.fromString(userId);
  });
  if (new Set(participants.map((userId) => userId.toString())).size !== participants.length) {
    throw new InvalidSplitException();
  }
  return participants;
}
