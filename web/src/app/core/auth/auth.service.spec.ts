import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { BROWSER_LOCATION } from '../browser-location';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  const assign = vi.fn<(url: string) => void>();

  beforeEach(() => {
    assign.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: BROWSER_LOCATION, useValue: { assign } },
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  it('shouldStartLoading', () => {
    expect(service.session()).toEqual({ status: 'loading' });
  });

  it('shouldPostGoogleSignInWithCallbacksAndRedirectToReturnedUrl', async () => {
    const pending = service.signInWithGoogle();

    const request = http.expectOne('/api/auth/sign-in/social');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      provider: 'google',
      callbackURL: '/',
      errorCallbackURL: '/entrar',
    });
    request.flush({ url: 'https://accounts.google.com/x', redirect: true });
    await pending;

    expect(assign).toHaveBeenCalledWith('https://accounts.google.com/x');
  });

  it.each([
    ['/unirse/codigo-1', '/unirse/codigo-1'],
    ['https://evil.example.com/x', '/'],
    ['//evil.example.com/x', '/'],
    ['/\\evil.example.com/x', '/'],
    ['/\t/evil.example.com/x', '/'],
    ['/\n/evil.example.com/x', '/'],
    [null, '/'],
  ])('shouldUseReturnPathAsGoogleCallbackOnlyWhenInternal (%s)', async (returnPath, expected) => {
    const pending = service.signInWithGoogle(returnPath);

    const request = http.expectOne('/api/auth/sign-in/social');
    expect((request.request.body as { callbackURL: string }).callbackURL).toBe(expected);
    request.flush({ url: 'https://accounts.google.com/x', redirect: true });
    await pending;
  });

  it.each([
    ['/unirse/codigo-1', '/entrar?volver=%2Funirse%2Fcodigo-1'],
    ['//evil.example.com/x', '/entrar'],
    [null, '/entrar'],
  ])('shouldKeepReturnPathInErrorCallback (%s)', async (returnPath, expected) => {
    const pending = service.signInWithGoogle(returnPath);

    const request = http.expectOne('/api/auth/sign-in/social');
    expect((request.request.body as { errorCallbackURL: string }).errorCallbackURL).toBe(expected);
    request.flush({ url: 'https://accounts.google.com/x', redirect: true });
    await pending;
  });

  it('shouldBeAnonymousWhenGetSessionReturnsNull', async () => {
    const pending = service.refreshSession();
    http.expectOne('/api/auth/get-session').flush(null);
    await pending;

    expect(service.session()).toEqual({ status: 'anonymous' });
  });

  it('shouldBeAuthenticatedWithUserWhenSessionExists', async () => {
    const pending = service.refreshSession();
    http.expectOne('/api/auth/get-session').flush({
      session: { id: 's1' },
      user: { name: 'Ana', email: 'ana@example.com' },
    });
    await pending;

    expect(service.session()).toEqual({
      status: 'authenticated',
      user: { name: 'Ana', email: 'ana@example.com', image: null },
    });
  });

  it('shouldBeUnavailableWhenGetSessionFailsWith5xx', async () => {
    const pending = service.refreshSession();
    http.expectOne('/api/auth/get-session').flush(null, { status: 503, statusText: 'Error' });
    await pending;

    expect(service.session()).toEqual({ status: 'unavailable' });
  });

  it('shouldBeUnavailableWhenOffline', async () => {
    const pending = service.refreshSession();
    http.expectOne('/api/auth/get-session').error(new ProgressEvent('error'), { status: 0 });
    await pending;

    expect(service.session()).toEqual({ status: 'unavailable' });
  });

  it('shouldBeAnonymousWhenGetSessionFailsWith4xx', async () => {
    const pending = service.refreshSession();
    http.expectOne('/api/auth/get-session').flush(null, { status: 403, statusText: 'x' });
    await pending;

    expect(service.session()).toEqual({ status: 'anonymous' });
  });

  it('shouldShareInFlightSessionRequest', async () => {
    const first = service.refreshSession();
    const second = service.refreshSession();
    http.expectOne('/api/auth/get-session').flush(null);
    await Promise.all([first, second]);

    expect(service.session()).toEqual({ status: 'anonymous' });
  });

  it('shouldPostSignOutAndNavigateToEntrar', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const pending = service.signOut();

    const request = http.expectOne('/api/auth/sign-out');
    expect(request.request.method).toBe('POST');
    request.flush({ success: true });
    await pending;

    expect(service.session()).toEqual({ status: 'anonymous' });
    expect(navigate).toHaveBeenCalledWith('/entrar');
  });
});
