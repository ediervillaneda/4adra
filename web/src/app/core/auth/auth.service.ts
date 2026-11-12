import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BROWSER_LOCATION } from '../browser-location';

export interface SessionUser {
  name: string;
  email: string;
  image: string | null;
}

export type SessionState =
  { status: 'loading' } | { status: 'anonymous' } | { status: 'authenticated'; user: SessionUser };

interface BetterAuthSession {
  user?: { name?: string | null; email: string; image?: string | null };
}

/** Sesión con Better Auth (mismo origen, cookie HttpOnly). El cliente nunca ve tokens. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly location = inject(BROWSER_LOCATION);
  private readonly state = signal<SessionState>({ status: 'loading' });

  readonly session = this.state.asReadonly();

  async refreshSession(): Promise<void> {
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
    } catch {
      this.markAnonymous();
    }
  }

  markAnonymous(): void {
    this.state.set({ status: 'anonymous' });
  }

  async signInWithGoogle(): Promise<void> {
    const { url } = await firstValueFrom(
      this.http.post<{ url: string }>('/api/auth/sign-in/social', {
        provider: 'google',
        callbackURL: '/',
        errorCallbackURL: '/entrar',
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
