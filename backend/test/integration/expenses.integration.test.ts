import { describe, it, expect } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import {
  API,
  Person,
  createGroupAs,
  errorCode,
  joinAsMember,
  patchRole,
  signIn,
} from './groupScenario';

interface ExpenseBody {
  data: {
    id: string;
    title: string;
    paidBy: string;
    originalAmount: string;
    calculationProfileVersion: number;
    split: { type: string; participants: { userId: string; amount: string }[] };
  };
}

function postExpense(
  person: Person,
  groupId: string,
  body: Record<string, unknown>,
  idempotencyKey: string = crypto.randomUUID(),
): Promise<Response> {
  return SELF.fetch(`${API}/groups/${groupId}/expenses`, {
    method: 'POST',
    headers: {
      cookie: person.cookie,
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify(body),
  });
}

function equalExpense(
  paidBy: Person,
  participants: Person[],
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    title: 'Mercado',
    paidBy: paidBy.userId,
    amount: '100',
    currency: 'COP',
    expenseDate: '2026-11-17T00:00:00Z',
    split: { type: 'EQUAL', participants: participants.map(({ userId }) => ({ userId })) },
    ...overrides,
  };
}

async function listExpenses(person: Person, groupId: string): Promise<Response> {
  return SELF.fetch(`${API}/groups/${groupId}/expenses`, { headers: { cookie: person.cookie } });
}

describe('Gastos (Worker + D1 + Better Auth)', () => {
  it('shouldCreateAnEqualExpenseAndListItForEveryMember', async () => {
    const ana = await signIn('ana.gasto@example.com', 'Ana');
    const juan = await signIn('juan.gasto@example.com', 'Juan');
    const eva = await signIn('eva.gasto@example.com', 'Eva');
    const casa = await createGroupAs(ana, 'Casa');
    await joinAsMember(ana, juan, casa);
    await joinAsMember(ana, eva, casa);

    const created = await postExpense(juan, casa, equalExpense(juan, [ana, juan, eva]));

    expect(created.status).toBe(201);
    const body: ExpenseBody = await created.json();
    expect(body.data).toMatchObject({
      title: 'Mercado',
      paidBy: juan.userId,
      originalAmount: '100',
      calculationProfileVersion: 1,
    });
    // 100 COP entre 3: 34, 33 y 33; el peso que sobra va al UserId menor.
    const shares = body.data.split.participants;
    expect(shares.map(({ amount }) => amount)).toEqual(['34', '33', '33']);
    const smallestUserId = [ana.userId, juan.userId, eva.userId].reduce((a, b) => (a < b ? a : b));
    expect(shares[0]?.userId).toBe(smallestUserId);
    const stored = await env.DB.prepare(
      `SELECT e.calculation_profile_id, e.calculation_profile_version, e.original_amount,
              (SELECT group_concat(s.amount, ',') FROM expense_splits s WHERE s.expense_id = e.id) AS splits
       FROM expenses e WHERE e.id = ?`,
    )
      .bind(body.data.id)
      .first();
    expect(stored).toMatchObject({
      calculation_profile_id: 'default',
      calculation_profile_version: 1,
      original_amount: '100',
    });
    expect(String(stored?.splits).split(',').sort()).toEqual(['33', '33', '34']);

    const seenByAna = await listExpenses(ana, casa);
    expect(seenByAna.status).toBe(200);
    const list: { data: { id: string }[] } = await seenByAna.json();
    expect(list.data.map(({ id }) => id)).toEqual([body.data.id]);
  });

  it('shouldListExpensesNewestFirst', async () => {
    const ana = await signIn('ana.orden@example.com', 'Ana');
    const casa = await createGroupAs(ana, 'Casa');
    const titles = [
      ['Arriendo', '2026-11-01T00:00:00Z'],
      ['Mercado', '2026-11-15T00:00:00Z'],
      ['Luz', '2026-11-08T00:00:00Z'],
      ['Agua', '2026-11-15T00:00:00Z'],
    ];
    const ids: Record<string, string> = {};
    for (const [title, expenseDate] of titles) {
      const response = await postExpense(
        ana,
        casa,
        equalExpense(ana, [ana], { title, expenseDate }),
      );
      const body: ExpenseBody = await response.json();
      ids[title as string] = body.data.id;
    }

    const list: { data: { title: string }[] } = await (await listExpenses(ana, casa)).json();

    // Mismo día: primero el creado después (id UUIDv7 descendente).
    expect(list.data.map(({ title }) => title)).toEqual(['Agua', 'Mercado', 'Luz', 'Arriendo']);
    expect((ids.Agua as string) > (ids.Mercado as string)).toBe(true);
  });

  it('shouldRejectInvalidAmountOrEmptyTitleWithoutCreatingAnything', async () => {
    const ana = await signIn('ana.invalido@example.com', 'Ana');
    const casa = await createGroupAs(ana, 'Casa');

    const badAmount = await postExpense(ana, casa, equalExpense(ana, [ana], { amount: '100.50' }));
    const noTitle = await postExpense(ana, casa, equalExpense(ana, [ana], { title: '  ' }));
    const badSplit = await postExpense(
      ana,
      casa,
      equalExpense(ana, [ana], { split: { type: 'SHARES', participants: [] } }),
    );

    expect([badAmount.status, await errorCode(badAmount)]).toEqual([400, 'INVALID_AMOUNT']);
    expect(noTitle.status).toBe(400);
    expect(await noTitle.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR', details: [{ field: 'title', reason: 'length_1_to_120' }] },
    });
    expect([badSplit.status, await errorCode(badSplit)]).toEqual([400, 'INVALID_SPLIT']);
    expect(await expensesInD1(casa)).toBe(0);
  });

  it('shouldRejectPayerOrParticipantThatIsNotAnActiveMember', async () => {
    const ana = await signIn('ana.ajena@example.com', 'Ana');
    const zoe = await signIn('zoe.ajena@example.com', 'Zoe');
    const casa = await createGroupAs(ana, 'Casa');

    const response = await postExpense(ana, casa, equalExpense(ana, [ana, zoe]));

    expect([response.status, await errorCode(response)]).toEqual([422, 'MEMBER_NOT_ACTIVE']);
    expect(await expensesInD1(casa)).toBe(0);
  });

  it('shouldReturnTheSameExpenseWhenTheIdempotencyKeyRepeats', async () => {
    const ana = await signIn('ana.reintento@example.com', 'Ana');
    const casa = await createGroupAs(ana, 'Casa');
    const key = crypto.randomUUID();

    const first = await postExpense(ana, casa, equalExpense(ana, [ana]), key);
    const retry = await postExpense(ana, casa, equalExpense(ana, [ana]), key);

    expect([first.status, retry.status]).toEqual([201, 201]);
    const firstBody: ExpenseBody = await first.json();
    const retryBody: ExpenseBody = await retry.json();
    expect(retryBody.data).toEqual(firstBody.data);
    expect(await expensesInD1(casa)).toBe(1);
  });

  it('shouldRejectTheSameIdempotencyKeyWithADifferentBody', async () => {
    const ana = await signIn('ana.conflicto@example.com', 'Ana');
    const casa = await createGroupAs(ana, 'Casa');
    const key = crypto.randomUUID();
    await postExpense(ana, casa, equalExpense(ana, [ana]), key);

    const other = await postExpense(ana, casa, equalExpense(ana, [ana], { amount: '200' }), key);

    expect([other.status, await errorCode(other)]).toEqual([409, 'IDEMPOTENCY_CONFLICT']);
    expect(await expensesInD1(casa)).toBe(1);
  });

  it('shouldDenyCreatingToReadOnly', async () => {
    const ana = await signIn('ana.lectura@example.com', 'Ana');
    const juan = await signIn('juan.lectura@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    await joinAsMember(ana, juan, casa);
    await patchRole(ana, casa, juan.userId, 'READ_ONLY');

    const response = await postExpense(juan, casa, equalExpense(juan, [ana, juan]));

    expect([response.status, await errorCode(response)]).toEqual([403, 'PERMISSION_DENIED']);
    expect((await listExpenses(juan, casa)).status).toBe(200);
    expect(await expensesInD1(casa)).toBe(0);
  });

  it('shouldRejectCreatingInAnArchivedGroup', async () => {
    const ana = await signIn('ana.archivado@example.com', 'Ana');
    const casa = await createGroupAs(ana, 'Casa');
    await SELF.fetch(`${API}/groups/${casa}/archive`, {
      method: 'POST',
      headers: { cookie: ana.cookie },
    });

    const response = await postExpense(ana, casa, equalExpense(ana, [ana]));

    expect([response.status, await errorCode(response)]).toEqual([409, 'GROUP_ARCHIVED']);
    expect((await listExpenses(ana, casa)).status).toBe(200);
    expect(await expensesInD1(casa)).toBe(0);
  });

  it('shouldHideExpensesFromNonMembers', async () => {
    const ana = await signIn('ana.oculta@example.com', 'Ana');
    const eva = await signIn('eva.oculta@example.com', 'Eva');
    const casa = await createGroupAs(ana, 'Casa');
    await postExpense(ana, casa, equalExpense(ana, [ana]));

    const create = await postExpense(eva, casa, equalExpense(eva, [eva]));
    const list = await listExpenses(eva, casa);

    expect([create.status, await errorCode(create)]).toEqual([404, 'GROUP_NOT_FOUND']);
    expect([list.status, await errorCode(list)]).toEqual([404, 'GROUP_NOT_FOUND']);
    expect(await expensesInD1(casa)).toBe(1);
  });
});

async function expensesInD1(groupId: string): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS total FROM expenses WHERE group_id = ?')
    .bind(groupId)
    .first<{ total: number }>();
  return row?.total ?? 0;
}
