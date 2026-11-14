import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { GroupsService, GroupValidationError } from '../../../core/groups/groups.service';
import { CurrentProfileStore } from '../../../core/profile/current-profile.store';
import { SUPPORTED_CURRENCIES } from '../../../shared/api';
import { TEXTS } from '../../../shared/texts';

type GroupField = 'name' | 'description' | 'defaultCurrency';

@Component({
  selector: 'app-create-group',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ texts.groups.createTitle }}</h1>
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
      <mat-form-field appearance="outline">
        <mat-label>{{ texts.groups.defaultCurrency }}</mat-label>
        <mat-select formControlName="defaultCurrency">
          @for (currency of currencies; track currency) {
            <mat-option [value]="currency">{{ currency }}</mat-option>
          }
        </mat-select>
        @if (errorFor('defaultCurrency'); as error) {
          <mat-error>{{ error }}</mat-error>
        }
      </mat-form-field>
      <div class="actions">
        <a mat-button routerLink="/">{{ texts.groups.cancel }}</a>
        <button mat-flat-button type="submit" [disabled]="saving()">
          {{ texts.groups.create }}
        </button>
      </div>
    </form>
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
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `,
})
export class CreateGroupComponent {
  private readonly groups = inject(GroupsService);
  private readonly router = inject(Router);
  private readonly currentProfile = inject(CurrentProfileStore);
  protected readonly texts = TEXTS;
  protected readonly currencies = SUPPORTED_CURRENCIES;
  protected readonly saving = signal(false);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    description: new FormControl('', { nonNullable: true }),
    defaultCurrency: new FormControl('COP', { nonNullable: true }),
  });

  constructor() {
    void this.currentProfile.load();
    // Preselecciona la moneda del perfil mientras el usuario no haya elegido otra.
    effect(() => {
      const preferred = this.currentProfile.profile()?.preferredCurrency;
      const currency = this.form.controls.defaultCurrency;
      if (preferred && currency.pristine) {
        currency.setValue(preferred);
      }
    });
  }

  protected errorFor(field: GroupField): string | null {
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

  protected async save(): Promise<void> {
    const { name, description, defaultCurrency } = this.form.getRawValue();
    this.saving.set(true);
    try {
      await this.groups.createGroup({
        name: name.trim(),
        description: description.trim() === '' ? null : description.trim(),
        defaultCurrency,
      });
      await this.router.navigateByUrl('/');
    } catch (error) {
      if (!(error instanceof GroupValidationError)) {
        throw error;
      }
      for (const [field, message] of Object.entries(error.fieldErrors)) {
        const control = this.form.get(field);
        control?.setErrors({ server: message });
        control?.markAsTouched();
      }
    } finally {
      this.saving.set(false);
    }
  }
}
