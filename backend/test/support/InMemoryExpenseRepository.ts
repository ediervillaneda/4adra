import { Expense } from '../../src/domain/expense/Expense';
import { GroupId } from '../../src/domain/group/GroupId';
import {
  ExpenseCreationResult,
  ExpenseRepository,
} from '../../src/domain/expense/ExpenseRepository';

/** ExpenseRepository en memoria para pruebas unitarias de los casos de uso. */
export class InMemoryExpenseRepository implements ExpenseRepository {
  readonly stored: Expense[] = [];
  private readonly keys = new Map<string, { expense: Expense; fingerprint: string }>();

  createIdempotent(
    expense: Expense,
    idempotencyKey: string,
    fingerprint: string,
  ): Promise<ExpenseCreationResult> {
    const scopedKey = `${expense.createdBy.toString()}:${idempotencyKey}`;
    const previous = this.keys.get(scopedKey);
    if (previous) {
      return Promise.resolve(
        previous.fingerprint === fingerprint
          ? { status: 'REPLAYED', expense: previous.expense }
          : { status: 'IDEMPOTENCY_CONFLICT' },
      );
    }
    this.keys.set(scopedKey, { expense, fingerprint });
    this.stored.push(expense);
    return Promise.resolve({ status: 'CREATED', expense });
  }

  listActive(groupId: GroupId): Promise<Expense[]> {
    return Promise.resolve(
      this.stored.filter(
        (expense) =>
          expense.groupId.toString() === groupId.toString() && expense.status === 'ACTIVE',
      ),
    );
  }
}
