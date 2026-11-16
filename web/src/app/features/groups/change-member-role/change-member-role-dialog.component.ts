import { ChangeDetectionStrategy, Component, PendingTasks, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { GroupsService, MemberRoleChangeRejectedError } from '../../../core/groups/groups.service';
import { GroupMember, MEMBER_ROLES, MemberRole } from '../../../shared/api';
import { TEXTS } from '../../../shared/texts';

export interface ChangeMemberRoleDialogData {
  groupId: string;
  member: GroupMember;
}

/**
 * Un Owner elige el rol nuevo de un miembro (historia #6 de la pieza 2). Se cierra con el miembro
 * actualizado; si el backend rechaza el cambio (por ejemplo, LAST_OWNER), muestra el motivo y sigue abierto.
 */
@Component({
  selector: 'app-change-member-role-dialog',
  imports: [MatButtonModule, MatDialogModule, MatRadioModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ texts.changeRoleTitle(data.member.displayName) }}</h2>
    <mat-dialog-content>
      <mat-radio-group
        class="roles"
        [attr.aria-label]="texts.inviteRole"
        [value]="role()"
        (change)="role.set($event.value)"
      >
        @for (option of roles; track option) {
          <mat-radio-button [value]="option" [attr.data-testid]="'role-option-' + option">{{
            texts.roles[option]
          }}</mat-radio-button>
        }
      </mat-radio-group>
      @if (errorMessage(); as errorMessage) {
        <p class="error" role="alert">{{ errorMessage }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <!-- Sin valor, mat-dialog-close cerraría con '' y el detalle lo tomaría como un cambio. -->
      <button mat-button type="button" data-testid="cancel-role" [mat-dialog-close]="undefined">
        {{ texts.cancel }}
      </button>
      <button
        mat-flat-button
        type="button"
        data-testid="save-role"
        [disabled]="saving() || role() === data.member.role"
        (click)="save()"
      >
        {{ texts.changeRoleSave }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .roles {
      display: flex;
      flex-direction: column;
    }
    .error {
      color: var(--mat-sys-error);
    }
  `,
})
export class ChangeMemberRoleDialogComponent {
  protected readonly data = inject<ChangeMemberRoleDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<ChangeMemberRoleDialogComponent, GroupMember>>(MatDialogRef);
  private readonly groupsService = inject(GroupsService);
  private readonly pendingTasks = inject(PendingTasks);
  protected readonly texts = TEXTS.groups;
  protected readonly roles = MEMBER_ROLES;
  protected readonly role = signal<MemberRole>(this.data.member.role);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected save(): void {
    this.saving.set(true);
    this.errorMessage.set(null);
    void this.pendingTasks.run(async () => {
      try {
        const member = await this.groupsService.changeMemberRole(
          this.data.groupId,
          this.data.member.userId,
          this.role(),
        );
        this.dialogRef.close(member);
      } catch (error) {
        // Otros errores: el código de referencia lo muestra el banner global (authErrorInterceptor).
        this.errorMessage.set(
          error instanceof MemberRoleChangeRejectedError ? error.message : TEXTS.errors.generic,
        );
      } finally {
        this.saving.set(false);
      }
    });
  }
}
