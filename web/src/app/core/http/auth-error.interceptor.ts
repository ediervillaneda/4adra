import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ApiErrorNotifier } from './api-error-notifier';
import { TEXTS } from '../../shared/texts';
import { ApiErrorEnvelope } from '../../shared/api';

/**
 * Errores transversales de la API:
 * - 401 en /api/v1 → la sesión venció: se marca anónima y se va a /entrar.
 * - 403 USER_DISABLED → aviso de cuenta deshabilitada.
 * - 5xx o sin red → mensaje genérico con el código de referencia si viene.
 * Los 400 de validación los maneja cada pantalla.
 */
export const authErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notifier = inject(ApiErrorNotifier);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const body = error.error as Partial<ApiErrorEnvelope> | null;
        if (error.status === 401 && request.url.startsWith('/api/v1/')) {
          auth.markAnonymous();
          void router.navigateByUrl('/entrar');
        } else if (error.status === 403 && body?.error?.code === 'USER_DISABLED') {
          notifier.show(TEXTS.errors.userDisabled);
        } else if (error.status === 0 || error.status >= 500) {
          const requestId = body?.meta?.requestId;
          notifier.show(requestId ? TEXTS.errors.withReference(requestId) : TEXTS.errors.generic);
        }
      }
      return throwError(() => error);
    }),
  );
};
