import { ChangeDetectionStrategy, Component, PendingTasks, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import {
  InviteLinkUnavailableError,
  InviteLinksService,
} from '../../core/invite-links/invite-links.service';
import { InviteLinkPreview } from '../../shared/api';
import { TEXTS } from '../../shared/texts';

type JoinState =
  | { status: 'loading' }
  | { status: 'ready'; preview: InviteLinkPreview }
  | { status: 'unavailable'; message: string }
  | { status: 'error' };

/** Página del enlace de invitación: a qué grupo te invitan y "Unirme" (historia #5 de la pieza 2). */
@Component({
  selector: 'app-join-group',
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="join">
      @switch (state().status) {
        @case ('loading') {
          <p>{{ texts.loading }}</p>
        }
        @case ('ready') {
          @if (preview(); as preview) {
            <h1>{{ texts.inviteLinks.invitedTo(preview.groupName) }}</h1>
            <button
              mat-flat-button
              type="button"
              data-testid="join-group"
              [disabled]="joining()"
              (click)="join()"
            >
              {{ texts.inviteLinks.join }}
            </button>
          }
        }
        @case ('unavailable') {
          <p role="alert">{{ unavailableMessage() }}</p>
        }
        @case ('error') {
          <!-- El código de referencia lo muestra el banner global (authErrorInterceptor). -->
          <p>{{ texts.errors.generic }}</p>
        }
      }
    </section>
  `,
  styles: `
    .join {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px 16px;
      text-align: center;
    }
    h1 {
      font: var(--mat-sys-headline-small);
    }
  `,
})
export class JoinGroupComponent {
  private readonly inviteLinks = inject(InviteLinksService);
  private readonly router = inject(Router);
  private readonly pendingTasks = inject(PendingTasks);
  private readonly code = inject(ActivatedRoute).snapshot.paramMap.get('code') ?? '';
  protected readonly texts = TEXTS;
  protected readonly state = signal<JoinState>({ status: 'loading' });
  protected readonly joining = signal(false);

  constructor() {
    void this.pendingTasks.run(() => this.load());
  }

  protected preview(): InviteLinkPreview | null {
    const state = this.state();
    return state.status === 'ready' ? state.preview : null;
  }

  protected unavailableMessage(): string {
    const state = this.state();
    return state.status === 'unavailable' ? state.message : '';
  }

  protected join(): void {
    this.joining.set(true);
    void this.pendingTasks.run(async () => {
      try {
        const membership = await this.inviteLinks.join(this.code);
        await this.router.navigateByUrl(`/grupos/${membership.groupId}`);
      } catch (error) {
        this.showFailure(error);
      } finally {
        this.joining.set(false);
      }
    });
  }

  private async load(): Promise<void> {
    try {
      this.state.set({ status: 'ready', preview: await this.inviteLinks.getLink(this.code) });
    } catch (error) {
      this.showFailure(error);
    }
  }

  private showFailure(error: unknown): void {
    this.state.set(
      error instanceof InviteLinkUnavailableError
        ? { status: 'unavailable', message: error.message }
        : { status: 'error' },
    );
  }
}
