import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, SessionState } from './auth.service';

async function resolvedStatus(auth: AuthService): Promise<SessionState['status']> {
  if (auth.session().status === 'loading') {
    await auth.refreshSession();
  }
  return auth.session().status;
}

/** Rutas privadas: sin sesión, a /entrar. */
export const sessionGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (await resolvedStatus(auth)) === 'authenticated'
    ? true
    : router.createUrlTree(['/entrar']);
};

/** Login: con sesión, a Inicio. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (await resolvedStatus(auth)) === 'authenticated' ? router.createUrlTree(['/']) : true;
};
