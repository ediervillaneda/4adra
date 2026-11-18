import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { ValidationException } from '../../domain/errors/ValidationException';
import { Expense } from '../../domain/expense/Expense';
import { ExpenseId } from '../../domain/expense/ExpenseId';
import { ExpenseRepository } from '../../domain/expense/ExpenseRepository';
import {
  IdempotencyConflictException,
  MemberNotActiveException,
} from '../../domain/expense/errors';
import { NewExpense, validateNewExpense } from '../../domain/expense/NewExpense';
import { GroupId } from '../../domain/group/GroupId';
import { GroupRepository } from '../../domain/group/GroupRepository';
import { ROLES_THAT_WRITE_EXPENSES } from '../../domain/group/MemberRole';
import { findGroupWhereActorHasRole } from '../group/findGroupWhereActorHasRole';
import { ExpenseView, toExpenseView } from './ExpenseView';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CreateExpenseCommand {
  actor: AuthenticatedActor;
  groupId: string;
  /** Encabezado `Idempotency-Key` (no confiable). */
  idempotencyKey: string | undefined;
  /** Carga no confiable (cuerpo JSON). */
  input: unknown;
}

/** Owner, Administrator o Member registran un gasto repartido en partes iguales (docs/api/Expenses.md). */
export class CreateExpenseUseCase {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly expenseRepository: ExpenseRepository,
    private readonly generateId: () => string,
    private readonly now: () => Date,
  ) {}

  async execute(command: CreateExpenseCommand): Promise<ExpenseView> {
    const groupId = GroupId.fromString(command.groupId);
    const { group } = await findGroupWhereActorHasRole(
      this.groupRepository,
      groupId,
      command.actor.userId,
      ROLES_THAT_WRITE_EXPENSES,
    );
    const idempotencyKey = command.idempotencyKey?.trim().toLowerCase() ?? '';
    if (!UUID_PATTERN.test(idempotencyKey)) {
      throw new ValidationException([{ field: 'Idempotency-Key', reason: 'must_be_uuid' }]);
    }
    const data = validateNewExpense(command.input, group.defaultCurrency);
    const activeMembers = new Set(
      (await this.groupRepository.listActiveMembers(groupId)).map((member) =>
        member.userId.toString(),
      ),
    );
    if (
      ![data.paidBy, ...data.participants].every((userId) => activeMembers.has(userId.toString()))
    ) {
      throw new MemberNotActiveException();
    }

    const expense = Expense.create(
      ExpenseId.fromString(this.generateId()),
      groupId,
      data,
      group.calculationProfile,
      command.actor.userId,
      this.now(),
    );
    const result = await this.expenseRepository.createIdempotent(
      expense,
      idempotencyKey,
      fingerprintOf(data),
    );
    if (result.status === 'IDEMPOTENCY_CONFLICT') {
      throw new IdempotencyConflictException();
    }
    return toExpenseView(result.expense);
  }
}

/** Contenido normalizado del pedido, para reconocer un reintento con la misma clave. */
function fingerprintOf(data: NewExpense): string {
  return JSON.stringify({
    title: data.title,
    description: data.description,
    paidBy: data.paidBy.toString(),
    amount: data.amount.toString(),
    currency: data.amount.currency,
    expenseDate: data.expenseDate.toISOString(),
    participants: data.participants.map((userId) => userId.toString()).sort(),
  });
}
