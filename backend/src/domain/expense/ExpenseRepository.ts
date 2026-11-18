import { GroupId } from '../group/GroupId';
import { Expense } from './Expense';

/** Resultado de guardar un gasto con su clave de idempotencia. */
export type ExpenseCreationResult =
  | { status: 'CREATED'; expense: Expense }
  /** El autor ya había usado la clave con el mismo contenido: el gasto de entonces, sin crear otro. */
  | { status: 'REPLAYED'; expense: Expense }
  /** El autor ya había usado la clave con otro contenido. */
  | { status: 'IDEMPOTENCY_CONFLICT' };

export interface ExpenseRepository {
  /**
   * Guarda el gasto y sus repartos en una sola operación atómica, salvo que su autor ya haya usado
   * esa `idempotencyKey`: entonces no guarda nada y compara `fingerprint` con el de aquella vez.
   */
  createIdempotent(
    expense: Expense,
    idempotencyKey: string,
    fingerprint: string,
  ): Promise<ExpenseCreationResult>;
  /** Gastos activos del grupo por `expenseDate` descendente y luego por id descendente. */
  listActive(groupId: GroupId): Promise<Expense[]>;
}
