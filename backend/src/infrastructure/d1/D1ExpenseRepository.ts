import { Expense, ExpenseStatus } from '../../domain/expense/Expense';
import { ExpenseId } from '../../domain/expense/ExpenseId';
import { ExpenseCreationResult, ExpenseRepository } from '../../domain/expense/ExpenseRepository';
import { GroupId } from '../../domain/group/GroupId';
import { Money } from '../../domain/money/Money';
import { UserId } from '../../domain/user/UserId';
import { fromIsoDate, toIsoDate } from './isoDate';

/** Una fila por parte del reparto, con los datos de su gasto repetidos. */
interface ExpenseShareRow {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  paid_by: string;
  currency: string;
  exchange_rate: string;
  original_amount: string;
  calculation_profile_id: string;
  calculation_profile_version: number;
  expense_date: string;
  status: ExpenseStatus;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  share_user_id: string;
  share_amount: string;
}

const SELECT_EXPENSE_SHARES = `SELECT e.*, s.user_id AS share_user_id, s.amount AS share_amount
  FROM expenses e JOIN expense_splits s ON s.expense_id = e.id`;

export class D1ExpenseRepository implements ExpenseRepository {
  constructor(private readonly database: D1Database) {}

  async createIdempotent(
    expense: Expense,
    idempotencyKey: string,
    fingerprint: string,
  ): Promise<ExpenseCreationResult> {
    const id = expense.id.toString();
    const amount = expense.amount.toString();
    // Un solo batch atómico: si el autor ya usó la clave, ni el gasto ni sus partes se escriben.
    const results = await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO expenses (id, group_id, title, description, paid_by, currency, exchange_rate,
             original_amount, converted_amount, split_type, calculation_profile_id,
             calculation_profile_version, expense_date, status, version, created_by, created_at,
             updated_at, idempotency_key, request_fingerprint)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'EQUAL', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (created_by, idempotency_key) DO NOTHING`,
        )
        .bind(
          id,
          expense.groupId.toString(),
          expense.title,
          expense.description,
          expense.paidBy.toString(),
          expense.amount.currency,
          expense.exchangeRate,
          amount,
          amount,
          expense.calculationProfile.id,
          expense.calculationProfile.version,
          toIsoDate(expense.expenseDate),
          expense.status,
          expense.version,
          expense.createdBy.toString(),
          toIsoDate(expense.createdAt),
          toIsoDate(expense.updatedAt),
          idempotencyKey,
          fingerprint,
        ),
      ...expense.shares.map((share) =>
        this.database
          .prepare(
            `INSERT INTO expense_splits (expense_id, user_id, amount)
             SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM expenses WHERE id = ?)`,
          )
          .bind(id, share.userId.toString(), share.amount.toString(), id),
      ),
      this.database
        .prepare(
          'SELECT id, request_fingerprint FROM expenses WHERE created_by = ? AND idempotency_key = ?',
        )
        .bind(expense.createdBy.toString(), idempotencyKey),
    ]);
    const stored = results.at(-1)?.results[0] as { id: string; request_fingerprint: string };
    if (stored.id === id) {
      return { status: 'CREATED', expense };
    }
    if (stored.request_fingerprint !== fingerprint) {
      return { status: 'IDEMPOTENCY_CONFLICT' };
    }
    const [previous] = await this.selectExpenses('WHERE e.id = ?', [stored.id]);
    return { status: 'REPLAYED', expense: previous as Expense };
  }

  listActive(groupId: GroupId): Promise<Expense[]> {
    return this.selectExpenses(
      "WHERE e.group_id = ? AND e.status = 'ACTIVE' ORDER BY e.expense_date DESC, e.id DESC",
      [groupId.toString()],
    );
  }

  private async selectExpenses(condition: string, values: string[]): Promise<Expense[]> {
    const { results } = await this.database
      .prepare(
        `${SELECT_EXPENSE_SHARES} ${condition}${condition.includes('ORDER BY') ? ',' : ' ORDER BY'} s.user_id`,
      )
      .bind(...values)
      .all<ExpenseShareRow>();
    // Las filas llegan agrupadas por gasto (en el orden pedido) y, dentro de cada uno, por usuario.
    const byExpense = new Map<string, ExpenseShareRow[]>();
    for (const row of results) {
      byExpense.set(row.id, [...(byExpense.get(row.id) ?? []), row]);
    }
    return [...byExpense.values()].map(toExpense);
  }
}

function toExpense(rows: ExpenseShareRow[]): Expense {
  const row = rows[0] as ExpenseShareRow;
  return Expense.restore({
    id: ExpenseId.fromString(row.id),
    groupId: GroupId.fromString(row.group_id),
    title: row.title,
    description: row.description,
    paidBy: UserId.fromString(row.paid_by),
    amount: Money.parse(row.original_amount, row.currency),
    exchangeRate: row.exchange_rate,
    expenseDate: fromIsoDate(row.expense_date),
    shares: rows.map((share) => ({
      userId: UserId.fromString(share.share_user_id),
      amount: Money.parse(share.share_amount, row.currency),
    })),
    calculationProfile: {
      id: row.calculation_profile_id,
      version: row.calculation_profile_version,
    },
    status: row.status,
    version: row.version,
    createdBy: UserId.fromString(row.created_by),
    createdAt: fromIsoDate(row.created_at),
    updatedAt: fromIsoDate(row.updated_at),
  });
}
