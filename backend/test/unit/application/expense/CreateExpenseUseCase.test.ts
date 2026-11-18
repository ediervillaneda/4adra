import { describe, it, expect } from 'vitest';
import { CreateExpenseUseCase } from '../../../../src/application/expense/CreateExpenseUseCase';
import { NOW, invitationScenario, juan } from '../../../support/invitationScenario';
import { InMemoryExpenseRepository } from '../../../support/InMemoryExpenseRepository';
import { ana } from '../../../support/inviteLinkScenario';
import { GroupId } from '../../../../src/domain/group/GroupId';

const KEY = '5b76ec1c-1d89-455f-8dfc-f93d5c4b91f2';

function mercado(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'Mercado',
    paidBy: 'usr_juan',
    amount: '100',
    currency: 'COP',
    expenseDate: '2026-11-12T00:00:00Z',
    split: {
      type: 'EQUAL',
      participants: [{ userId: 'usr_juan' }, { userId: 'usr_ana' }, { userId: 'usr_eva' }],
    },
    ...overrides,
  };
}

function setUp(juanRole: 'MEMBER' | 'READ_ONLY' = 'MEMBER'): {
  createExpense: CreateExpenseUseCase;
  expenses: InMemoryExpenseRepository;
  scenario: ReturnType<typeof invitationScenario>;
} {
  const scenario = invitationScenario();
  scenario.joinAs('grp_casa', juanRole);
  scenario.addMember('grp_casa', 'usr_eva', 'Eva', 'MEMBER');
  const expenses = new InMemoryExpenseRepository();
  let sequence = 0;
  const createExpense = new CreateExpenseUseCase(
    scenario.groups,
    expenses,
    () => `exp_${++sequence}`,
    () => NOW,
  );
  return { createExpense, expenses, scenario };
}

describe('CreateExpenseUseCase', () => {
  it('shouldCreateAnEqualExpenseWithTheGroupProfileAndReturnItsShares', async () => {
    const { createExpense, expenses } = setUp();

    const view = await createExpense.execute({
      actor: juan,
      groupId: 'grp_casa',
      idempotencyKey: KEY,
      input: mercado(),
    });

    expect(view).toEqual({
      id: 'exp_1',
      groupId: 'grp_casa',
      title: 'Mercado',
      description: null,
      paidBy: 'usr_juan',
      originalAmount: '100',
      currency: 'COP',
      exchangeRate: '1',
      convertedAmount: '100',
      calculationProfileVersion: 1,
      expenseDate: '2026-11-12T00:00:00.000Z',
      split: {
        type: 'EQUAL',
        participants: [
          { userId: 'usr_ana', amount: '34' },
          { userId: 'usr_eva', amount: '33' },
          { userId: 'usr_juan', amount: '33' },
        ],
      },
      status: 'ACTIVE',
      resourceVersion: 1,
      createdBy: 'usr_juan',
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
    expect(expenses.stored.map((expense) => expense.id.toString())).toEqual(['exp_1']);
  });

  it('shouldRejectAPayerOrParticipantWhoIsNotAnActiveMemberWithoutStoringAnything', async () => {
    const { createExpense, expenses } = setUp();
    const notMember: unknown = expect.objectContaining({ code: 'MEMBER_NOT_ACTIVE' });

    await expect(
      createExpense.execute({
        actor: juan,
        groupId: 'grp_casa',
        idempotencyKey: KEY,
        input: mercado({ paidBy: 'usr_zoe' }),
      }),
    ).rejects.toThrow(notMember);
    await expect(
      createExpense.execute({
        actor: juan,
        groupId: 'grp_casa',
        idempotencyKey: KEY,
        input: mercado({
          split: { type: 'EQUAL', participants: [{ userId: 'usr_juan' }, { userId: 'usr_zoe' }] },
        }),
      }),
    ).rejects.toThrow(notMember);
    expect(expenses.stored).toEqual([]);
  });

  it('shouldReturnTheSameExpenseForARepeatedKeyAndRejectTheKeyWithAnotherBody', async () => {
    const { createExpense, expenses } = setUp();
    const command = { actor: juan, groupId: 'grp_casa', idempotencyKey: KEY, input: mercado() };

    const first = await createExpense.execute(command);
    const retry = await createExpense.execute(command);

    expect(retry).toEqual(first);
    await expect(
      createExpense.execute({ ...command, input: mercado({ amount: '200' }) }),
    ).rejects.toThrow(expect.objectContaining({ code: 'IDEMPOTENCY_CONFLICT' }));
    expect(expenses.stored.map((expense) => expense.id.toString())).toEqual(['exp_1']);
  });

  it('shouldRequireAUuidIdempotencyKey', async () => {
    const { createExpense, expenses } = setUp();

    for (const idempotencyKey of [undefined, '', 'reintento-1']) {
      await expect(
        createExpense.execute({
          actor: juan,
          groupId: 'grp_casa',
          idempotencyKey,
          input: mercado(),
        }),
        String(idempotencyKey),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        details: [{ field: 'Idempotency-Key', reason: 'must_be_uuid' }],
      });
    }
    expect(expenses.stored).toEqual([]);
  });

  it('shouldDenyReadOnlyRejectAnArchivedGroupAndHideTheGroupFromNonMembers', async () => {
    const readOnly = setUp('READ_ONLY');
    await expect(
      readOnly.createExpense.execute({
        actor: juan,
        groupId: 'grp_casa',
        idempotencyKey: KEY,
        input: mercado(),
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'PERMISSION_DENIED' }));

    const archived = setUp();
    await archived.scenario.groups.archive(GroupId.fromString('grp_casa'), ana.userId, NOW);
    await expect(
      archived.createExpense.execute({
        actor: juan,
        groupId: 'grp_casa',
        idempotencyKey: KEY,
        input: mercado(),
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'GROUP_ARCHIVED' }));

    const outsider = setUp();
    await expect(
      outsider.createExpense.execute({
        actor: juan,
        groupId: 'grp_playa',
        idempotencyKey: KEY,
        input: mercado(),
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'GROUP_NOT_FOUND' }));
    expect([readOnly, archived, outsider].flatMap(({ expenses }) => expenses.stored)).toEqual([]);
  });
});
