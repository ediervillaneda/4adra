import { InjectionToken } from '@angular/core';

/** Portapapeles y hoja nativa de compartir del navegador. Inyectable para poder probarlos. */
export interface BrowserNavigator {
  clipboard: { writeText(text: string): Promise<void> };
  /** Solo existe donde el navegador lo permite (sobre todo en el celular). */
  share?: (data: ShareData) => Promise<void>;
}

export const BROWSER_NAVIGATOR = new InjectionToken<BrowserNavigator>('BROWSER_NAVIGATOR', {
  providedIn: 'root',
  factory: () => navigator,
});
