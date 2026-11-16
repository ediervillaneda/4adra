import { ChangeDetectionStrategy, Component, PendingTasks, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { canEditGroup } from '../../../core/groups/group-permissions';

type DetailState =
  | { status: 'loading' }
  | { status: 'content'; group: GroupSummary; members: GroupMember[] }
  | { status: 'notFound' }
  | { status: 'error' };

/**
 * Detalle de un grupo: sus datos y sus miembros activos (historias #2, #6 a #10 de la pieza 2). Un grupo
 * archivado se muestra de solo lectura, sin ninguna acción.
 */
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
          @if (content.group.status === 'ARCHIVED') {
            <p class="archived-banner" role="status" data-testid="archived-banner">
              <mat-icon>inventory_2</mat-icon>
              {{ texts.groups.archivedBanner }}
            </p>
          }
          @if (canEdit(content.group)) {
            <a
              mat-stroked-button
              data-testid="edit-group"
              [routerLink]="['/grupos', content.group.id, 'editar']"
              >{{ texts.groups.edit }}</a
            >
          }
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
          @if (isActive(content.group)) {
            <div class="group-actions">
              <button
                mat-stroked-button
                type="button"
                data-testid="leave-group"
                (click)="openLeaveGroup(content.group)"
              >
                {{ texts.groups.leaveGroup }}
              </button>
              @if (canArchive(content.group)) {
                <button
                  mat-stroked-button
                  type="button"
                  data-testid="archive-group"
                  (click)="openArchiveGroup(content.group)"
                >
                  {{ texts.groups.archiveGroup }}
                </button>
              }
            </div>
          }
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
    .archived-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-radius: 12px;
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface);
    }
    .group-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
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
  private readonly router = inject(Router);

  constructor() {
    // PendingTasks: la app (y las pruebas, con whenStable) no se dan por estables hasta que cargue.
    void this.pendingTasks.run(() => this.load());
    // El perfil propio dice cuál es tu fila (sin "Remover"); suele estar cargado por la barra superior.
    void this.pendingTasks.run(() => this.currentProfile.load());
  }

  /** Un grupo archivado es de solo lectura: no se ofrece ninguna acción (el backend responde 409). */
  protected isActive(group: GroupSummary): boolean {
    return group.status === 'ACTIVE';
  }

  /** Solo Owner y Administrator ven "Invitar"; el backend vuelve a validar el permiso. */
  protected canInvite(group: GroupSummary): boolean {
    return this.isActive(group) && (group.role === 'OWNER' || group.role === 'ADMINISTRATOR');
  }

  protected canEdit(group: GroupSummary): boolean {
    return this.isActive(group) && canEditGroup(group.role);
  }

  /** Solo el Owner cambia roles (matriz en docs/Security.md); el backend vuelve a validarlo. */
  protected canChangeRoles(group: GroupSummary): boolean {
    return this.isActive(group) && group.role === 'OWNER';
  }

  /** Solo el Owner archiva un grupo activo; el backend vuelve a validarlo. */
  protected canArchive(group: GroupSummary): boolean {
    return this.isActive(group) && group.role === 'OWNER';
  }

  /**
   * Owner remueve a cualquiera; Administrator, solo a Member y ReadOnly; nadie a sí mismo (para eso
   * está salir). Solo decide qué botón se ve: el backend vuelve a validarlo.
   */
  protected canRemove(group: GroupSummary, member: GroupMember): boolean {
    // Sin saber quién mira (perfil aún sin cargar o GET /me fallido), no se ofrece en ninguna fila.
    const viewerId = this.currentProfile.profile()?.id;
    if (!this.isActive(group) || viewerId === undefined || member.userId === viewerId) {
      return false;
    }
    return (
      group.role === 'OWNER' ||
      (group.role === 'ADMINISTRATOR' && (member.role === 'MEMBER' || member.role === 'READ_ONLY'))
    );
  }

  /** Cualquier miembro puede salir; el backend rechaza al único Owner (`LAST_OWNER`). */
  protected openLeaveGroup(group: GroupSummary): void {
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, true>(ConfirmDialogComponent, {
        data: {
          title: TEXTS.groups.leaveGroupTitle(group.name),
          message: TEXTS.groups.leaveGroupMessage,
          confirmLabel: TEXTS.groups.leaveGroup,
          confirm: async () => {
            await this.groupsService.leaveGroup(group.id);
          },
        },
      })
      .afterClosed()
      .subscribe((left) => {
        if (left === true) {
          void this.pendingTasks.run(() => this.router.navigate(['/']));
        }
      });
  }

  /** Archivar es irreversible desde la app: al confirmar, vuelve a Inicio, donde el grupo pasa a "Archivados". */
  protected openArchiveGroup(group: GroupSummary): void {
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, true>(ConfirmDialogComponent, {
        data: {
          title: TEXTS.groups.archiveGroupTitle(group.name),
          message: TEXTS.groups.archiveGroupMessage,
          confirmLabel: TEXTS.groups.archiveGroup,
          confirm: async () => {
            await this.groupsService.archiveGroup(group.id);
          },
        },
      })
      .afterClosed()
      .subscribe((archived) => {
        if (archived === true) {
          void this.pendingTasks.run(() => this.router.navigate(['/']));
        }
      });
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
