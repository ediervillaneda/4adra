import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PendingTasks,
  inject,
  input,
  signal,
} from '@angular/core';
import { ExpensesService } from '../../../core/expenses/expenses.service';
import { Expense, GroupMember, GroupSummary } from '../../../shared/api';
import { TEXTS } from '../../../shared/texts';
import { formatExpenseDate, formatMoney } from '../../../shared/money-format';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { canWriteExpenses } from '../../../core/groups/group-permissions';

/** Pestaña "Gastos" del detalle del grupo (historia #1 de la pieza 3). */
@Component({
  selector: 'app-expense-list',
  imports: [MatListModule, MatButtonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (canWrite()) {
      <a
        mat-flat-button
        class="new-expense"
        data-testid="new-expense"
        [routerLink]="['/grupos', group().id, 'gastos', 'nuevo']"
        >{{ texts.expenses.create }}</a
      >
    }
    @if (expenses(); as expenses) {
      @if (expenses.length === 0) {
        <p class="empty" data-testid="expenses-empty">{{ texts.expenses.empty }}</p>
      } @else {
        <mat-list>
          @for (expense of expenses; track expense.id) {
            <mat-list-item data-testid="expense-item">
              <span matListItemTitle data-testid="expense-title">{{ expense.title }}</span>
              <span matListItemLine>
                <span data-testid="expense-date">{{ dateOf(expense) }}</span> ·
                <span data-testid="expense-payer">{{ payerOf(expense) }}</span>
              </span>
              <span matListItemMeta class="amount" data-testid="expense-amount">{{
                amountOf(expense)
              }}</span>
            </mat-list-item>
          }
        </mat-list>
      }
    }
  `,
  styles: `
    .empty {
      color: var(--mat-sys-on-surface-variant);
    }
    .new-expense {
      margin-top: 16px;
    }
    .amount {
      font: var(--mat-sys-title-medium);
      color: var(--mat-sys-on-surface);
    }
  `,
})
export class ExpenseListComponent implements OnInit {
  readonly group = input.required<GroupSummary>();
  readonly members = input.required<GroupMember[]>();
  private readonly expensesService = inject(ExpensesService);
  private readonly pendingTasks = inject(PendingTasks);
  protected readonly texts = TEXTS;
  protected readonly expenses = signal<Expense[] | null>(null);

  ngOnInit(): void {
    // PendingTasks: whenStable (app y pruebas) espera a que lleguen los gastos.
    void this.pendingTasks.run(async () => {
      this.expenses.set(await this.expensesService.listExpenses(this.group().id));
    });
  }

  protected canWrite(): boolean {
    return canWriteExpenses(this.group());
  }

  protected amountOf(expense: Expense): string {
    return formatMoney(expense.originalAmount, expense.currency);
  }

  protected dateOf(expense: Expense): string {
    return formatExpenseDate(expense.expenseDate);
  }

  /** Quien pagó, por su nombre en el grupo; si ya no es miembro activo, "un exmiembro". */
  protected payerOf(expense: Expense): string {
    const payer = this.members().find((member) => member.userId === expense.paidBy);
    return TEXTS.expenses.paidBy(payer?.displayName ?? TEXTS.expenses.formerMember);
  }
}
