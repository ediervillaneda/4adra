import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  convertToParamMap,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { guestGuard, sessionGuard } from './session.guards';

const route = { queryParamMap: convertToParamMap({}) } as ActivatedRouteSnapshot;
const state = {} as RouterStateSnapshot;
const ANA = { user: { name: 'Ana', email: 'ana@example.com', image: null } };

async function runGuard(guard: CanActivateFn, sessionResponse: object | null): Promise<unknown> {
  const result = TestBed.runInInjectionContext(() => guard(route, state)) as Promise<unknown>;
  TestBed.inject(HttpTestingController).expectOne('/api/auth/get-session').flush(sessionResponse);
  return result;
}

function urlOf(result: unknown): string {
  return TestBed.inject(Router).serializeUrl(result as UrlTree);
}

describe('session guards', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  it('sessionGuardShouldRedirectAnonymousToEntrar', async () => {
    expect(urlOf(await runGuard(sessionGuard, null))).toBe('/entrar');
  });

  it('sessionGuardShouldRememberRequestedUrlInVolver', async () => {
    const result = TestBed.runInInjectionContext(() =>
      sessionGuard(route, { url: '/unirse/codigo-1' } as RouterStateSnapshot),
    ) as Promise<unknown>;
    TestBed.inject(HttpTestingController).expectOne('/api/auth/get-session').flush(null);

    expect(urlOf(await result)).toBe('/entrar?volver=%2Funirse%2Fcodigo-1');
  });

  it('sessionGuardShouldAllowAuthenticated', async () => {
    expect(await runGuard(sessionGuard, ANA)).toBe(true);
  });

  it('guestGuardShouldRedirectAuthenticatedToHome', async () => {
    expect(urlOf(await runGuard(guestGuard, ANA))).toBe('/');
  });

  it.each([
    ['/unirse/codigo-1', '/unirse/codigo-1'],
    ['//evil.example.com/x', '/'],
  ])('guestGuardShouldSendAuthenticatedToVolverWhenInternal (%s)', async (volver, expected) => {
    const withVolver = { queryParamMap: convertToParamMap({ volver }) } as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() =>
      guestGuard(withVolver, state),
    ) as Promise<unknown>;
    TestBed.inject(HttpTestingController).expectOne('/api/auth/get-session').flush(ANA);

    expect(urlOf(await result)).toBe(expected);
  });

  it('sessionGuardShouldLetUserInWhenSessionIsUnavailable', async () => {
    const result = TestBed.runInInjectionContext(() =>
      sessionGuard(route, state),
    ) as Promise<unknown>;
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/get-session')
      .error(new ProgressEvent('error'), { status: 0 });

    expect(await result).toBe(true);
  });

  it('guestGuardShouldAllowAnonymous', async () => {
    expect(await runGuard(guestGuard, null)).toBe(true);
  });
});
