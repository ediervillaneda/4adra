import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, PendingTasks, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { BROWSER_NAVIGATOR } from '../../../core/browser-navigator';
import { InviteLinksService } from '../../../core/invite-links/invite-links.service';
import { TEXTS } from '../../../shared/texts';

export interface ShareInviteLinkDialogData {
  groupId: string;
  groupName: string;
}

/**
 * Crea y comparte el enlace de invitación (historia #5 de la pieza 2). Solo lo crea al pulsar
 * "Crear enlace": el código no se puede volver a mostrar y uno nuevo reemplaza al anterior.
 */
@Component({
  selector: 'app-share-invite-link-dialog',
  imports: [MatButtonModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ texts.dialogTitle }}</h2>
    <mat-dialog-content>
      <p>{{ texts.explanation }}</p>
      @if (errorMessage(); as errorMessage) {
        <p class="error" role="alert">{{ errorMessage }}</p>
      }
      @if (url(); as url) {
        <p class="url" data-testid="link-url">{{ url }}</p>
        @if (copied()) {
          <p role="status">{{ texts.copied }}</p>
        }
      } @else {
        <p>{{ texts.replaceWarning }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>{{ texts.close }}</button>
      @if (url(); as url) {
        @if (canShare) {
          <button mat-stroked-button type="button" data-testid="share-link" (click)="share(url)">
            {{ texts.share }}
          </button>
        }
        <button mat-flat-button type="button" data-testid="copy-link" (click)="copy(url)">
          {{ texts.copy }}
        </button>
      } @else {
        <button
          mat-flat-button
          type="button"
          data-testid="create-link"
          [disabled]="creating()"
          (click)="create()"
        >
          {{ texts.create }}
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: `
    .error {
      color: var(--mat-sys-error);
    }
    .url {
      word-break: break-all;
      font: var(--mat-sys-body-large);
    }
  `,
})
export class ShareInviteLinkDialogComponent {
  private readonly data = inject<ShareInviteLinkDialogData>(MAT_DIALOG_DATA);
  private readonly inviteLinks = inject(InviteLinksService);
  private readonly browser = inject(BROWSER_NAVIGATOR);
  private readonly origin = inject(DOCUMENT).location.origin;
  private readonly pendingTasks = inject(PendingTasks);
  protected readonly texts = TEXTS.inviteLinks;
  protected readonly canShare = this.browser.share !== undefined;
  protected readonly url = signal<string | null>(null);
  protected readonly creating = signal(false);
  protected readonly copied = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected create(): void {
    this.creating.set(true);
    this.errorMessage.set(null);
    void this.pendingTasks.run(async () => {
      try {
        const link = await this.inviteLinks.createLink(this.data.groupId);
        this.url.set(`${this.origin}/unirse/${link.code}`);
      } catch {
        // El código de referencia lo muestra el banner global (authErrorInterceptor).
        this.errorMessage.set(TEXTS.errors.generic);
      } finally {
        this.creating.set(false);
      }
    });
  }

  protected copy(url: string): void {
    this.errorMessage.set(null);
    void this.pendingTasks.run(async () => {
      try {
        await this.browser.clipboard.writeText(url);
        this.copied.set(true);
      } catch {
        this.copied.set(false);
        this.errorMessage.set(this.texts.copyFailed);
      }
    });
  }

  protected share(url: string): void {
    void this.pendingTasks.run(async () => {
      try {
        await this.browser.share?.({ text: this.texts.shareText(this.data.groupName), url });
      } catch (error) {
        // Cerrar la hoja de compartir no es un error.
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          this.errorMessage.set(TEXTS.errors.generic);
        }
      }
    });
  }
}
