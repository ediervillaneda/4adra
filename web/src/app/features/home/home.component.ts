import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileReviewFlag } from '../../core/profile/profile-review-flag';
import { CurrentProfileStore } from '../../core/profile/current-profile.store';
import { GroupsService } from '../../core/groups/groups.service';
import { GroupSummary } from '../../shared/api';
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
  protected readonly texts = TEXTS;
  /** null mientras carga: así no parpadea el estado vacío. */
  protected readonly groups = signal<GroupSummary[] | null>(null);
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
  }

  private async loadGroups(): Promise<void> {
    this.groups.set(await this.groupsService.listGroups());
  }
}
