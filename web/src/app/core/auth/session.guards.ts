import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, SessionState } from './auth.service';

async function resolvedStatus(auth: AuthService): Promise<SessionState['status']> {
  if (auth.session().status === 'loading') {
    await auth.refreshSession();
  }
  return auth.session().status;
}

/**
 * Rutas privadas: sin sesión, a /entrar. Si la sesión no se pudo consultar (sin red), se deja pasar:
 * la app instalada abre desde la caché y reintenta al volver la conexión.
 */
export const sessionGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (await resolvedStatus(auth)) === 'anonymous' ? router.createUrlTree(['/entrar']) : true;
};

/** Login: con sesión, a Inicio. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (await resolvedStatus(auth)) === 'authenticated' ? router.createUrlTree(['/']) : true;
};
