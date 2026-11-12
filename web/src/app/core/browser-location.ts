import { InjectionToken } from '@angular/core';

/** Navegación fuera de la app (redirección a Google). Inyectable para poder probarla. */
export interface BrowserLocation {
  assign(url: string): void;
}

export const BROWSER_LOCATION = new InjectionToken<BrowserLocation>('BROWSER_LOCATION', {
  providedIn: 'root',
  factory: () => ({ assign: (url: string) => window.location.assign(url) }),
});
