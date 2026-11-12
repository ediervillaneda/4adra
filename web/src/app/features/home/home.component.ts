import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileReviewFlag } from '../../core/profile-review-flag';
import { TEXTS } from '../../shared/texts';

@Component({
  selector: 'app-home',
  imports: [RouterLink, MatButtonModule, MatCardModule],
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
    <section class="empty">
      <h2>{{ texts.home.emptyGroupsTitle }}</h2>
      <p>{{ texts.home.emptyGroupsBody }}</p>
      <button mat-flat-button type="button" disabled>{{ texts.home.createGroupSoon }}</button>
    </section>
  `,
  styles: `
    h1 {
      font: var(--mat-sys-headline-medium);
    }
    .hint {
      margin-bottom: 24px;
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
  protected readonly texts = TEXTS;
  protected readonly showReviewHint = !inject(ProfileReviewFlag).isReviewed();
  protected readonly greeting = computed(() => {
    const state = this.session();
    return TEXTS.home.greeting(state.status === 'authenticated' ? state.user.name : '');
  });
}
