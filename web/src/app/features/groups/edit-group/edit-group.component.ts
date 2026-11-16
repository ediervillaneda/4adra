import { ChangeDetectionStrategy, Component, PendingTasks, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  GroupArchivedError,
  GroupEditDeniedError,
  GroupNotFoundError,
  GroupValidationError,
  GroupsService,
} from '../../../core/groups/groups.service';
import { canEditGroup } from '../../../core/groups/group-permissions';
import { GroupSummary } from '../../../shared/api';
import { TEXTS } from '../../../shared/texts';

type EditState =
  | { status: 'loading' }
  | { status: 'form'; group: GroupSummary }
  | { status: 'denied' }
  | { status: 'archived' }
  | { status: 'notFound' }
  | { status: 'error' };

type EditableField = 'name' | 'description';

/** Owner y Administrator editan el nombre y la descripción del grupo (historia #9 de la pieza 2). */
@Component({
  selector: 'app-edit-group',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (state().status) {
      @case ('loading') {
        <p>{{ texts.loading }}</p>
      }
      @case ('form') {
        <h1>{{ texts.groups.editTitle }}</h1>
        <form [formGroup]="form" (ngSubmit)="save()">
          <mat-form-field appearance="outline">
            <mat-label>{{ texts.groups.name }}</mat-label>
            <input matInput formControlName="name" maxlength="120" required />
            @if (errorFor('name'); as error) {
              <mat-error>{{ error }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ texts.groups.description }}</mat-label>
            <textarea matInput formControlName="description" maxlength="500" rows="3"></textarea>
            @if (errorFor('description'); as error) {
              <mat-error>{{ error }}</mat-error>
            }
          </mat-form-field>
          <p class="currency" data-testid="group-currency">
            {{ texts.groups.defaultCurrency }}: {{ currency() }}.
            {{ texts.groups.currencyIsFixed }}
          </p>
          <div class="actions">
            <a mat-button [routerLink]="['/grupos', groupId]">{{ texts.groups.cancel }}</a>
            <button mat-flat-button type="submit" data-testid="save-group" [disabled]="saving()">
              {{ texts.groups.saveChanges }}
            </button>
          </div>
        </form>
      }
      @case ('denied') {
        <p>{{ texts.groups.editDenied }}</p>
        <a mat-button [routerLink]="['/grupos', groupId]">{{ texts.groups.cancel }}</a>
      }
      @case ('archived') {
        <p>{{ texts.groups.editArchived }}</p>
        <a mat-button [routerLink]="['/grupos', groupId]">{{ texts.groups.cancel }}</a>
      }
      @case ('notFound') {
        <h1>{{ texts.groups.notFoundTitle }}</h1>
        <a mat-flat-button routerLink="/">{{ texts.groups.backHome }}</a>
      }
      @case ('error') {
        <!-- El código de referencia lo muestra el banner global (authErrorInterceptor). -->
        <p>{{ texts.errors.generic }}</p>
      }
    }
  `,
  styles: `
    h1 {
      font: var(--mat-sys-headline-medium);
    }
    form {
      display: flex;
      flex-direction: column;
      max-width: 560px;
    }
    .currency {
      color: var(--mat-sys-on-surface-variant);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `,
})
export class EditGroupComponent {
  private readonly groups = inject(GroupsService);
  private readonly router = inject(Router);
  private readonly pendingTasks = inject(PendingTasks);
  protected readonly groupId = inject(ActivatedRoute).snapshot.paramMap.get('groupId') ?? '';
  protected readonly texts = TEXTS;
  protected readonly state = signal<EditState>({ status: 'loading' });
  protected readonly saving = signal(false);
  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    description: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    // PendingTasks: la app (y las pruebas, con whenStable) no se dan por estables hasta que cargue.
    void this.pendingTasks.run(() => this.load());
  }

  protected currency(): string {
    const state = this.state();
    return state.status === 'form' ? state.group.defaultCurrency : '';
  }

  protected errorFor(field: EditableField): string | null {
    const errors = this.form.controls[field].errors;
    if (!errors) {
      return null;
    }
    if (typeof errors['server'] === 'string') {
      return errors['server'];
    }
    return errors['required']
      ? TEXTS.groups.errors['required']
      : TEXTS.groups.errors['length_1_to_120'];
  }

  protected save(): void {
    const { name, description } = this.form.getRawValue();
    // Un nombre de solo espacios cuenta como vacío: no se envía nada que el backend va a rechazar.
    if (name.trim() === '') {
      this.form.controls.name.setErrors({ required: true });
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    void this.pendingTasks.run(async () => {
      try {
        await this.groups.updateGroup(this.groupId, {
          name: name.trim(),
          description: description.trim() === '' ? null : description.trim(),
        });
        await this.router.navigate(['/grupos', this.groupId]);
      } catch (error) {
        // Mientras editabas, te degradaron (403) o te removieron (404): el formulario ya no aplica.
        if (error instanceof GroupEditDeniedError) {
          this.state.set({ status: 'denied' });
        } else if (error instanceof GroupArchivedError) {
          // Otro miembro lo archivó mientras editabas.
          this.state.set({ status: 'archived' });
        } else if (error instanceof GroupNotFoundError) {
          this.state.set({ status: 'notFound' });
        } else if (error instanceof GroupValidationError) {
          for (const [field, message] of Object.entries(error.fieldErrors)) {
            const control = this.form.get(field);
            control?.setErrors({ server: message });
            control?.markAsTouched();
          }
        }
        // Otros errores: el código de referencia lo muestra el banner global (authErrorInterceptor).
      } finally {
        this.saving.set(false);
      }
    });
  }

  private async load(): Promise<void> {
    try {
      const group = await this.groups.getGroup(this.groupId);
      // Un grupo archivado es de solo lectura (por ejemplo, al abrir un marcador de esta ruta).
      if (group.status !== 'ACTIVE') {
        this.state.set({ status: 'archived' });
        return;
      }
      if (!canEditGroup(group.role)) {
        this.state.set({ status: 'denied' });
        return;
      }
      this.form.setValue({ name: group.name, description: group.description ?? '' });
      this.state.set({ status: 'form', group });
    } catch (error) {
      this.state.set({ status: error instanceof GroupNotFoundError ? 'notFound' : 'error' });
    }
  }
}
