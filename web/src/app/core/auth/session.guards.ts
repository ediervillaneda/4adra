import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, SessionState } from './auth.service';
import { toInternalPath } from './internal-path';

async function resolvedStatus(auth: AuthService): Promise<SessionState['status']> {
  if (auth.session().status === 'loading') {
    await auth.refreshSession();
  }
  return auth.session().status;
}

/**
 * Rutas privadas: sin sesión, a /entrar?volver=<ruta pedida>. Si la sesión no se pudo consultar (sin red), se deja pasar:
 * la app instalada abre desde la caché y reintenta al volver la conexión.
 */
export const sessionGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if ((await resolvedStatus(auth)) !== 'anonymous') {
    return true;
  }
  // Recuerda a dónde iba (por ejemplo, un enlace de invitación) para volver después de Google.
  const volver = state.url && state.url !== '/' ? { volver: state.url } : undefined;
  return router.createUrlTree(['/entrar'], { queryParams: volver });
};

/** Login: con sesión, a la ruta de `?volver=` si es de esta app; si no, a Inicio. */
export const guestGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const origin = inject(DOCUMENT).location.origin;
  if ((await resolvedStatus(auth)) !== 'authenticated') {
    return true;
  }
  return router.parseUrl(toInternalPath(route.queryParamMap.get('volver'), origin) ?? '/');
};
