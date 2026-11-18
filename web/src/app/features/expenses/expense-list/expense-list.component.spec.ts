import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ExpenseListComponent } from './expense-list.component';
import { ExpensesService } from '../../../core/expenses/expenses.service';
import { Expense, GroupMember, GroupSummary } from '../../../shared/api';

const CASA: GroupSummary = {
  id: 'grp_casa',
  name: 'Casa',
  description: null,
  defaultCurrency: 'COP',
  status: 'ACTIVE',
  role: 'MEMBER',
  createdAt: '2026-11-12T15:00:00.000Z',
  updatedAt: '2026-11-12T15:00:00.000Z',
};

const MEMBERS: GroupMember[] = [
  {
    userId: 'usr_ana',
    displayName: 'Ana',
    photoUrl: null,
    role: 'OWNER',
    status: 'ACTIVE',
    joinedAt: '2026-11-12T15:00:00.000Z',
  },
  {
    userId: 'usr_juan',
    displayName: 'Juan',
    photoUrl: null,
    role: 'MEMBER',
    status: 'ACTIVE',
    joinedAt: '2026-11-12T15:00:00.000Z',
  },
];

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: 'exp_1',
    groupId: 'grp_casa',
    title: 'Mercado',
    description: null,
    paidBy: 'usr_ana',
    originalAmount: '150000',
    currency: 'COP',
    exchangeRate: '1',
    convertedAmount: '150000',
    calculationProfileVersion: 1,
    expenseDate: '2026-11-17T00:00:00.000Z',
    split: { type: 'EQUAL', participants: [] },
    status: 'ACTIVE',
    resourceVersion: 1,
    createdBy: 'usr_ana',
    createdAt: '2026-11-17T15:00:00.000Z',
    updatedAt: '2026-11-17T15:00:00.000Z',
    ...overrides,
  };
}

async function render(
  expenses: Expense[],
  group: GroupSummary = CASA,
): Promise<ComponentFixture<ExpenseListComponent>> {
  TestBed.configureTestingModule({
    imports: [ExpenseListComponent],
    providers: [
      provideRouter([]),
      { provide: ExpensesService, useValue: { listExpenses: () => Promise.resolve(expenses) } },
    ],
  });
  const fixture = TestBed.createComponent(ExpenseListComponent);
  fixture.componentRef.setInput('group', group);
  fixture.componentRef.setInput('members', MEMBERS);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

/** Texto visible, con los espacios duros de Intl como espacios normales. */
function text(element: Element | null | undefined): string {
  return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('ExpenseListComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('shouldShowTitleAmountInTheGroupCurrencyDateAndPayerInTheBackendOrder', async () => {
    const fixture = await render([
      expense({ id: 'exp_2', title: 'Luz', originalAmount: '85500', paidBy: 'usr_juan' }),
      expense({ id: 'exp_1', title: 'Mercado', expenseDate: '2026-11-03T00:00:00.000Z' }),
      expense({ id: 'exp_0', title: 'Taxi', paidBy: 'usr_ex_miembro' }),
    ]);

    const rows = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="expense-item"]'),
    ).map((row) => [
      text(row.querySelector('[data-testid="expense-title"]')),
      text(row.querySelector('[data-testid="expense-amount"]')),
      text(row.querySelector('[data-testid="expense-date"]')),
      text(row.querySelector('[data-testid="expense-payer"]')),
    ]);

    expect(rows).toEqual([
      ['Luz', '$ 85.500', '17 nov 2026', 'Pagó Juan'],
      ['Mercado', '$ 150.000', '3 nov 2026', 'Pagó Ana'],
      ['Taxi', '$ 150.000', '17 nov 2026', 'Pagó un exmiembro'],
    ]);
  });

  it('shouldShowCentsForOtherCurrencies', async () => {
    const fixture = await render([expense({ originalAmount: '33.34', currency: 'USD' })], {
      ...CASA,
      defaultCurrency: 'USD',
    });

    expect(
      text((fixture.nativeElement as HTMLElement).querySelector('[data-testid="expense-amount"]')),
    ).toBe('US$ 33,34');
  });

  it('shouldOfferNewExpenseOnlyToRolesThatWriteInAnActiveGroup', async () => {
    const hrefs: Record<string, string | null> = {};
    const cases: [string, GroupSummary][] = [
      ['OWNER', { ...CASA, role: 'OWNER' }],
      ['ADMINISTRATOR', { ...CASA, role: 'ADMINISTRATOR' }],
      ['MEMBER', { ...CASA, role: 'MEMBER' }],
      ['READ_ONLY', { ...CASA, role: 'READ_ONLY' }],
      ['ARCHIVED_OWNER', { ...CASA, role: 'OWNER', status: 'ARCHIVED' }],
    ];
    for (const [name, group] of cases) {
      TestBed.resetTestingModule();
      const fixture = await render([], group);
      hrefs[name] =
        (fixture.nativeElement as HTMLElement)
          .querySelector('[data-testid="new-expense"]')
          ?.getAttribute('href') ?? null;
    }

    expect(hrefs).toEqual({
      OWNER: '/grupos/grp_casa/gastos/nuevo',
      ADMINISTRATOR: '/grupos/grp_casa/gastos/nuevo',
      MEMBER: '/grupos/grp_casa/gastos/nuevo',
      READ_ONLY: null,
      ARCHIVED_OWNER: null,
    });
  });
});
