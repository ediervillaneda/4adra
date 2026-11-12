import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** Estado de conexión del navegador, para avisar cuando la app está sin red. */
@Injectable({ providedIn: 'root' })
export class OnlineStatus {
  private readonly online = signal(navigator.onLine);

  readonly isOnline = this.online.asReadonly();

  constructor() {
    const update = (): void => this.online.set(navigator.onLine);
    const goOnline = (): void => this.online.set(true);
    const goOffline = (): void => this.online.set(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener('focus', update);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('focus', update);
    });
  }
}
