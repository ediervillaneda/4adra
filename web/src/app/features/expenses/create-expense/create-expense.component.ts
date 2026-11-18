import { ChangeDetectionStrategy, Component, PendingTasks, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ExpenseValidationError, ExpensesService } from '../../../core/expenses/expenses.service';
import { GroupsService } from '../../../core/groups/groups.service';
import { CurrentProfileStore } from '../../../core/profile/current-profile.store';
import { GroupMember, GroupSummary } from '../../../shared/api';
import { TEXTS } from '../../../shared/texts';

/**
 * "Nuevo gasto" (historia #1 de la pieza 3): lo paga quien lo registra y se reparte en partes
 * iguales entre todos los miembros activos. El reparto lo calcula el backend.
 */
@Component({
  selector: 'app-create-expense',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ texts.expenses.createTitle }}</h1>
    @if (loaded(); as loaded) {
      <p class="hint">{{ texts.expenses.splitHint }}</p>
      <form [formGroup]="form" (ngSubmit)="submit(loaded.group, loaded.members)">
        <mat-form-field appearance="outline">
          <mat-label>{{ texts.expenses.title }}</mat-label>
          <input matInput formControlName="title" maxlength="120" required />
          @if (serverError('title'); as error) {
            <mat-error>{{ error }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ texts.expenses.amount }}</mat-label>
          <input matInput formControlName="amount" inputmode="decimal" required />
          <span matTextSuffix>{{ loaded.group.defaultCurrency }}</span>
          @if (serverError('amount'); as error) {
            <mat-error>{{ error }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ texts.expenses.expenseDate }}</mat-label>
          <input matInput type="date" formControlName="expenseDate" required />
          @if (serverError('expenseDate'); as error) {
            <mat-error>{{ error }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ texts.expenses.description }}</mat-label>
          <textarea matInput formControlName="description" maxlength="500" rows="2"></textarea>
          @if (serverError('description'); as error) {
            <mat-error>{{ error }}</mat-error>
          }
        </mat-form-field>
        <div class="actions">
          <a mat-button [routerLink]="['/grupos', loaded.group.id]">{{ texts.expenses.cancel }}</a>
          <button mat-flat-button type="submit" [disabled]="saving()">
            {{ texts.expenses.save }}
          </button>
        </div>
      </form>
    } @else {
      <p>{{ texts.loading }}</p>
    }
  `,
  styles: `
    h1 {
      font: var(--mat-sys-headline-medium);
    }
    .hint {
      color: var(--mat-sys-on-surface-variant);
    }
    form {
      display: flex;
      flex-direction: column;
      max-width: 560px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `,
})
export class CreateExpenseComponent {
  private readonly groupsService = inject(GroupsService);
  private readonly expensesService = inject(ExpensesService);
  private readonly currentProfile = inject(CurrentProfileStore);
  private readonly router = inject(Router);
  private readonly pendingTasks = inject(PendingTasks);
  private readonly groupId = inject(ActivatedRoute).snapshot.paramMap.get('groupId') ?? '';
  protected readonly texts = TEXTS;
  protected readonly saving = signal(false);
  protected readonly loaded = signal<{ group: GroupSummary; members: GroupMember[] } | null>(null);

  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    amount: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    expenseDate: new FormControl(todayInLocalTime(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    description: new FormControl('', { nonNullable: true }),
  });

  /**
   * Una clave por contenido: un reintento sin cambios (red caída, doble toque) repite la clave y el
   * backend devuelve el mismo gasto; si el usuario edita algo, es otro pedido y lleva otra clave.
   */
  private idempotencyKey = crypto.randomUUID();

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.idempotencyKey = crypto.randomUUID();
    });
    void this.pendingTasks.run(async () => {
      const [group, members] = await Promise.all([
        this.groupsService.getGroup(this.groupId),
        this.groupsService.listMembers(this.groupId),
        this.currentProfile.load(),
      ]);
      this.loaded.set({ group, members });
    });
  }

  /** El rechazo del backend para ese campo, ya en español. */
  protected serverError(field: keyof typeof this.form.controls): string | null {
    const server: unknown = this.form.controls[field].errors?.['server'];
    return typeof server === 'string' ? server : null;
  }

  /** PendingTasks: whenStable (app y pruebas) espera a que termine el envío. */
  protected submit(group: GroupSummary, members: GroupMember[]): void {
    void this.pendingTasks.run(() => this.save(group, members));
  }

  private async save(group: GroupSummary, members: GroupMember[]): Promise<void> {
    const payer = this.currentProfile.profile();
    if (payer === null) {
      return;
    }
    const { title, amount, expenseDate, description } = this.form.getRawValue();
    this.saving.set(true);
    try {
      await this.expensesService.createExpense(
        group.id,
        {
          title: title.trim(),
          description: description.trim() === '' ? null : description.trim(),
          paidBy: payer.id,
          // Coma decimal (como se escribe en español) a punto, que es lo que pide la API.
          amount: amount.trim().replace(',', '.'),
          currency: group.defaultCurrency,
          expenseDate: `${expenseDate}T00:00:00Z`,
          split: { type: 'EQUAL', participants: members.map(({ userId }) => ({ userId })) },
        },
        this.idempotencyKey,
      );
      await this.router.navigate(['/grupos', group.id]);
    } catch (error) {
      if (error instanceof ExpenseValidationError) {
        this.showServerErrors(error.fieldErrors);
        return;
      }
      // Un error HTTP ya lo avisa el banner global (authErrorInterceptor); el formulario queda
      // como estaba para reintentar. Cualquier otro error es un defecto y se relanza.
      if (!(error instanceof HttpErrorResponse)) {
        throw error;
      }
    } finally {
      this.saving.set(false);
    }
  }

  /** Pone cada mensaje en su campo sin tocar su valor (así no cambia la clave de idempotencia). */
  private showServerErrors(fieldErrors: Record<string, string>): void {
    for (const [field, message] of Object.entries(fieldErrors)) {
      const control = this.form.get(field);
      control?.setErrors({ server: message });
      control?.markAsTouched();
    }
  }
}

/** Hoy en la hora local del usuario, como lo pide un `<input type="date">` ("2026-11-18"). */
function todayInLocalTime(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${String(now.getFullYear())}-${month}-${day}`;
}
