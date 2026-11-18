import { describe, it, expect } from 'vitest';
import { Expense } from '../../../../src/domain/expense/Expense';
import { ExpenseId } from '../../../../src/domain/expense/ExpenseId';
import { validateNewExpense } from '../../../../src/domain/expense/NewExpense';
import { GroupId } from '../../../../src/domain/group/GroupId';
import { Money } from '../../../../src/domain/money/Money';
import { UserId } from '../../../../src/domain/user/UserId';

const NOW = new Date('2026-11-18T15:30:00.000Z');

describe('Expense', () => {
  it('shouldCreateAnActiveExpenseSplitEquallyWithTheGroupProfileVersion', () => {
    const data = validateNewExpense(
      {
        title: 'Mercado',
        paidBy: 'user-a',
        amount: '100',
        currency: 'COP',
        expenseDate: '2026-11-17T00:00:00Z',
        split: {
          type: 'EQUAL',
          participants: [{ userId: 'user-c' }, { userId: 'user-a' }, { userId: 'user-b' }],
        },
      },
      'COP',
    );

    const expense = Expense.create(
      ExpenseId.fromString('expense-1'),
      GroupId.fromString('group-1'),
      data,
      { id: 'default', version: 1 },
      UserId.fromString('user-a'),
      NOW,
    );

    expect(expense.id.toString()).toBe('expense-1');
    expect(expense.groupId.toString()).toBe('group-1');
    expect(expense.title).toBe('Mercado');
    expect(expense.description).toBeNull();
    expect(expense.paidBy.toString()).toBe('user-a');
    expect(expense.expenseDate.toISOString()).toBe('2026-11-17T00:00:00.000Z');
    expect(expense.status).toBe('ACTIVE');
    expect(expense.version).toBe(1);
    expect(expense.amount.toString()).toBe('100');
    expect(expense.exchangeRate).toBe('1');
    expect(expense.calculationProfile).toEqual({ id: 'default', version: 1 });
    expect(expense.createdBy.toString()).toBe('user-a');
    expect(expense.createdAt).toEqual(NOW);
    expect(expense.updatedAt).toEqual(NOW);
    expect(
      expense.shares.map((share) => [share.userId.toString(), share.amount.toString()]),
    ).toEqual([
      ['user-a', '34'],
      ['user-b', '33'],
      ['user-c', '33'],
    ]);
  });

  it('shouldRestoreAPersistedExpenseAsItWasStored', () => {
    const later = new Date('2026-11-19T08:00:00.000Z');
    const expense = Expense.restore({
      id: ExpenseId.fromString('expense-9'),
      groupId: GroupId.fromString('group-1'),
      title: 'Hotel',
      description: 'Primera noche',
      paidBy: UserId.fromString('user-b'),
      amount: Money.parse('500.00', 'USD'),
      exchangeRate: '1',
      expenseDate: new Date('2026-11-14T00:00:00.000Z'),
      shares: [
        { userId: UserId.fromString('user-a'), amount: Money.parse('250.00', 'USD') },
        { userId: UserId.fromString('user-b'), amount: Money.parse('250.00', 'USD') },
      ],
      calculationProfile: { id: 'default', version: 1 },
      status: 'ACTIVE',
      version: 3,
      createdBy: UserId.fromString('user-b'),
      createdAt: NOW,
      updatedAt: later,
    });

    expect([expense.title, expense.description, expense.version, expense.updatedAt]).toEqual([
      'Hotel',
      'Primera noche',
      3,
      later,
    ]);
    expect(expense.shares.map((share) => share.amount.toString())).toEqual(['250.00', '250.00']);
  });
});
