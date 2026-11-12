import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authErrorInterceptor } from './auth-error.interceptor';
import { ApiErrorNotifier } from './api-error-notifier';
import { AuthService } from '../auth/auth.service';

describe('authErrorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  async function failWith(url: string, status: number, body: object): Promise<void> {
    const pending = firstValueFrom(http.get(url)).catch(() => undefined);
    controller.expectOne(url).flush(body, { status, statusText: 'x' });
    await pending;
  }

  it('interceptorShouldNavigateToEntrarOn401FromApiV1', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    await failWith('/api/v1/me', 401, { error: { code: 'UNAUTHENTICATED', message: 'x' } });

    expect(navigate).toHaveBeenCalledWith('/entrar');
    expect(TestBed.inject(AuthService).session()).toEqual({ status: 'anonymous' });
  });

  it('interceptorShouldPublishMessageWithRequestIdOn500', async () => {
    await failWith('/api/v1/me', 500, {
      error: { code: 'INTERNAL_ERROR', message: 'x' },
      meta: { requestId: 'req_9' },
    });

    expect(TestBed.inject(ApiErrorNotifier).message()).toContain('req_9');
  });

  it('interceptorShouldPublishDisabledMessageOn403UserDisabled', async () => {
    await failWith('/api/v1/me', 403, { error: { code: 'USER_DISABLED', message: 'x' } });

    expect(TestBed.inject(ApiErrorNotifier).message()).toContain('deshabilitada');
  });

  it('interceptorShouldPublishGenericMessageOnNetworkError', async () => {
    const pending = firstValueFrom(http.get('/api/v1/me')).catch(() => undefined);
    controller.expectOne('/api/v1/me').error(new ProgressEvent('error'), { status: 0 });
    await pending;

    expect(TestBed.inject(ApiErrorNotifier).message()).toBe('Algo salió mal.');
  });

  it('interceptorShouldNotDuplicateOfflineBannerWhenBrowserIsOffline', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const pending = firstValueFrom(http.get('/api/auth/get-session')).catch(() => undefined);
    controller.expectOne('/api/auth/get-session').error(new ProgressEvent('error'), { status: 0 });
    await pending;
    onLine.mockRestore();

    expect(TestBed.inject(ApiErrorNotifier).message()).toBeNull();
  });

  it('interceptorShouldLeaveValidationErrorsToTheCaller', async () => {
    await failWith('/api/v1/me', 400, { error: { code: 'VALIDATION_ERROR', message: 'x' } });

    expect(TestBed.inject(ApiErrorNotifier).message()).toBeNull();
  });

  it('notifierShouldClearMessageOnDismiss', () => {
    const notifier = TestBed.inject(ApiErrorNotifier);
    notifier.show('x');
    notifier.dismiss();

    expect(notifier.message()).toBeNull();
  });
});
