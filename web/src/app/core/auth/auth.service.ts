import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BROWSER_LOCATION } from '../browser-location';
import { toInternalPath } from './internal-path';

export interface SessionUser {
  name: string;
  email: string;
  image: string | null;
}

export type SessionState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  /** No se pudo consultar la sesión (sin red o servidor caído): no se asume que no hay sesión. */
  | { status: 'unavailable' }
  | { status: 'authenticated'; user: SessionUser };

interface BetterAuthSession {
  user?: { name?: string | null; email: string; image?: string | null };
}

/** Sesión con Better Auth (mismo origen, cookie HttpOnly). El cliente nunca ve tokens. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly origin = inject(DOCUMENT).location.origin;
  private readonly location = inject(BROWSER_LOCATION);
  private readonly state = signal<SessionState>({ status: 'loading' });

  readonly session = this.state.asReadonly();

  private pendingRefresh: Promise<void> | null = null;

  /** Consulta la sesión; si ya hay una consulta en curso, la comparte. */
  refreshSession(): Promise<void> {
    this.pendingRefresh ??= this.fetchSession().finally(() => {
      this.pendingRefresh = null;
    });
    return this.pendingRefresh;
  }

  private async fetchSession(): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.http.get<BetterAuthSession | null>('/api/auth/get-session'),
      );
      this.state.set(
        result?.user
          ? {
              status: 'authenticated',
              user: {
                name: result.user.name ?? result.user.email,
                email: result.user.email,
                image: result.user.image ?? null,
              },
            }
          : { status: 'anonymous' },
      );
    } catch (error) {
      const unreachable =
        error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500);
      this.state.set(unreachable ? { status: 'unavailable' } : { status: 'anonymous' });
    }
  }

  markAnonymous(): void {
    this.state.set({ status: 'anonymous' });
  }

  /** `returnPath`: a dónde volver después de Google (por ejemplo, un enlace de invitación). */
  async signInWithGoogle(returnPath: string | null = null): Promise<void> {
    const internal = toInternalPath(returnPath, this.origin);
    const { url } = await firstValueFrom(
      this.http.post<{ url: string }>('/api/auth/sign-in/social', {
        provider: 'google',
        callbackURL: internal ?? '/',
        // Si Google falla o se cancela, el reintento desde /entrar vuelve al mismo lugar.
        errorCallbackURL:
          internal === null ? '/entrar' : `/entrar?volver=${encodeURIComponent(internal)}`,
      }),
    );
    this.location.assign(url);
  }

  async signOut(): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/sign-out', {}));
    this.markAnonymous();
    await this.router.navigateByUrl('/entrar');
  }
}
