import { ChangeDetectionStrategy, Component, PendingTasks, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDialog } from '@angular/material/dialog';
import { GroupNotFoundError, GroupsService } from '../../../core/groups/groups.service';
import { GroupMember, GroupSummary } from '../../../shared/api';
import { TEXTS } from '../../../shared/texts';
import {
  ShareInviteLinkDialogComponent,
  ShareInviteLinkDialogData,
} from '../share-invite-link/share-invite-link-dialog.component';
import {
  ChangeMemberRoleDialogComponent,
  ChangeMemberRoleDialogData,
} from '../change-member-role/change-member-role-dialog.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/confirm-dialog.component';
import { CurrentProfileStore } from '../../../core/profile/current-profile.store';

type DetailState =
  | { status: 'loading' }
  | { status: 'content'; group: GroupSummary; members: GroupMember[] }
  | { status: 'notFound' }
  | { status: 'error' };

/** Detalle de un grupo: sus datos y sus miembros activos (historias #2, #6 y #7 de la pieza 2). */
@Component({
  selector: 'app-group-detail',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatListModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (state().status) {
      @case ('loading') {
        <p>{{ texts.loading }}</p>
      }
      @case ('content') {
        @if (content(); as content) {
          <h1>{{ content.group.name }}</h1>
          @if (content.group.description) {
            <p class="description">{{ content.group.description }}</p>
          }
          <p class="currency">
            {{ texts.groups.defaultCurrency }}: {{ content.group.defaultCurrency }}
          </p>
          <h2 class="section-title">{{ texts.groups.membersTitle }}</h2>
          @if (canInvite(content.group)) {
            <a
              mat-stroked-button
              data-testid="invite-link"
              [routerLink]="['/grupos', content.group.id, 'invitar']"
              >{{ texts.groups.invite }}</a
            >
            <button
              mat-stroked-button
              type="button"
              data-testid="share-invite-link"
              (click)="openShareInviteLink(content.group)"
            >
              {{ texts.groups.shareInviteLink }}
            </button>
          }
          <mat-list>
            @for (member of content.members; track member.userId) {
              <mat-list-item data-testid="member-item">
                @if (member.photoUrl) {
                  <img
                    matListItemAvatar
                    [src]="member.photoUrl"
                    alt=""
                    referrerpolicy="no-referrer"
                  />
                } @else {
                  <mat-icon matListItemIcon>person</mat-icon>
                }
                <span matListItemTitle data-testid="member-name">{{ member.displayName }}</span>
                <span matListItemLine data-testid="member-role">{{
                  texts.groups.roles[member.role]
                }}</span>
                @if (canChangeRoles(content.group)) {
                  <button
                    matListItemMeta
                    mat-button
                    type="button"
                    data-testid="change-role"
                    (click)="openChangeRole(content.group, member)"
                  >
                    {{ texts.groups.changeRole }}
                  </button>
                }
                @if (canRemove(content.group, member)) {
                  <button
                    matListItemMeta
                    mat-button
                    type="button"
                    data-testid="remove-member"
                    (click)="openRemoveMember(content.group, member)"
                  >
                    {{ texts.groups.removeMember }}
                  </button>
                }
              </mat-list-item>
            }
          </mat-list>
        }
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
    .description,
    .currency {
      color: var(--mat-sys-on-surface-variant);
    }
    .section-title {
      font: var(--mat-sys-title-medium);
    }
  `,
})
export class GroupDetailComponent {
  private readonly groupsService = inject(GroupsService);
  private readonly dialog = inject(MatDialog);
  private readonly groupId = inject(ActivatedRoute).snapshot.paramMap.get('groupId') ?? '';
  protected readonly texts = TEXTS;
  protected readonly state = signal<DetailState>({ status: 'loading' });
  private readonly pendingTasks = inject(PendingTasks);
  private readonly currentProfile = inject(CurrentProfileStore);

  constructor() {
    // PendingTasks: la app (y las pruebas, con whenStable) no se dan por estables hasta que cargue.
    void this.pendingTasks.run(() => this.load());
    // El perfil propio dice cuál es tu fila (sin "Remover"); suele estar cargado por la barra superior.
    void this.pendingTasks.run(() => this.currentProfile.load());
  }

  /** Solo Owner y Administrator ven "Invitar"; el backend vuelve a validar el permiso. */
  protected canInvite(group: GroupSummary): boolean {
    return group.role === 'OWNER' || group.role === 'ADMINISTRATOR';
  }

  /** Solo el Owner cambia roles (matriz en docs/Security.md); el backend vuelve a validarlo. */
  protected canChangeRoles(group: GroupSummary): boolean {
    return group.role === 'OWNER';
  }

  /**
   * Owner remueve a cualquiera; Administrator, solo a Member y ReadOnly; nadie a sí mismo (para eso
   * está salir). Solo decide qué botón se ve: el backend vuelve a validarlo.
   */
  protected canRemove(group: GroupSummary, member: GroupMember): boolean {
    // Sin saber quién mira (perfil aún sin cargar o GET /me fallido), no se ofrece en ninguna fila.
    const viewerId = this.currentProfile.profile()?.id;
    if (viewerId === undefined || member.userId === viewerId) {
      return false;
    }
    return (
      group.role === 'OWNER' ||
      (group.role === 'ADMINISTRATOR' && (member.role === 'MEMBER' || member.role === 'READ_ONLY'))
    );
  }

  protected openRemoveMember(group: GroupSummary, member: GroupMember): void {
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, true>(ConfirmDialogComponent, {
        data: {
          title: TEXTS.groups.removeMemberTitle(member.displayName),
          message: TEXTS.groups.removeMemberMessage,
          confirmLabel: TEXTS.groups.removeMember,
          confirm: async () => {
            await this.groupsService.removeMember(group.id, member.userId);
          },
        },
      })
      .afterClosed()
      .subscribe((removed) => {
        if (removed === true) {
          void this.pendingTasks.run(() => this.load());
        }
      });
  }

  /** Si hubo cambio, recarga grupo y miembros: si el Owner se degradó, ya no ve sus opciones. */
  protected openChangeRole(group: GroupSummary, member: GroupMember): void {
    this.dialog
      .open<ChangeMemberRoleDialogComponent, ChangeMemberRoleDialogData, GroupMember>(
        ChangeMemberRoleDialogComponent,
        { data: { groupId: group.id, member } },
      )
      .afterClosed()
      .subscribe((changed) => {
        // Cancelar, Escape o clic fuera cierran sin miembro: no hay nada que recargar.
        if (changed?.userId !== undefined) {
          void this.pendingTasks.run(() => this.load());
        }
      });
  }

  protected openShareInviteLink(group: GroupSummary): void {
    this.dialog.open<ShareInviteLinkDialogComponent, ShareInviteLinkDialogData>(
      ShareInviteLinkDialogComponent,
      { data: { groupId: group.id, groupName: group.name } },
    );
  }

  protected content(): Extract<DetailState, { status: 'content' }> | null {
    const state = this.state();
    return state.status === 'content' ? state : null;
  }

  private async load(): Promise<void> {
    try {
      const [group, members] = await Promise.all([
        this.groupsService.getGroup(this.groupId),
        this.groupsService.listMembers(this.groupId),
      ]);
      this.state.set({ status: 'content', group, members });
    } catch (error) {
      this.state.set({ status: error instanceof GroupNotFoundError ? 'notFound' : 'error' });
    }
  }
}
