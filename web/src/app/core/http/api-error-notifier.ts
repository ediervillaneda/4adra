import { Injectable, signal } from '@angular/core';

/** Mensaje global de error de la API, que muestra el shell como banner. */
@Injectable({ providedIn: 'root' })
export class ApiErrorNotifier {
  private readonly current = signal<string | null>(null);

  readonly message = this.current.asReadonly();

  show(message: string): void {
    this.current.set(message);
  }

  dismiss(): void {
    this.current.set(null);
  }
}
