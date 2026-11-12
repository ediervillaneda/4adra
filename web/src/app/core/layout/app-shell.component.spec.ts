import { describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { provideRouter, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AppShellComponent } from './app-shell.component';
import { AuthService, SessionState } from '../auth/auth.service';
import { ApiErrorNotifier } from '../http/api-error-notifier';
import { OnlineStatus } from '../network/online-status';
import { CurrentProfileStore } from '../profile/current-profile.store';
import { ANA_PROFILE } from '../profile/profile.fixtures';
import { vi } from 'vitest';

const refreshSession = vi.fn().mockResolvedValue(undefined);

async function render(
  wide: boolean,
  url = '/',
  status: SessionState = {
    status: 'authenticated',
    user: { name: 'Ana', email: 'ana@example.com', image: null },
  },
): Promise<HTMLElement> {
  const session = signal<SessionState>(status);
  TestBed.configureTestingModule({
    imports: [AppShellComponent],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      { provide: AuthService, useValue: { session, refreshSession } },
      {
        provide: CurrentProfileStore,
        useValue: {
          profile: signal({ ...ANA_PROFILE, photoUrl: 'https://example.com/ana.png' }),
          load: () => Promise.resolve(),
          clear: () => undefined,
        },
      },
      {
        provide: BreakpointObserver,
        useValue: {
          observe: (): Observable<BreakpointState> => of({ matches: wide, breakpoints: {} }),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(AppShellComponent);
  await TestBed.inject(Router).navigateByUrl(url);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('AppShellComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('shellShouldShowBottomNavBelow840', async () => {
    const element = await render(false);

    expect(element.querySelector('[data-testid="bottom-nav"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="nav-rail"]')).toBeNull();
  });

  it('shellShouldShowSplashWhileSessionIsLoading', async () => {
    const element = await render(false, '/', { status: 'loading' });

    expect(element.querySelector('[data-testid="splash"]')?.textContent).toContain('Cargando');
  });

  it('shellShouldUseAppProfilePhotoForAvatar', async () => {
    const element = await render(false);

    expect(element.querySelector<HTMLImageElement>('img.avatar')?.src).toBe(
      'https://example.com/ana.png',
    );
  });

  it('shellShouldRefreshSessionWhenConnectionReturnsWhileUnavailable', async () => {
    refreshSession.mockClear();
    await render(false, '/', { status: 'unavailable' });

    window.dispatchEvent(new Event('online'));
    TestBed.tick();

    expect(refreshSession).toHaveBeenCalled();
  });

  it('shellShouldShowRailFrom840', async () => {
    const element = await render(true);

    expect(element.querySelector('[data-testid="nav-rail"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="bottom-nav"]')).toBeNull();
  });

  it('shellShouldHideNavigationOnLoginButKeepPrivacyLink', async () => {
    const element = await render(false, '/entrar');

    expect(element.querySelector('[data-testid="bottom-nav"]')).toBeNull();
    expect(element.querySelector('a[href="/privacidad"]')).not.toBeNull();
  });

  it('shellShouldAlwaysShowPrivacyLink', async () => {
    expect((await render(true)).querySelector('a[href="/privacidad"]')).not.toBeNull();
  });

  it('shellShouldShowApiErrorBannerAndDismissIt', async () => {
    const element = await render(false);
    TestBed.inject(ApiErrorNotifier).show('Algo salió mal. Código de referencia: req_9.');
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    const banner = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="api-error"]',
    );

    expect(banner?.textContent).toContain('req_9');
    banner?.querySelector('button')?.click();
    fixture.detectChanges();
    expect(TestBed.inject(ApiErrorNotifier).message()).toBeNull();
    expect(element).toBeTruthy();
  });

  it('shellShouldShowOfflineBannerWhenOffline', async () => {
    await render(false);
    TestBed.inject(OnlineStatus);
    window.dispatchEvent(new Event('offline'));
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Sin conexión. Algunas acciones no están disponibles.',
    );
    window.dispatchEvent(new Event('online'));
  });
});
