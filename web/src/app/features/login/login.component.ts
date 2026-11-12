import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/auth/auth.service';
import { BrandLogoComponent } from '../../shared/brand-logo.component';
import { TEXTS } from '../../shared/texts';

@Component({
  selector: 'app-login',
  imports: [MatButtonModule, BrandLogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="login">
      <app-brand-logo [size]="96" />
      <h1>{{ texts.appName }}</h1>
      <p class="tagline">{{ texts.tagline }}</p>
      @if (errorMessage) {
        <p class="error" role="alert">{{ errorMessage }}</p>
      }
      <button mat-flat-button type="button" (click)="signIn()">
        {{ texts.login.continueWithGoogle }}
      </button>
    </section>
  `,
  styles: `
    .login {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px 16px;
      text-align: center;
    }
    h1 {
      font: var(--mat-sys-display-small);
      margin: 0;
    }
    .tagline {
      font: var(--mat-sys-title-medium);
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 16px;
    }
    .error {
      max-width: 420px;
      padding: 12px 16px;
      border-radius: 12px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  protected readonly texts = TEXTS;
  protected readonly errorMessage = this.messageFor(
    inject(ActivatedRoute).snapshot.queryParamMap.get('error'),
  );

  protected signIn(): void {
    void this.auth.signInWithGoogle();
  }

  private messageFor(error: string | null): string | null {
    if (error === null) {
      return null;
    }
    return error === 'NOT_INVITED' ? TEXTS.login.notInvited : TEXTS.login.genericError;
  }
}
