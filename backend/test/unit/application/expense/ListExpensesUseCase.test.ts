import { describe, it, expect } from 'vitest';
import { CreateExpenseUseCase } from '../../../../src/application/expense/CreateExpenseUseCase';
import { ListExpensesUseCase } from '../../../../src/application/expense/ListExpensesUseCase';
import { GroupId } from '../../../../src/domain/group/GroupId';
import { NOW, invitationScenario, juan } from '../../../support/invitationScenario';
import { InMemoryExpenseRepository } from '../../../support/InMemoryExpenseRepository';
import { ana } from '../../../support/inviteLinkScenario';

describe('ListExpensesUseCase', () => {
  it('shouldListTheGroupExpensesToAnyActiveMemberEvenReadOnlyInAnArchivedGroup', async () => {
    const scenario = invitationScenario();
    scenario.joinAs('grp_casa', 'READ_ONLY');
    const expenses = new InMemoryExpenseRepository();
    await new CreateExpenseUseCase(
      scenario.groups,
      expenses,
      () => 'exp_1',
      () => NOW,
    ).execute({
      actor: ana,
      groupId: 'grp_casa',
      idempotencyKey: '5b76ec1c-1d89-455f-8dfc-f93d5c4b91f2',
      input: {
        title: 'Arriendo',
        paidBy: 'usr_ana',
        amount: '1200000',
        currency: 'COP',
        expenseDate: '2026-11-01T00:00:00Z',
        split: { type: 'EQUAL', participants: [{ userId: 'usr_ana' }, { userId: 'usr_juan' }] },
      },
    });
    await scenario.groups.archive(GroupId.fromString('grp_casa'), ana.userId, NOW);
    const listExpenses = new ListExpensesUseCase(scenario.groups, expenses);

    const views = await listExpenses.execute({ actor: juan, groupId: 'grp_casa' });

    expect(views.map((view) => [view.id, view.title, view.originalAmount])).toEqual([
      ['exp_1', 'Arriendo', '1200000'],
    ]);
    await expect(listExpenses.execute({ actor: juan, groupId: 'grp_playa' })).rejects.toThrow(
      expect.objectContaining({ code: 'GROUP_NOT_FOUND' }),
    );
  });
});
