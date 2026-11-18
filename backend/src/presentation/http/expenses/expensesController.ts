import { Handler } from 'hono';
import { AppEnv } from '../AppEnv';
import { CreateExpenseUseCase } from '../../../application/expense/CreateExpenseUseCase';
import { ListExpensesUseCase } from '../../../application/expense/ListExpensesUseCase';
import { readJsonBody } from '../readJsonBody';
import { successEnvelope } from '../responseEnvelope';

/** POST /groups/{groupId}/expenses: 201 también al repetir la Idempotency-Key (mismo gasto). */
export function createPostExpenseHandler(
  useCase: CreateExpenseUseCase,
): Handler<AppEnv, '/v1/groups/:groupId/expenses'> {
  return async (c) => {
    const expense = await useCase.execute({
      actor: c.get('actor'),
      groupId: c.req.param('groupId'),
      idempotencyKey: c.req.header('idempotency-key'),
      input: await readJsonBody(c),
    });
    return c.json(successEnvelope(expense, c.get('requestId')), 201);
  };
}

export function createGetExpensesHandler(
  useCase: ListExpensesUseCase,
): Handler<AppEnv, '/v1/groups/:groupId/expenses'> {
  return async (c) => {
    const expenses = await useCase.execute({
      actor: c.get('actor'),
      groupId: c.req.param('groupId'),
    });
    return c.json(successEnvelope(expenses, c.get('requestId')), 200);
  };
}
