import { ChangeDetectionStrategy, Component, PendingTasks, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TEXTS } from './texts';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel: string;
  /**
   * La operación que se confirma. El diálogo la ejecuta y se cierra con `true` si sale bien; si
   * falla, muestra el mensaje del error (ya en español) y sigue abierto.
   */
  confirm: () => Promise<void>;
}

/** Confirmación genérica "¿Seguro…?" con Cancelar y una acción (remover, salir, archivar…). */
@Component({
  selector: 'app-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
      @if (errorMessage(); as errorMessage) {
        <p class="error" role="alert">{{ errorMessage }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <!-- Sin valor, mat-dialog-close cerraría con '' en vez de "sin resultado". -->
      <button
        mat-button
        type="button"
        data-testid="cancel"
        [disabled]="running()"
        [mat-dialog-close]="undefined"
      >
        {{ texts.cancel }}
      </button>
      <button
        mat-flat-button
        type="button"
        data-testid="confirm"
        [disabled]="running()"
        (click)="run()"
      >
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .error {
      color: var(--mat-sys-error);
    }
  `,
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ConfirmDialogComponent, true>>(MatDialogRef);
  private readonly pendingTasks = inject(PendingTasks);
  protected readonly texts = TEXTS.common;
  protected readonly running = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected run(): void {
    this.running.set(true);
    this.errorMessage.set(null);
    // Cerrar a mitad de camino dejaría la pantalla sin enterarse de lo que pasó en el servidor.
    this.dialogRef.disableClose = true;
    void this.pendingTasks.run(async () => {
      try {
        await this.data.confirm();
        this.dialogRef.close(true);
      } catch (error) {
        // Otros errores: el código de referencia lo muestra el banner global (authErrorInterceptor).
        this.errorMessage.set(error instanceof Error ? error.message : TEXTS.errors.generic);
      } finally {
        this.running.set(false);
        this.dialogRef.disableClose = false;
      }
    });
  }
}
