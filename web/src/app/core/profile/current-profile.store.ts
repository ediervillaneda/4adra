import { Injectable, inject, signal } from '@angular/core';
import { ProfileService } from './profile.service';
import { UserProfile } from '../../shared/api';

/**
 * Perfil de la app (`GET /api/v1/me`): nombre y foto que muestran Inicio y la barra superior.
 * Es distinto de la identidad de Google en la sesión, porque el usuario puede editar su nombre.
 */
@Injectable({ providedIn: 'root' })
export class CurrentProfileStore {
  private readonly profiles = inject(ProfileService);
  private readonly current = signal<UserProfile | null>(null);
  private pending: Promise<void> | null = null;

  readonly profile = this.current.asReadonly();

  /** Carga una vez; si falla, el siguiente llamado reintenta. */
  load(): Promise<void> {
    if (this.current() !== null) {
      return Promise.resolve();
    }
    this.pending ??= this.profiles
      .getProfile()
      .then((profile) => this.current.set(profile))
      .catch(() => undefined)
      .finally(() => {
        this.pending = null;
      });
    return this.pending;
  }

  set(profile: UserProfile): void {
    this.current.set(profile);
  }

  clear(): void {
    this.current.set(null);
  }
}
