import {
  ChangeDetectionStrategy,
  Component,
  PendingTasks,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileReviewFlag } from '../../core/profile/profile-review-flag';
import { CurrentProfileStore } from '../../core/profile/current-profile.store';
import { GroupsService } from '../../core/groups/groups.service';
import {
  InvitationClosedError,
  InvitationsService,
} from '../../core/invitations/invitations.service';
import { ApiErrorNotifier } from '../../core/http/api-error-notifier';
import { GroupSummary, ReceivedInvitation } from '../../shared/api';
import { TEXTS } from '../../shared/texts';

@Component({
  selector: 'app-home',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatListModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ greeting() }}</h1>
    @if (showReviewHint) {
      <mat-card appearance="outlined" class="hint">
        <mat-card-content>{{ texts.home.reviewProfileHint }}</mat-card-content>
        <mat-card-actions>
          <a mat-button routerLink="/perfil">{{ texts.home.reviewProfileAction }}</a>
        </mat-card-actions>
      </mat-card>
    }
    @if (invitations().length > 0) {
      <section data-testid="invitations-section">
        <h2 class="section-title">{{ texts.home.invitationsTitle }}</h2>
        @for (invitation of invitations(); track invitation.invitationId) {
          <mat-card appearance="outlined" class="invitation" data-testid="invitation-item">
            <mat-card-header>
              <mat-icon mat-card-avatar>mail</mat-icon>
              <mat-card-title>{{ invitation.groupName }}</mat-card-title>
              <mat-card-subtitle>{{
                texts.home.invitedBy(invitation.invitedByName, texts.groups.roles[invitation.role])
              }}</mat-card-subtitle>
            </mat-card-header>
            @if (failedInvitationId() === invitation.invitationId) {
              <mat-card-content>
                <p class="answer-error" role="alert">{{ texts.home.invitationAnswerError }}</p>
              </mat-card-content>
            }
            <mat-card-actions align="end">
              <button
                mat-button
                type="button"
                data-testid="decline-invitation"
                (click)="answer(invitation.invitationId, 'decline')"
              >
                {{ texts.home.declineInvitation }}
              </button>
              <button
                mat-flat-button
                type="button"
                data-testid="accept-invitation"
                (click)="answer(invitation.invitationId, 'accept')"
              >
                {{ texts.home.acceptInvitation }}
              </button>
            </mat-card-actions>
          </mat-card>
        }
      </section>
    }
    @if (groups(); as groups) {
      @if (groups.length > 0) {
        <h2 class="section-title">{{ texts.home.groupsTitle }}</h2>
        <mat-nav-list>
          @for (group of groups; track group.id) {
            <a mat-list-item data-testid="group-item" [routerLink]="['/grupos', group.id]">
              <mat-icon matListItemIcon>group</mat-icon>
              <span matListItemTitle>{{ group.name }}</span>
              <span matListItemLine
                >{{ texts.groups.roles[group.role] }} · {{ group.defaultCurrency }}</span
              >
            </a>
          }
        </mat-nav-list>
        <a mat-fab extended class="fab" routerLink="/grupos/nuevo">
          <mat-icon>add</mat-icon>
          {{ texts.home.createGroup }}
        </a>
      } @else {
        <section class="empty">
          <h2>{{ texts.home.emptyGroupsTitle }}</h2>
          <p>{{ texts.home.emptyGroupsBody }}</p>
          <a mat-flat-button routerLink="/grupos/nuevo">{{ texts.home.createGroup }}</a>
        </section>
      }
    }
  `,
  styles: `
    h1 {
      font: var(--mat-sys-headline-medium);
    }
    .hint {
      margin-bottom: 24px;
    }
    .invitation {
      margin-bottom: 12px;
    }
    .answer-error {
      color: var(--mat-sys-error);
    }
    .section-title {
      font: var(--mat-sys-title-medium);
    }
    .fab {
      position: fixed;
      right: 24px;
      bottom: calc(96px + env(safe-area-inset-bottom));
    }
    @media (min-width: 840px) {
      .fab {
        bottom: 24px;
      }
    }
    .empty {
      padding: 32px 16px;
      text-align: center;
      border: 1px dashed var(--mat-sys-outline-variant);
      border-radius: 16px;
    }
    .empty h2 {
      font: var(--mat-sys-title-large);
    }
    .empty p {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class HomeComponent {
  private readonly session = inject(AuthService).session;
  private readonly currentProfile = inject(CurrentProfileStore);
  private readonly groupsService = inject(GroupsService);
  private readonly invitationsService = inject(InvitationsService);
  private readonly errorNotifier = inject(ApiErrorNotifier);
  protected readonly texts = TEXTS;
  /** null mientras carga: así no parpadea el estado vacío. */
  protected readonly groups = signal<GroupSummary[] | null>(null);
  protected readonly invitations = signal<ReceivedInvitation[]>([]);
  /** La invitación cuya última respuesta falló: su tarjeta muestra el error. */
  protected readonly failedInvitationId = signal<string | null>(null);
  private readonly pendingTasks = inject(PendingTasks);
  protected readonly showReviewHint = !inject(ProfileReviewFlag).isReviewed();
  protected readonly greeting = computed(() => {
    const state = this.session();
    const name =
      this.currentProfile.profile()?.displayName ??
      (state.status === 'authenticated' ? state.user.name : '');
    return TEXTS.home.greeting(name);
  });

  constructor() {
    void this.currentProfile.load();
    void this.loadGroups();
    // PendingTasks: whenStable (y la app) esperan a que lleguen las invitaciones.
    void this.pendingTasks.run(() => this.loadInvitations());
  }

  protected answer(invitationId: string, answer: 'accept' | 'decline'): void {
    // PendingTasks: whenStable (y la app) esperan la respuesta y la recarga de grupos.
    void this.pendingTasks.run(() => this.sendAnswer(invitationId, answer));
  }

  private async sendAnswer(invitationId: string, answer: 'accept' | 'decline'): Promise<void> {
    this.failedInvitationId.set(null);
    try {
      await (answer === 'accept'
        ? this.invitationsService.accept(invitationId)
        : this.invitationsService.decline(invitationId));
    } catch (error) {
      if (!(error instanceof InvitationClosedError)) {
        this.failedInvitationId.set(invitationId);
        return;
      }
      // Ya no se puede responder: se quita la tarjeta y el banner explica por qué.
      this.errorNotifier.show(error.message);
    }
    this.invitations.update((invitations) =>
      invitations.filter((invitation) => invitation.invitationId !== invitationId),
    );
    if (answer === 'accept') {
      await this.loadGroups();
    }
  }

  private async loadInvitations(): Promise<void> {
    this.invitations.set(await this.invitationsService.listMyInvitations());
  }

  private async loadGroups(): Promise<void> {
    this.groups.set(await this.groupsService.listGroups());
  }
}
