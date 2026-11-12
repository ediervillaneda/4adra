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

async function render(wide: boolean, url = '/'): Promise<HTMLElement> {
  const session = signal<SessionState>({
    status: 'authenticated',
    user: { name: 'Ana', email: 'ana@example.com', image: null },
  });
  TestBed.configureTestingModule({
    imports: [AppShellComponent],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      { provide: AuthService, useValue: { session } },
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
