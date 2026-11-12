import { ChangeDetectionStrategy, Component, PendingTasks, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { GroupsService, InvitationRejectedError } from '../../../core/groups/groups.service';
import { INVITABLE_ROLES, InvitableRole } from '../../../shared/api';
import { TEXTS } from '../../../shared/texts';

/** Invitar a alguien al grupo por su correo (historia #3 de la pieza 2). */
@Component({
  selector: 'app-invite-member',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ texts.groups.inviteTitle }}</h1>
    <form [formGroup]="form" (ngSubmit)="send()">
      <mat-form-field appearance="outline">
        <mat-label>{{ texts.groups.inviteEmail }}</mat-label>
        <input matInput type="email" formControlName="email" required />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>{{ texts.groups.inviteRole }}</mat-label>
        <mat-select formControlName="role">
          @for (role of roles; track role) {
            <mat-option [value]="role">{{ texts.groups.roles[role] }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      @if (rejection(); as message) {
        <p class="rejection" role="alert">{{ message }}</p>
      }
      @if (sent()) {
        <p class="sent" role="status">{{ texts.groups.inviteSent }}</p>
      }
      <div class="actions">
        <button mat-flat-button type="submit" [disabled]="sending()">
          {{ texts.groups.inviteSend }}
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
    .rejection {
      color: var(--mat-sys-error);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
    }
  `,
})
export class InviteMemberComponent {
  private readonly groups = inject(GroupsService);
  private readonly pendingTasks = inject(PendingTasks);
  private readonly groupId = inject(ActivatedRoute).snapshot.paramMap.get('groupId') ?? '';
  protected readonly texts = TEXTS;
  protected readonly roles = INVITABLE_ROLES;
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly rejection = signal<string | null>(null);

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    role: new FormControl<InvitableRole>('MEMBER', { nonNullable: true }),
  });

  protected send(): void {
    // PendingTasks: whenStable (y la app) esperan a que termine el envío.
    void this.pendingTasks.run(() => this.sendInvitation());
  }

  private async sendInvitation(): Promise<void> {
    const { email, role } = this.form.getRawValue();
    this.sending.set(true);
    this.sent.set(false);
    this.rejection.set(null);
    try {
      await this.groups.inviteMember(this.groupId, { email: email.trim(), role });
      this.sent.set(true);
    } catch (error) {
      if (!(error instanceof InvitationRejectedError)) {
        throw error;
      }
      this.rejection.set(error.message);
    } finally {
      this.sending.set(false);
    }
  }
}
